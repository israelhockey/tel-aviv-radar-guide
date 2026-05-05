// Run an Apify actor (or fetch its last dataset) and import items as drafts.
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
    const APIFY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY) return err("APIFY_API_KEY not configured", 500);

    const { actor_id, source_id, mode = "last", input } = await req.json();
    if (!actor_id) return err("actor_id required");
    const sb = adminClient();

    const { data: run } = await sb.from("automation_runs").insert({
      job: `apify:${actor_id}`, source_id: source_id ?? null, status: "running",
    }).select().single();

    let datasetId: string | null = null;
    if (mode === "run") {
      // Run actor synchronously and get dataset id
      const r = await fetch(
        `https://api.apify.com/v2/acts/${encodeURIComponent(actor_id)}/run-sync?token=${APIFY}&timeout=120`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input ?? {}) },
      );
      if (!r.ok) {
        const t = await r.text();
        const msg = r.status === 402
          ? `This Apify actor is not free on your plan, or you've run out of compute credits. Open the actor on apify.com and check pricing/billing, or try a different actor.`
          : r.status === 401 || r.status === 403
          ? `Apify rejected the API key (${r.status}). Verify APIFY_API_KEY is correct.`
          : r.status === 404
          ? `Actor "${actor_id}" not found. Check the format (e.g. "username~actor-name") and that you have access.`
          : `Apify run failed ${r.status}: ${t.slice(0, 200)}`;
        await sb.from("automation_runs").update({ status: "error", error: msg, finished_at: new Date().toISOString() }).eq("id", run!.id);
        return ok({ error: msg, apify_status: r.status }, 200);
      }
      const j = await r.json();
      datasetId = j?.data?.defaultDatasetId ?? null;
    } else {
      // Fetch last successful run's dataset
      const r = await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(actor_id)}/runs/last?token=${APIFY}&status=SUCCEEDED`);
      if (!r.ok) {
        const t = await r.text();
        const msg = r.status === 404
          ? `No successful runs found for "${actor_id}". Run it once on apify.com first, or switch to "Run actor now" mode.`
          : r.status === 401 || r.status === 403
          ? `Apify rejected the API key (${r.status}).`
          : `Could not fetch last run (${r.status}): ${t.slice(0, 200)}`;
        await sb.from("automation_runs").update({ status: "error", error: msg, finished_at: new Date().toISOString() }).eq("id", run!.id);
        return ok({ error: msg, apify_status: r.status }, 200);
      }
      const j = await r.json();
      datasetId = j?.data?.defaultDatasetId ?? null;
    }

    if (!datasetId) {
      await sb.from("automation_runs").update({ status: "error", error: "No dataset id", finished_at: new Date().toISOString() }).eq("id", run!.id);
      return err("No dataset id from actor", 502);
    }

    const dr = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY}&clean=true&limit=200`);
    if (!dr.ok) {
      await sb.from("automation_runs").update({ status: "error", error: `Dataset ${dr.status}`, finished_at: new Date().toISOString() }).eq("id", run!.id);
      return err(`Dataset fetch failed ${dr.status}`, 502);
    }
    const items: ApifyItem[] = await dr.json();

    let out = 0;
    for (const raw of items) {
      const title = raw.title || raw.name;
      const url = raw.url || raw.link;
      if (!title) continue;
      const startDate = raw.startDate || raw.date || raw.starts_at;
      const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 7);
      const { error: insErr } = await sb.from("content_items").insert({
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
      if (!insErr) out++;
    }

    await sb.from("automation_runs").update({
      status: "ok", finished_at: new Date().toISOString(), items_in: items.length, items_out: out,
    }).eq("id", run!.id);

    if (source_id) await sb.from("sources").update({ last_run_at: new Date().toISOString() }).eq("id", source_id);

    return ok({ items_in: items.length, items_out: out, dataset_id: datasetId });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
