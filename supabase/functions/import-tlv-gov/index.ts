// Pull from Tel Aviv / Israel open data (CKAN datastore_search on data.gov.il).
import { adminClient, corsHeaders, ok, err, slugify } from "../_shared/utils.ts";

interface FieldMap {
  title?: string;
  summary?: string;
  body?: string;
  url?: string;
  starts_at?: string;
  ends_at?: string;
  venue?: string;
  address?: string;
  neighborhood?: string;
}

const TLV_KEYWORDS = ["תל אביב", "תל-אביב", "יפו", "tel aviv", "tel-aviv", "jaffa", "yafo"];

const pick = (row: Record<string, unknown>, key?: string): string | null => {
  if (!key) return null;
  const v = row[key];
  return v == null ? null : String(v);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = adminClient();
    const {
      resource_id,
      source_id,
      type = "event",
      limit = 100,
      filter_tlv = true,
      field_map = {},
    }: {
      resource_id: string;
      source_id?: string;
      type?: string;
      limit?: number;
      filter_tlv?: boolean;
      field_map?: FieldMap;
    } = await req.json();

    if (!resource_id) return err("resource_id required");

    const { data: run } = await sb.from("automation_runs").insert({
      job: `tlv-gov:${resource_id.slice(0, 12)}`, source_id: source_id ?? null, status: "running",
    }).select().single();

    const url = new URL("https://data.gov.il/api/3/action/datastore_search");
    url.searchParams.set("resource_id", resource_id);
    url.searchParams.set("limit", String(Math.min(500, Number(limit) || 100)));

    const r = await fetch(url.toString());
    if (!r.ok) {
      await sb.from("automation_runs").update({ status: "error", error: `CKAN ${r.status}`, finished_at: new Date().toISOString() }).eq("id", run!.id);
      return err(`CKAN fetch failed ${r.status}`, 502);
    }
    const j = await r.json();
    const records: Record<string, unknown>[] = j?.result?.records ?? [];

    let out = 0;
    for (const row of records) {
      const title = pick(row, field_map.title);
      if (!title) continue;

      // TLV filter (Hebrew + English) across all string values
      if (filter_tlv) {
        const haystack = Object.values(row).filter(v => typeof v === "string").join(" ").toLowerCase();
        if (!TLV_KEYWORDS.some(k => haystack.includes(k))) continue;
      }

      const externalId = String(row._id ?? row.id ?? slugify(title));
      const { data: raw } = await sb.from("raw_imports").upsert({
        source_id: source_id ?? null, external_id: `gov:${resource_id}:${externalId}`, payload: row,
      }, { onConflict: "source_id,external_id", ignoreDuplicates: true }).select().maybeSingle();
      if (!raw) continue;

      const startsAt = pick(row, field_map.starts_at);
      const endsAt = pick(row, field_map.ends_at);
      const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 7);

      const { error: insErr } = await sb.from("content_items").insert({
        slug,
        type: type as never,
        status: "draft",
        title: title.slice(0, 240),
        summary: pick(row, field_map.summary)?.slice(0, 280) ?? null,
        body: pick(row, field_map.body),
        source_url: pick(row, field_map.url),
        source_name: "Tel Aviv Open Data",
        venue: pick(row, field_map.venue),
        address: pick(row, field_map.address),
        neighborhood: pick(row, field_map.neighborhood),
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        raw_import_id: raw.id,
      });
      if (!insErr) out++;
    }

    await sb.from("automation_runs").update({
      status: "ok", finished_at: new Date().toISOString(),
      items_in: records.length, items_out: out,
    }).eq("id", run!.id);

    return ok({ items_in: records.length, items_out: out });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
