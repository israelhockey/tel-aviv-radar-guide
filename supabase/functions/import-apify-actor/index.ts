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

    let items: ApifyItem[] = [];
    let datasetId: string | null = null;

    if (mode === "run") {
      // run-sync-get-dataset-items returns the dataset items array directly (JSON)
      const r = await fetch(
        `https://api.apify.com/v2/acts/${encodeURIComponent(actor_id)}/run-sync-get-dataset-items?token=${APIFY}&timeout=180&clean=true`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input ?? {}) },
      );
      const text = await r.text();
      if (!r.ok) {
        const msg = r.status === 402
          ? `This Apify actor requires a paid plan or you're out of compute credits. Try a free actor like "apify/website-content-crawler".`
          : r.status === 401 || r.status === 403
          ? `Apify rejected the API key (${r.status}). Verify APIFY_API_KEY.`
          : r.status === 404
          ? `Actor "${actor_id}" not found. Check the format (username~actor-name) and access.`
          : `Apify run failed ${r.status}: ${text.slice(0, 200)}`;
        await sb.from("automation_runs").update({ status: "error", error: msg, finished_at: new Date().toISOString() }).eq("id", run!.id);
        return ok({ error: msg, apify_status: r.status }, 200);
      }
      try {
        const parsed = text.trim() ? JSON.parse(text) : [];
        items = Array.isArray(parsed) ? parsed : [];
      } catch {
        const msg = `Apify returned non-JSON response (${text.length} bytes). Actor may have failed silently.`;
        await sb.from("automation_runs").update({ status: "error", error: msg, finished_at: new Date().toISOString() }).eq("id", run!.id);
        return ok({ error: msg }, 200);
      }
    } else {
      const r = await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(actor_id)}/runs/last?token=${APIFY}&status=SUCCEEDED`);
      const text = await r.text();
      if (!r.ok) {
        const msg = r.status === 404
          ? `No successful runs for "${actor_id}". Run it once on apify.com first, or switch to "Run actor now".`
          : `Could not fetch last run (${r.status}): ${text.slice(0, 200)}`;
        await sb.from("automation_runs").update({ status: "error", error: msg, finished_at: new Date().toISOString() }).eq("id", run!.id);
        return ok({ error: msg, apify_status: r.status }, 200);
      }
      try {
        datasetId = JSON.parse(text)?.data?.defaultDatasetId ?? null;
      } catch {
        return ok({ error: "Apify returned invalid JSON for last run." }, 200);
      }
      if (!datasetId) {
        return ok({ error: "No dataset id on last run." }, 200);
      }
      const dr = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY}&clean=true&limit=200`);
      if (!dr.ok) return ok({ error: `Dataset fetch failed ${dr.status}` }, 200);
      items = await dr.json();
    }


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
