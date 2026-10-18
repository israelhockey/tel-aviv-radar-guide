// Forwards browser requests to open-data hosts that don't send CORS headers.
// Only an allow-list of public, key-free sources is reachable, and responses are
// cached briefly in memory so many visitors share one upstream call.
import { corsHeaders, err, ok } from "../_shared/utils.ts";

const ALLOWED_HOSTS = new Set([
  "api.adsb.lol",
  "opensky-network.org",
  "open-bus-stride-api.hasadna.org.il",
  "overpass-api.de",
  "overpass.private.coffee",
  "api.open-meteo.com",
  "marine-api.open-meteo.com",
  "air-quality-api.open-meteo.com",
  "www.hebcal.com",
  "api.rainviewer.com",
]);

const TTL_MS: Record<string, number> = {
  "api.adsb.lol": 10_000,
  "opensky-network.org": 10_000,
  "open-bus-stride-api.hasadna.org.il": 20_000,
  "overpass-api.de": 6 * 3600_000,
  "overpass.private.coffee": 6 * 3600_000,
};
const DEFAULT_TTL = 5 * 60_000;

const cache = new Map<string, { at: number; body: unknown }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url, method = "GET", body, contentType } = await req.json();
    if (typeof url !== "string") return err("url required");
    const target = new URL(url);
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.host)) return err("host not allowed", 403);
    if (method !== "GET" && method !== "POST") return err("method not allowed", 405);

    const key = `${method} ${url} ${body ?? ""}`;
    const ttl = TTL_MS[target.host] ?? DEFAULT_TTL;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttl) return ok(hit.body);

    const upstream = await fetch(target.toString(), {
      method,
      body: method === "POST" ? String(body ?? "") : undefined,
      headers: {
        "User-Agent": "TLV-Radar/1.0 (free public city guide)",
        ...(method === "POST" ? { "Content-Type": contentType ?? "application/x-www-form-urlencoded" } : {}),
      },
    });
    if (!upstream.ok) return err(`upstream ${upstream.status}`, 502);
    const data = await upstream.json();
    cache.set(key, { at: Date.now(), body: data });
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    return ok(data);
  } catch (e) {
    return err(e instanceof Error ? e.message : "proxy error", 500);
  }
});
