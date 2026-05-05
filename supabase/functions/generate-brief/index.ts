// Builds a daily newsletter digest from recently published content.
import { adminClient, corsHeaders, ok, err } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { subject } = await req.json().catch(() => ({}));
    const sb = adminClient();

    const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const { data: items, error } = await sb.from("content_items")
      .select("*").eq("status", "published")
      .gte("published_at", since)
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(12);
    if (error) return err(error.message);
    if (!items || items.length === 0) return err("No published items in the last 36h to include.");

    const subjectLine = subject || `Tel Aviv today — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "";

    const html = `<!doctype html><html><body style="font-family:Georgia,serif;background:#f7f1e3;color:#1a1f2e;margin:0;padding:0">
<div style="max-width:640px;margin:0 auto;background:#fdfaf2;padding:32px">
  <div style="border-bottom:2px solid #1a1f2e;padding-bottom:12px;margin-bottom:24px">
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase">TLV·RADAR · The Morning Brief</div>
    <h1 style="font-size:36px;margin:8px 0 0;letter-spacing:-0.02em">${subjectLine}</h1>
  </div>
  ${items.map((it, idx) => `
    <div style="${idx > 0 ? "border-top:1px solid #ddd;padding-top:20px;" : ""}margin-bottom:24px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#e7501f;font-weight:bold">${it.type}${it.neighborhood ? " · " + it.neighborhood : ""}</div>
      <h2 style="font-size:22px;margin:6px 0 8px;line-height:1.15"><a href="${baseUrl}/post/${it.slug}" style="color:#1a1f2e;text-decoration:none">${escapeHtml(it.title)}</a></h2>
      ${it.summary ? `<p style="margin:0;color:#555;font-size:15px;line-height:1.5">${escapeHtml(it.summary)}</p>` : ""}
    </div>`).join("")}
  <div style="margin-top:32px;padding-top:16px;border-top:2px solid #1a1f2e;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#888">
    You're getting this because you signed up at TLV Radar.
  </div>
</div></body></html>`;

    const { data: digest, error: dErr } = await sb.from("newsletter_digests").insert({
      kind: "daily", subject: subjectLine, html,
      content_ids: items.map(i => i.id), status: "draft",
    }).select().single();
    if (dErr) return err(dErr.message);

    return ok({ digest_id: digest.id, content_count: items.length });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
