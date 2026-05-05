// Pull Tel Aviv news from NewsAPI.org and store as drafts.
import { adminClient, corsHeaders, ok, err, slugify } from "../_shared/utils.ts";

const TLV_KEYWORDS = ["tel aviv", "tel-aviv", "telaviv", "jaffa", "yafo", "florentin", "neve tzedek", "rothschild"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const KEY = Deno.env.get("NEWS_API_KEY");
    if (!KEY) return err("NEWS_API_KEY not configured", 500);

    const { query = '"Tel Aviv"', language = "en", page_size = 30, source_id } = await req.json().catch(() => ({}));
    const sb = adminClient();

    const { data: run } = await sb.from("automation_runs").insert({
      job: `newsapi:${query}`, source_id: source_id ?? null, status: "running",
    }).select().single();

    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", query);
    url.searchParams.set("language", language);
    url.searchParams.set("pageSize", String(Math.min(100, Number(page_size) || 30)));
    url.searchParams.set("sortBy", "publishedAt");

    const r = await fetch(url.toString(), { headers: { "X-Api-Key": KEY } });
    if (!r.ok) {
      const t = await r.text();
      await sb.from("automation_runs").update({ status: "error", error: `NewsAPI ${r.status}: ${t.slice(0,200)}`, finished_at: new Date().toISOString() }).eq("id", run!.id);
      return err(`NewsAPI failed ${r.status}`, 502);
    }
    const j = await r.json();
    const articles: Array<Record<string, unknown>> = j.articles ?? [];

    let out = 0;
    for (const a of articles) {
      const title = (a.title as string) || "";
      const link = (a.url as string) || "";
      const desc = (a.description as string) || "";
      if (!title || !link) continue;
      const haystack = (title + " " + desc).toLowerCase();
      if (!TLV_KEYWORDS.some(k => haystack.includes(k))) continue;

      const externalId = link;
      const { data: raw } = await sb.from("raw_imports").upsert({
        source_id: source_id ?? null, external_id: externalId, payload: a, url: link,
      }, { onConflict: "source_id,external_id", ignoreDuplicates: true }).select().maybeSingle();
      if (!raw) continue;

      const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 7);
      const { error: insErr } = await sb.from("content_items").insert({
        slug,
        type: "news" as never,
        status: "draft",
        title: title.slice(0, 240),
        summary: desc.slice(0, 280) || null,
        body: (a.content as string) || desc || null,
        source_url: link,
        source_name: ((a.source as { name?: string } | null)?.name) || "NewsAPI",
        hero_image_url: (a.urlToImage as string) || null,
        raw_import_id: raw.id,
        published_at: a.publishedAt ? new Date(a.publishedAt as string).toISOString() : null,
      });
      if (!insErr) out++;
    }

    await sb.from("automation_runs").update({
      status: "ok", finished_at: new Date().toISOString(),
      items_in: articles.length, items_out: out,
    }).eq("id", run!.id);

    return ok({ items_in: articles.length, items_out: out });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
