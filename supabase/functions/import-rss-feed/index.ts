// Pulls an RSS feed for a source and creates draft content_items.
import { adminClient, corsHeaders, ok, err, slugify } from "../_shared/utils.ts";

const TLV_KEYWORDS = ["tel aviv", "tel-aviv", "telaviv", "תל אביב", "jaffa", "yafo", "florentin", "neve tzedek", "rothschild"];

const parseRss = (xml: string) => {
  const items: Array<Record<string, string>> = [];
  const itemRe = /<item[\s\S]*?<\/item>/g;
  for (const m of xml.matchAll(itemRe)) {
    const block = m[0];
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
      if (!r) return "";
      return r[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
    };
    const enc = /<enclosure[^>]+url=["']([^"']+)["']/i.exec(block);
    const media = /<media:content[^>]+url=["']([^"']+)["']/i.exec(block);
    items.push({
      title: get("title"),
      link: get("link"),
      description: get("description"),
      pubDate: get("pubDate"),
      guid: get("guid"),
      image: enc?.[1] || media?.[1] || "",
    });
  }
  return items;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { source_id } = await req.json();
    if (!source_id) return err("source_id required");
    const sb = adminClient();

    const { data: source, error: sErr } = await sb.from("sources").select("*").eq("id", source_id).single();
    if (sErr || !source) return err("Source not found", 404);
    if (!source.url) return err("Source has no URL");

    const { data: run } = await sb.from("automation_runs").insert({
      job: `rss:${source.name}`, source_id, status: "running",
    }).select().single();

    const res = await fetch(source.url, { headers: { "user-agent": "TLVRadar/1.0" } });
    if (!res.ok) {
      await sb.from("automation_runs").update({ status: "error", error: `HTTP ${res.status}`, finished_at: new Date().toISOString() }).eq("id", run!.id);
      return err(`Feed returned ${res.status}`, 502);
    }
    const xml = await res.text();
    const items = parseRss(xml);

    let created = 0;
    for (const it of items.slice(0, 30)) {
      if (!it.title || !it.link) continue;
      const haystack = (it.title + " " + it.description).toLowerCase();
      const isTLV = TLV_KEYWORDS.some(k => haystack.includes(k));
      // only auto-import TLV-mentioning items, but always store raw
      const externalId = it.guid || it.link;
      const { data: raw } = await sb.from("raw_imports").upsert({
        source_id, external_id: externalId, payload: it, url: it.link,
      }, { onConflict: "source_id,external_id", ignoreDuplicates: true }).select().maybeSingle();
      if (!raw || !isTLV) continue;

      const slug = slugify(it.title) + "-" + Math.random().toString(36).slice(2, 7);
      await sb.from("content_items").insert({
        slug,
        type: source.category ?? "news",
        status: "draft",
        title: it.title.slice(0, 240),
        summary: it.description?.slice(0, 280) ?? null,
        body: it.description ?? null,
        source_url: it.link,
        source_name: source.name,
        hero_image_url: it.image || null,
        raw_import_id: raw.id,
        published_at: it.pubDate ? new Date(it.pubDate).toISOString() : null,
      });
      created++;
    }

    await sb.from("sources").update({ last_run_at: new Date().toISOString() }).eq("id", source_id);
    await sb.from("automation_runs").update({
      status: "ok", finished_at: new Date().toISOString(),
      items_in: items.length, items_out: created,
    }).eq("id", run!.id);

    return ok({ items_in: items.length, items_out: created });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
