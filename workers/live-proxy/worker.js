// TLV Radar live-data relay — a Cloudflare Worker (free plan: 100,000 requests/day).
// Forwards browser requests to an allow-list of open-data hosts that don't send CORS
// headers (flights, OpenStreetMap Overpass) and caches responses briefly at the edge,
// so many visitors share one upstream call.
//
// Deploy: Cloudflare dashboard → Workers & Pages → Create → "Hello World" worker →
// Edit code → paste this file → Deploy. Then put the worker's URL in
// src/lib/live/sources.ts (RELAY_URL).
//
// Usage: GET https://<worker>/?url=<encoded upstream URL>
//        POST https://<worker>/?url=<encoded upstream URL> with the body to forward.

const ALLOWED_HOSTS = new Set([
  "api.adsb.lol",
  "opensky-network.org",
  "api.airplanes.live",
  "opendata.adsb.fi",
  "overpass-api.de",
  "overpass.private.coffee",
  "open-bus-stride-api.hasadna.org.il",
]);

// Seconds to cache each host's answers at the edge.
const TTL = {
  "api.adsb.lol": 8,
  "opensky-network.org": 10,
  "api.airplanes.live": 8,
  "opendata.adsb.fi": 8,
  "overpass-api.de": 6 * 3600,
  "overpass.private.coffee": 6 * 3600,
  "open-bus-stride-api.hasadna.org.il": 20,
};

// Only these sites may call the relay from a browser. Add your own domain if you get one.
const ALLOWED_ORIGINS = [
  /^https:\/\/tel-aviv-radar-guide\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
];

const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") ?? "";
    const allowedOrigin = ALLOWED_ORIGINS.some((re) => re.test(origin)) ? origin : null;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: allowedOrigin ? 204 : 403, headers: allowedOrigin ? cors(allowedOrigin) : {} });
    }
    if (!allowedOrigin) return new Response("origin not allowed", { status: 403 });
    if (request.method !== "GET" && request.method !== "POST") {
      return new Response("method not allowed", { status: 405, headers: cors(allowedOrigin) });
    }

    let target;
    try {
      target = new URL(new URL(request.url).searchParams.get("url") ?? "");
    } catch {
      return new Response("url required", { status: 400, headers: cors(allowedOrigin) });
    }
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.host)) {
      return new Response("host not allowed", { status: 403, headers: cors(allowedOrigin) });
    }

    const body = request.method === "POST" ? await request.text() : undefined;
    // POST bodies are part of the cache key (Overpass queries).
    const cacheKey = new Request(`https://relay.cache/${request.method}/${encodeURIComponent(target)}/${body ? await sha(body) : ""}`);
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) return withCors(hit, allowedOrigin);

    const upstream = await fetch(target, {
      method: request.method,
      body,
      headers: {
        "User-Agent": "TLV-Radar/1.0 (free public city guide)",
        ...(body ? { "Content-Type": request.headers.get("Content-Type") ?? "application/x-www-form-urlencoded" } : {}),
      },
    });
    const res = new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": `public, max-age=${TTL[target.host] ?? 60}`,
      },
    });
    if (upstream.ok) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return withCors(res, allowedOrigin);
  },
};

const withCors = (res, origin) => {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(cors(origin))) out.headers.set(k, v);
  return out;
};

const sha = async (text) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};
