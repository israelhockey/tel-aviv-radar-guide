// Sends a newsletter digest via Resend. Requires RESEND_API_KEY.
import { adminClient, corsHeaders, ok, err } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { digest_id } = await req.json();
    if (!digest_id) return err("digest_id required");

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return ok({ needs_secret: true, error: "RESEND_API_KEY not configured" }, 200);

    const sb = adminClient();
    const { data: digest, error } = await sb.from("newsletter_digests").select("*").eq("id", digest_id).single();
    if (error || !digest) return err("Digest not found", 404);
    if (digest.status === "sent") return err("Already sent");

    const { data: subs } = await sb.from("subscribers").select("email").eq("status", "active");
    const emails = (subs ?? []).map(s => s.email);
    if (emails.length === 0) return err("No active subscribers");

    const fromAddr = Deno.env.get("RESEND_FROM") || "TLV Radar <onboarding@resend.dev>";

    // Resend supports up to 50 recipients per send via "bcc" trick or batch
    const chunks: string[][] = [];
    for (let i = 0; i < emails.length; i += 50) chunks.push(emails.slice(i, i + 50));

    let sent = 0;
    for (const chunk of chunks) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromAddr, to: fromAddr, bcc: chunk,
          subject: digest.subject, html: digest.html,
        }),
      });
      if (r.ok) sent += chunk.length;
      else {
        const t = await r.text();
        console.error("Resend error", r.status, t);
      }
    }

    await sb.from("newsletter_digests").update({
      status: "sent", sent_at: new Date().toISOString(), recipient_count: sent,
    }).eq("id", digest_id);

    return ok({ recipient_count: sent });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
