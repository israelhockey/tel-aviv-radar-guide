// Adds an address to someone's construction alerts. One row per email; each email can watch
// several addresses (up to 5) and choose instant alerts or a weekly digest.
// It only ever adds or updates: nothing about a subscriber is returned to the caller.
import { adminClient, corsHeaders, ok, err } from "../_shared/utils.ts";

type Alert = { label: string; lat: number; lon: number; radius: number; kinds?: string[]; created?: string };
const MAX = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const a = body.alert as Alert;
    const frequency = body.frequency === "weekly" ? "weekly" : "instant";
    const lang = body.lang === "he" ? "he" : "en";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return err("bad email");
    if (!a || !Number.isFinite(a.lat) || !Number.isFinite(a.lon) || Math.abs(a.lat - 32.08) > 0.12 || Math.abs(a.lon - 34.79) > 0.12) return err("bad address");
    const alert: Alert = {
      label: String(a.label ?? "").slice(0, 120), lat: +a.lat.toFixed(6), lon: +a.lon.toFixed(6),
      radius: [100, 250, 500].includes(a.radius) ? a.radius : 250,
      kinds: Array.isArray(a.kinds) ? a.kinds.map(String).slice(0, 10) : undefined, created: new Date().toISOString(),
    };

    const sb = adminClient();
    const { data: row } = await sb.from("subscribers").select("id, preferences").eq("email", email).maybeSingle();
    if (!row) {
      const { error } = await sb.from("subscribers").insert({ email, source: "build-alerts", preferences: { lang, frequency, alerts: [alert] } });
      if (error) return err("could not save", 500);
      return ok({ ok: true, count: 1 });
    }
    const prefs = (row.preferences ?? {}) as Record<string, unknown>;
    const alerts = (Array.isArray(prefs.alerts) ? prefs.alerts : []) as Alert[];
    // Same spot (within ~30 m) replaces the old entry, so changing the radius doesn't duplicate it.
    const same = (x: Alert) => Math.abs(x.lat - alert.lat) < 0.0003 && Math.abs(x.lon - alert.lon) < 0.0003;
    const next = [...alerts.filter((x) => !same(x)), alert];
    if (next.length > MAX) return ok({ ok: false, full: true, count: alerts.length });
    const { error } = await sb.from("subscribers").update({ preferences: { ...prefs, lang, frequency, alerts: next } }).eq("id", row.id);
    if (error) return err("could not save", 500);
    return ok({ ok: true, count: next.length });
  } catch {
    return err("bad request");
  }
});
