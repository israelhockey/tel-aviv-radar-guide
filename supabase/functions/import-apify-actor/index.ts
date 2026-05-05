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
      // Start the actor asynchronously, then poll up to ~120s for completion.
      const startR = await fetch(
        `https://api.apify.com/v2/acts/${encodeURIComponent(actor_id)}/runs?token=${APIFY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input ?? {}) },
      );
      const startText = await startR.text();
      if (!startR.ok) {
        const msg = startR.status === 402
          ? `This Apify actor requires a paid plan or you're out of compute credits. Try a free actor like "apify/website-content-crawler".`
          : startR.status === 401 || startR.status === 403
          ? `Apify rejected the API key (${startR.status}). Verify APIFY_API_KEY.`
          : startR.status === 404
          ? `Actor "${actor_id}" not found. Check the format (username~actor-name) and access.`
          : `Apify start failed ${startR.status}: ${startText.slice(0, 200)}`;
        await sb.from("automation_runs").update({ status: "error", error: msg, finished_at: new Date().toISOString() }).eq("id", run!.id);
        return ok({ error: msg, apify_status: startR.status }, 200);
      }
      let runInfo: { id?: string; defaultDatasetId?: string; status?: string } = {};
      try { runInfo = JSON.parse(startText)?.data ?? {}; } catch { /* ignore */ }
      const runId = runInfo.id;
      datasetId = runInfo.defaultDatasetId ?? null;
      if (!runId) {
        const msg = "Apify did not return a run id.";
        await sb.from("automation_runs").update({ status: "error", error: msg, finished_at: new Date().toISOString() }).eq("id", run!.id);
        return ok({ error: msg }, 200);
      }
      // Poll up to ~120s
      const deadline = Date.now() + 120_000;
      let status = runInfo.status ?? "RUNNING";
      while (Date.now() < deadline && (status === "RUNNING" || status === "READY")) {
        await new Promise((r) => setTimeout(r, 4000));
        const sr = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY}`);
        if (!sr.ok) break;
        try {
          const j = await sr.json();
          status = j?.data?.status ?? status;
          datasetId = j?.data?.defaultDatasetId ?? datasetId;
        } catch { break; }
      }
      if (status !== "SUCCEEDED") {
        const msg = `Apify run still ${status} after 120s. It will keep running on Apify; use "Use last successful run" later to import results, or lower the input size (e.g. fewer pages/events).`;
        await sb.from("automation_runs").update({ status: "error", error: msg, finished_at: new Date().toISOString() }).eq("id", run!.id);
        return ok({ error: msg, run_id: runId, apify_status: status }, 200);
      }
      if (!datasetId) {
        return ok({ error: "Run succeeded but no dataset id." }, 200);
      }
      const dr = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY}&clean=true&limit=200`);
      if (!dr.ok) return ok({ error: `Dataset fetch failed ${dr.status}` }, 200);
      try { items = await dr.json(); } catch { items = []; }
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
