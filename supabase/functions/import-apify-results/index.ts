// Imports an array of items pasted from an Apify run.
import { adminClient, corsHeaders, ok, err, slugify } from "../_shared/utils.ts";

interface ApifyItem {
  title?: string; name?: string;
  url?: string; link?: string;
  description?: string; text?: string; summary?: string;
  image?: string; imageUrl?: string; thumbnail?: string;
  venue?: string; address?: string; neighborhood?: string;
  startDate?: string; date?: string; starts_at?: string;
  type?: string; category?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { items, source_id } = await req.json();
    if (!Array.isArray(items)) return err("items must be array");
    const sb = adminClient();

    const { data: run } = await sb.from("automation_runs").insert({
      job: "apify:paste", source_id: source_id ?? null, status: "running", items_in: items.length,
    }).select().single();

    let out = 0;
    for (const raw of items as ApifyItem[]) {
      const title = raw.title || raw.name;
      const url = raw.url || raw.link;
      if (!title) continue;

      const startDate = raw.startDate || raw.date || raw.starts_at;
      const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 7);

      await sb.from("content_items").insert({
        slug,
        type: (raw.type || raw.category || "event") as never,
        status: "draft",
        title: title.slice(0, 240),
        summary: (raw.summary || raw.description || raw.text || "").slice(0, 280) || null,
        body: raw.description || raw.text || null,
        source_url: url || null,
        source_name: "Apify",
        hero_image_url: raw.image || raw.imageUrl || raw.thumbnail || null,
        venue: raw.venue || null,
        address: raw.address || null,
        neighborhood: raw.neighborhood || null,
        starts_at: startDate ? new Date(startDate).toISOString() : null,
      });
      out++;
    }

    await sb.from("automation_runs").update({
      status: "ok", finished_at: new Date().toISOString(), items_out: out,
    }).eq("id", run!.id);

    return ok({ items_in: items.length, items_out: out });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
