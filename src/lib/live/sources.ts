// Free, open data sources for the live city view. Every function returns plain data
// and throws on failure; React Query handles retries and caching.
import { supabase } from "@/integrations/supabase/client";
import { BEACHES, HEBCAL_GEONAME_ID, OFFSHORE_LON_SHIFT, TLV_BBOX, TLV_CENTER } from "./geo";

const TIMEOUT_MS = 15000;

const withTimeout = async (url: string, init?: RequestInit) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

// Our Cloudflare Worker relay (workers/live-proxy/worker.js) for open-data hosts that block
// browser requests. Empty until the worker is deployed; set it to the worker's URL.
export const RELAY_URL = "https://tlv-radar-relay.fifeflyers2025.workers.dev/";

// Try the source directly from the browser; if that fails (CORS, network), go through the relay.
const getJSON = async <T,>(url: string, init?: { method?: "GET" | "POST"; body?: string; contentType?: string }): Promise<T> => {
  const requestInit: RequestInit | undefined = init?.method === "POST"
    ? { method: "POST", body: init.body, headers: { "Content-Type": init.contentType ?? "application/x-www-form-urlencoded" } }
    : undefined;
  try {
    return (await withTimeout(url, requestInit)) as T;
  } catch (direct) {
    if (RELAY_URL) {
      try {
        return (await withTimeout(`${RELAY_URL}?url=${encodeURIComponent(url)}`, requestInit)) as T;
      } catch { /* fall through to the Supabase function */ }
    }
    const { data, error } = await supabase.functions.invoke("live-proxy", {
      body: { url, method: init?.method ?? "GET", body: init?.body, contentType: init?.contentType },
    });
    if (error || data == null || (typeof data === "object" && data && "error" in data)) throw direct;
    return data as T;
  }
};

/* ---------------- Weather, air, sea (Open-Meteo, no key) ---------------- */

export type Weather = {
  temp: number; feels: number; windKmh: number; windDir: number; code: number; isDay: boolean;
  sunrise: string; sunset: string; uvMax: number;
};

export const fetchWeather = async (): Promise<Weather> => {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(TLV_CENTER.lat));
  u.searchParams.set("longitude", String(TLV_CENTER.lon));
  u.searchParams.set("current", "temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code,is_day");
  u.searchParams.set("daily", "sunrise,sunset,uv_index_max");
  u.searchParams.set("timezone", "Asia/Jerusalem");
  u.searchParams.set("forecast_days", "1");
  const j = await getJSON<any>(u.toString());
  return {
    temp: j.current.temperature_2m,
    feels: j.current.apparent_temperature,
    windKmh: j.current.wind_speed_10m,
    windDir: j.current.wind_direction_10m,
    code: j.current.weather_code,
    isDay: j.current.is_day === 1,
    sunrise: j.daily.sunrise[0],
    sunset: j.daily.sunset[0],
    uvMax: j.daily.uv_index_max[0],
  };
};

export type Air = { aqi: number | null; pm25: number | null };

export const fetchAir = async (): Promise<Air> => {
  const u = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  u.searchParams.set("latitude", String(TLV_CENTER.lat));
  u.searchParams.set("longitude", String(TLV_CENTER.lon));
  u.searchParams.set("current", "european_aqi,pm2_5");
  u.searchParams.set("timezone", "Asia/Jerusalem");
  const j = await getJSON<any>(u.toString());
  return { aqi: j.current?.european_aqi ?? null, pm25: j.current?.pm2_5 ?? null };
};

export type BeachConditions = {
  id: string; waveHeight: number | null; wavePeriod: number | null; waveDir: number | null; seaTemp: number | null;
};

export const fetchBeaches = async (): Promise<BeachConditions[]> => {
  const u = new URL("https://marine-api.open-meteo.com/v1/marine");
  u.searchParams.set("latitude", BEACHES.map((b) => b.lat).join(","));
  u.searchParams.set("longitude", BEACHES.map((b) => (b.lon + OFFSHORE_LON_SHIFT).toFixed(4)).join(","));
  u.searchParams.set("current", "wave_height,wave_period,wave_direction,sea_surface_temperature");
  u.searchParams.set("timezone", "Asia/Jerusalem");
  const j = await getJSON<any>(u.toString());
  const rows: any[] = Array.isArray(j) ? j : [j];
  return BEACHES.map((b, i) => {
    const c = rows[i]?.current ?? {};
    return {
      id: b.id,
      waveHeight: c.wave_height ?? null,
      wavePeriod: c.wave_period ?? null,
      waveDir: c.wave_direction ?? null,
      seaTemp: c.sea_surface_temperature ?? null,
    };
  });
};

export type SeaState = "calm" | "light" | "choppy" | "rough";
export const seaState = (h: number | null): SeaState | null => {
  if (h == null) return null;
  if (h < 0.4) return "calm";
  if (h < 0.9) return "light";
  if (h < 1.7) return "choppy";
  return "rough";
};

/* ---------------- Shabbat and Hebrew date (Hebcal, CC BY 4.0) ---------------- */

export type Shabbat = { candles?: string; havdalah?: string; parasha?: string; holiday?: string };

export const fetchShabbat = async (lang: "en" | "he"): Promise<Shabbat> => {
  const u = new URL("https://www.hebcal.com/shabbat");
  u.searchParams.set("cfg", "json");
  u.searchParams.set("geonameid", String(HEBCAL_GEONAME_ID));
  u.searchParams.set("M", "on");
  u.searchParams.set("lg", lang === "he" ? "he" : "s");
  const j = await getJSON<any>(u.toString());
  const items: any[] = j.items ?? [];
  return {
    candles: items.find((i) => i.category === "candles")?.date,
    havdalah: items.find((i) => i.category === "havdalah")?.date,
    parasha: items.find((i) => i.category === "parashat")?.title,
    // Only major holidays replace the weekly portion; minor observances are noise here.
    holiday: items.find((i) => i.category === "holiday" && i.subcat === "major")?.title,
  };
};

export const fetchHebrewDate = async (): Promise<string> => {
  const d = new Date();
  const u = new URL("https://www.hebcal.com/converter");
  u.searchParams.set("cfg", "json");
  u.searchParams.set("g2h", "1");
  u.searchParams.set("gy", String(d.getFullYear()));
  u.searchParams.set("gm", String(d.getMonth() + 1));
  u.searchParams.set("gd", String(d.getDate()));
  const j = await getJSON<any>(u.toString());
  return j.hebrew as string;
};

/* ---------------- Buses (Open Bus Stride by Hasadna, SIRI real-time) ---------------- */

const STRIDE = "https://open-bus-stride-api.hasadna.org.il";

export type Bus = {
  id: string; lat: number; lon: number; bearing: number; speed: number; recordedAt: string;
  lineRef: number; operatorRef: number; line?: string; to?: string; from?: string; agency?: string;
  rideId?: number; scheduledStart?: string; distance?: number;
};

type RouteInfo = { line?: string; to?: string; from?: string; agency?: string };
const routeCache = new Map<number, RouteInfo>();

const lookupRoutes = async (lineRefs: number[]) => {
  const missing = lineRefs.filter((r) => !routeCache.has(r));
  if (!missing.length) return;
  const today = new Date().toISOString().slice(0, 10);
  // Batch to keep URLs short; batches run in parallel.
  const chunks: number[][] = [];
  for (let i = 0; i < missing.length; i += 120) chunks.push(missing.slice(i, i + 120));
  await Promise.all(chunks.map(async (chunk) => {
    const u = new URL(`${STRIDE}/gtfs_routes/list`);
    u.searchParams.set("line_refs", chunk.join(","));
    u.searchParams.set("date_from", today);
    u.searchParams.set("date_to", today);
    u.searchParams.set("limit", String(chunk.length * 2));
    try {
      const rows = await getJSON<any[]>(u.toString());
      for (const r of rows) {
        const longName: string = r.route_long_name ?? "";
        // route_long_name looks like "Origin-City<->Destination-City-2#"; keep the destination part.
        const [o, d] = longName.split("<->");
        const tidy = (x?: string) => x?.replace(/-\d+#?$/, "").replace(/-/g, " · ").trim() || undefined;
        routeCache.set(r.line_ref, { line: r.route_short_name ?? undefined, to: tidy(d), from: tidy(o), agency: r.agency_name ?? undefined });
      }
    } catch { /* names are a nice-to-have; positions still show */ }
    for (const r of chunk) if (!routeCache.has(r)) routeCache.set(r, {});
  }));
};

export const routeInfo = async (lineRef: number): Promise<RouteInfo> => {
  await lookupRoutes([lineRef]);
  return routeCache.get(lineRef) ?? {};
};

type LonLat = [number, number];
const ridePath = async (rideId: number): Promise<{ coords: LonLat[]; dist: number[]; times: string[] }> => {
  const u = new URL(`${STRIDE}/siri_vehicle_locations/list`);
  u.searchParams.set("siri_rides__ids", String(rideId));
  u.searchParams.set("order_by", "recorded_at_time asc");
  u.searchParams.set("limit", "1000");
  const rows = await getJSON<any[]>(u.toString());
  const ok = rows.filter((r) => typeof r.lat === "number" && r.lat > 29 && r.lat < 34);
  return { coords: ok.map((r) => [r.lon, r.lat]), dist: ok.map((r) => r.distance_from_journey_start ?? 0), times: ok.map((r) => r.recorded_at_time) };
};

// The whole route of a line, taken from a recent finished trip in the same direction.
const routePathCache = new Map<number, Promise<{ coords: LonLat[]; dist: number[]; minutes: number | null } | null>>();
export const lineRoutePath = (lineRef: number) => {
  if (!routePathCache.has(lineRef)) {
    routePathCache.set(lineRef, (async () => {
      const u = new URL(`${STRIDE}/siri_rides/list`);
      u.searchParams.set("siri_route__line_refs", String(lineRef));
      u.searchParams.set("scheduled_start_time_from", new Date(Date.now() - 36 * 3600_000).toISOString());
      u.searchParams.set("scheduled_start_time_to", new Date(Date.now() - 3 * 3600_000).toISOString());
      u.searchParams.set("order_by", "scheduled_start_time desc");
      u.searchParams.set("limit", "4");
      const rides = await getJSON<any[]>(u.toString());
      // Prefer a trip the feed saw from start to finish.
      for (const r of [...rides.filter((x) => x.duration_minutes), ...rides.filter((x) => !x.duration_minutes)].slice(0, 2)) {
        const p = await ridePath(r.id);
        if (p.coords.length >= 5) return { coords: p.coords, dist: p.dist, minutes: r.duration_minutes ?? null };
      }
      return null;
    })().catch(() => { routePathCache.delete(lineRef); return null; }));
  }
  return routePathCache.get(lineRef)!;
};

export type BusTrip = {
  trail: LonLat[];          // where this bus has driven on this trip
  route: LonLat[] | null;   // the full route, from an earlier trip
  ahead: LonLat[] | null;   // the part of the route still to come
  startedAt: string | null; // first position the feed has for this trip
  doneKm: number | null; totalKm: number | null; tripMinutes: number | null;
};

export const fetchBusTrip = async (bus: Bus): Promise<BusTrip> => {
  const [trail, route] = await Promise.all([
    bus.rideId ? ridePath(bus.rideId).catch(() => null) : Promise.resolve(null),
    lineRoutePath(bus.lineRef),
  ]);
  const done = bus.distance ?? trail?.dist.at(-1) ?? null;
  let ahead: LonLat[] | null = null;
  if (route && done != null) {
    const i = route.dist.findIndex((d) => d > done);
    ahead = i >= 0 ? [[bus.lon, bus.lat], ...route.coords.slice(i)] : null;
  }
  const total = route?.dist.at(-1) ?? null;
  return {
    trail: [...(trail?.coords ?? []), [bus.lon, bus.lat]],
    route: route?.coords ?? null,
    ahead,
    startedAt: trail?.times[0] ?? null,
    doneKm: done != null ? done / 1000 : null,
    totalKm: total ? total / 1000 : null,
    tripMinutes: route?.minutes ?? null,
  };
};

/* ---------------- "Where to?": lines that run between two points ---------------- */

export type Geo = { lat: number; lon: number; label: string };

export const geocode = async (q: string, lang: "he" | "en"): Promise<Geo[]> => {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("q", q);
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("limit", "5");
  u.searchParams.set("countrycodes", "il");
  u.searchParams.set("viewbox", "34.70,32.20,34.95,31.95"); // Gush Dan first
  u.searchParams.set("accept-language", lang === "he" ? "he,en" : "en,he");
  const rows = await getJSON<any[]>(u.toString());
  return rows.map((r) => ({ lat: Number(r.lat), lon: Number(r.lon), label: String(r.display_name).split(",").slice(0, 3).join(",") }));
};

export type LineMatch = { lineRef: number; line?: string; to?: string; from?: string; agency?: string; distAtOrigin: number; distAtDest: number };

// Lines whose buses, over the last few hours, passed near the start and then near the destination.
// Uses only the Open Bus feed, so it needs no timetable download.
export const linesBetween = async (o: Geo, d: Geo): Promise<LineMatch[]> => {
  const near = async (p: Geo) => {
    const u = new URL(`${STRIDE}/siri_vehicle_locations/list`);
    const dl = 0.0035, dn = 0.0042; // ~400 m
    u.searchParams.set("recorded_at_time_from", new Date(Date.now() - 3 * 3600_000).toISOString());
    u.searchParams.set("recorded_at_time_to", new Date(Date.now() + 60000).toISOString());
    u.searchParams.set("lat__greater_or_equal", String(p.lat - dl));
    u.searchParams.set("lat__lower_or_equal", String(p.lat + dl));
    u.searchParams.set("lon__greater_or_equal", String(p.lon - dn));
    u.searchParams.set("lon__lower_or_equal", String(p.lon + dn));
    u.searchParams.set("limit", "6000");
    return getJSON<any[]>(u.toString());
  };
  const [a, b] = await Promise.all([near(o), near(d)]);
  const atOrigin = new Map<number, number>();
  for (const r of a) {
    const prev = atOrigin.get(r.siri_ride__id);
    if (prev == null || r.distance_from_journey_start < prev) atOrigin.set(r.siri_ride__id, r.distance_from_journey_start);
  }
  const best = new Map<number, LineMatch>();
  for (const r of b) {
    const s = atOrigin.get(r.siri_ride__id);
    if (s == null || !(r.distance_from_journey_start > s)) continue; // must reach the destination after the start
    const lr = r.siri_route__line_ref;
    if (!best.has(lr)) best.set(lr, { lineRef: lr, distAtOrigin: s, distAtDest: r.distance_from_journey_start });
  }
  const list = [...best.values()];
  await lookupRoutes(list.map((l) => l.lineRef));
  for (const l of list) Object.assign(l, routeCache.get(l.lineRef) ?? {});
  return list.sort((x, y) => (x.distAtDest - x.distAtOrigin) - (y.distAtDest - y.distAtOrigin));
};

export const fetchBuses = async (): Promise<{ buses: Bus[]; newest: string | null }> => {
  // The public feed arrives in batches roughly 15-25 minutes behind real time, with a thin
  // trickle of stragglers after the last full batch. Pull the most recent rows, find the
  // newest minute that holds a full batch, and show every bus seen in the 3 minutes up to it.
  const u = new URL(`${STRIDE}/siri_vehicle_locations/list`);
  u.searchParams.set("recorded_at_time_from", new Date(Date.now() - 60 * 60000).toISOString());
  // Upper bound too: the feed contains a few rows with bogus far-future timestamps.
  u.searchParams.set("recorded_at_time_to", new Date(Date.now() + 60000).toISOString());
  u.searchParams.set("lat__greater_or_equal", String(TLV_BBOX.south));
  u.searchParams.set("lat__lower_or_equal", String(TLV_BBOX.north));
  u.searchParams.set("lon__greater_or_equal", String(TLV_BBOX.west));
  u.searchParams.set("lon__lower_or_equal", String(TLV_BBOX.east));
  u.searchParams.set("order_by", "recorded_at_time desc");
  u.searchParams.set("limit", "4000");
  const rows = await getJSON<any[]>(u.toString());
  if (!rows.length) return { buses: [], newest: null };

  const perMinute = new Map<string, number>();
  for (const r of rows) {
    const k = String(r.recorded_at_time).slice(0, 16);
    perMinute.set(k, (perMinute.get(k) ?? 0) + 1);
  }
  const peak = Math.max(...perMinute.values());
  const threshold = Math.max(20, peak * 0.3);
  const anchorKey = [...perMinute.entries()].filter(([, n]) => n >= threshold).map(([k]) => k).sort().at(-1);
  const anchor = anchorKey ? new Date(`${anchorKey}:59Z`).getTime() : new Date(rows[0].recorded_at_time).getTime();
  const windowStart = anchor - 3 * 60000;

  const latest = new Map<string, Bus>();
  let newest: string | null = null;
  for (const r of rows) {
    const t = new Date(r.recorded_at_time).getTime();
    if (t > anchor || t < windowStart) continue;
    const id = String(r.siri_ride__vehicle_ref ?? r.siri_ride__id ?? r.id);
    if (latest.has(id)) continue; // rows are newest-first
    newest ??= r.recorded_at_time;
    latest.set(id, {
      id, lat: r.lat, lon: r.lon, bearing: r.bearing ?? 0, speed: r.velocity ?? 0, recordedAt: r.recorded_at_time,
      lineRef: r.siri_route__line_ref, operatorRef: r.siri_route__operator_ref,
      rideId: r.siri_ride__id ?? undefined, scheduledStart: r.siri_ride__scheduled_start_time ?? undefined,
      distance: r.distance_from_journey_start ?? undefined,
    });
  }
  const buses = [...latest.values()];
  await lookupRoutes([...new Set(buses.map((b) => b.lineRef).filter(Boolean))]);
  for (const b of buses) Object.assign(b, routeCache.get(b.lineRef) ?? {});
  return { buses, newest };
};

/* ---------------- Aircraft (adsb.lol, then adsb.fi, then OpenSky) ---------------- */

export type Aircraft = {
  id: string; callsign: string; lat: number; lon: number; track: number; altFt: number | null; speedKt: number | null; type?: string;
  reg?: string; desc?: string; operator?: string; vRate?: number | null; squawk?: string; onGround?: boolean;
};

// Both adsb.lol and adsb.fi speak the readsb "v2" format.
const fromReadsb = (j: any): Aircraft[] =>
  ((j.ac ?? j.aircraft ?? []) as any[])
    .filter((a) => typeof a.lat === "number" && typeof a.lon === "number")
    .map((a) => ({
      id: a.hex, callsign: String(a.flight ?? a.r ?? a.hex ?? "").trim(), lat: a.lat, lon: a.lon,
      track: a.track ?? a.true_heading ?? 0,
      altFt: typeof a.alt_baro === "number" ? a.alt_baro : null,
      speedKt: a.gs ?? null, type: a.t,
      reg: a.r, desc: a.desc, operator: a.ownOp, vRate: a.baro_rate ?? a.geom_rate ?? null, squawk: a.squawk,
      onGround: a.alt_baro === "ground",
    }));

const fromOpenSky = (j: any): Aircraft[] =>
  ((j.states ?? []) as any[][])
    .filter((s) => s[5] != null && s[6] != null)
    .map((s) => ({
      id: s[0], callsign: String(s[1] ?? s[0]).trim(), lon: s[5], lat: s[6], track: s[10] ?? 0,
      altFt: s[7] != null ? Math.round(s[7] * 3.281) : null,
      speedKt: s[9] != null ? Math.round(s[9] * 1.944) : null,
    }));

const FLIGHT_SOURCES: [string, (j: any) => Aircraft[]][] = [
  [`https://api.adsb.lol/v2/lat/${TLV_CENTER.lat}/lon/${TLV_CENTER.lon}/dist/25`, fromReadsb],
  [`https://opendata.adsb.fi/api/v2/lat/${TLV_CENTER.lat}/lon/${TLV_CENTER.lon}/dist/25`, fromReadsb],
  ["https://opensky-network.org/api/states/all?lamin=31.85&lamax=32.3&lomin=34.5&lomax=35.1", fromOpenSky],
];

// The free flight feeds have short gaps. Keep showing the last good positions for up to
// two minutes rather than emptying the sky.
let lastFlights: { at: number; planes: Aircraft[] } | null = null;

export const fetchAircraft = async (): Promise<Aircraft[]> => {
  for (const [url, parse] of FLIGHT_SOURCES) {
    try {
      const planes = parse(await getJSON<any>(url));
      lastFlights = { at: Date.now(), planes };
      return planes;
    } catch { /* try the next source */ }
  }
  if (lastFlights && Date.now() - lastFlights.at < 2 * 60_000) return lastFlights.planes;
  throw new Error("No flight source responded");
};

export type Airport = { iata?: string; name: string; city?: string; country?: string; lat: number; lon: number };
export type FlightInfo = {
  airline?: string; flightIata?: string; origin?: Airport; destination?: Airport;
  model?: string; owner?: string; ownerCountry?: string;
  photo?: { src: string; link: string; by: string };
};

const flightInfoCache = new Map<string, Promise<FlightInfo>>();
// Route and airframe from adsbdb, photo from Planespotters. Both are free and allow browser calls.
export const fetchFlightInfo = (hex: string, callsign: string) => {
  const key = `${hex}|${callsign}`;
  if (!flightInfoCache.has(key)) {
    flightInfoCache.set(key, (async () => {
      const cs = callsign.trim();
      const [db, ps] = await Promise.all([
        fetch(`https://api.adsbdb.com/v0/aircraft/${hex}${cs && cs !== hex ? `?callsign=${encodeURIComponent(cs)}` : ""}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`https://api.planespotters.net/pub/photos/hex/${hex}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      const ac = db?.response?.aircraft;
      const fr = db?.response?.flightroute;
      const ap = (x: any): Airport | undefined => x && { iata: x.iata_code, name: x.name, city: x.municipality, country: x.country_name, lat: x.latitude, lon: x.longitude };
      const p = ps?.photos?.[0];
      return {
        airline: fr?.airline?.name, flightIata: fr?.callsign_iata,
        origin: ap(fr?.origin), destination: ap(fr?.destination),
        model: ac ? `${ac.manufacturer ?? ""} ${ac.type ?? ""}`.trim() : undefined,
        owner: ac?.registered_owner, ownerCountry: ac?.registered_owner_country_name,
        photo: p ? { src: p.thumbnail_large?.src ?? p.thumbnail?.src, link: p.link, by: p.photographer } : undefined,
      };
    })());
  }
  return flightInfoCache.get(key)!;
};

/* ---------------- Places (OpenStreetMap via Overpass, ODbL) ---------------- */

export type Place = {
  id: string; name: string; nameEn?: string; kind: string; lat: number; lon: number;
  hours?: string; cuisine?: string; kosher?: string; vegan?: string; street?: string; number?: string;
  happy?: string; outdoor?: boolean; web?: string; insta?: string;
};

const PLACES_CACHE_KEY = "radar.places.v1";
const PLACES_TTL_MS = 24 * 60 * 60 * 1000;

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

export const fetchPlaces = async (): Promise<Place[]> => {
  try {
    const cached = JSON.parse(localStorage.getItem(PLACES_CACHE_KEY) ?? "null");
    if (cached && Date.now() - cached.at < PLACES_TTL_MS && Array.isArray(cached.places)) return cached.places;
  } catch { /* storage unavailable */ }

  // 1) The nightly snapshot committed to the site by GitHub Actions (same origin, no CORS).
  try {
    const res = await fetch("/data/places.json", { cache: "no-cache" });
    if (res.ok) {
      const snap = await res.json();
      if (Array.isArray(snap.places) && snap.places.length) {
        try { localStorage.setItem(PLACES_CACHE_KEY, JSON.stringify({ at: Date.now(), places: snap.places })); } catch { /* quota */ }
        return snap.places as Place[];
      }
    }
  } catch { /* fall through to a live query */ }

  // 2) A live Overpass query, directly or through our proxy.
  const b = `${TLV_BBOX.south},${TLV_BBOX.west},${TLV_BBOX.north},${TLV_BBOX.east}`;
  const q = `[out:json][timeout:40];(nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|biergarten)$"](${b});nwr["amenity"="bicycle_rental"](${b}););out center tags;`;

  let j: any = null;
  let lastErr: unknown = null;
  for (const endpoint of OVERPASS) {
    try {
      j = await getJSON<any>(endpoint, { method: "POST", body: `data=${encodeURIComponent(q)}` });
      break;
    } catch (e) { lastErr = e; }
  }
  if (!j) throw lastErr ?? new Error("Overpass unavailable");

  const places: Place[] = (j.elements ?? [])
    .map((e: any) => {
      const lat = e.lat ?? e.center?.lat;
      const lon = e.lon ?? e.center?.lon;
      const t = e.tags ?? {};
      if (lat == null || lon == null) return null;
      if (!t.name && t.amenity !== "bicycle_rental") return null;
      return {
        id: `${e.type[0]}${e.id}`,
        name: t.name ?? t["name:he"] ?? t["name:en"] ?? "",
        nameEn: t["name:en"],
        kind: t.amenity,
        lat, lon,
        hours: t.opening_hours,
        cuisine: t.cuisine,
        kosher: t["diet:kosher"],
        vegan: t["diet:vegan"],
        street: t["addr:street"],
        number: t["addr:housenumber"],
      } as Place;
    })
    .filter(Boolean);

  try { localStorage.setItem(PLACES_CACHE_KEY, JSON.stringify({ at: Date.now(), places })); } catch { /* quota */ }
  return places;
};

/* ---------------- Rain radar (RainViewer) ---------------- */

export const fetchRainTiles = async (): Promise<{ url: string; time: number } | null> => {
  const j = await getJSON<any>("https://api.rainviewer.com/public/weather-maps.json");
  const frames: any[] = j?.radar?.past ?? [];
  const last = frames[frames.length - 1];
  if (!last || !j.host) return null;
  return { url: `${j.host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`, time: last.time };
};

/* ---------------- Events and news collected by GitHub Actions (static files) ---------------- */

export type FeedEvent = {
  id: string; title: string; start: string; end: string | null; venue: string | null; address: string | null;
  lat: number | null; lon: number | null; priceFrom: number | null; free: boolean; category: string;
  url: string; image: string | null; source: string; allDay?: boolean; summary?: string | null;
};

// Weekly community-centre classes: plenty of them, so they only show when asked for.
export const isEveningOut = (e: FeedEvent) => e.category !== "community";

export type FeedNews = { id: string; title: string; url: string; source: string; lang: "he" | "en"; published: string | null; image?: string | null; summary?: string | null };

export const fetchEventsFeed = async (): Promise<{ updated: string | null; events: FeedEvent[] }> => {
  const res = await fetch("/data/events.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`events ${res.status}`);
  const j = await res.json();
  return { updated: j.updated ?? null, events: j.events ?? [] };
};

export const fetchNewsFeed = async (): Promise<{ updated: string | null; news: FeedNews[] }> => {
  const res = await fetch("/data/news.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`news ${res.status}`);
  const j = await res.json();
  return { updated: j.updated ?? null, news: j.news ?? [] };
};

/* ---------------- Rail lines and stations (nightly OpenStreetMap snapshot) ---------------- */

export type RailData = { lines: { type: "FeatureCollection"; features: unknown[] }; stations: { type: "FeatureCollection"; features: unknown[] } };

export const fetchRail = async (): Promise<RailData | null> => {
  const res = await fetch("/data/rail.json", { cache: "no-cache" });
  if (!res.ok) return null; // not generated yet
  const j = await res.json();
  return { lines: j.lines, stations: j.stations };
};

/* ---------------- City of Tel Aviv live layers (municipal GIS, public) ---------------- */

const CITY_GIS = "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer";

const cityQuery = async (layer: number, fields: string, geometry = true): Promise<any[]> => {
  const u = new URL(`${CITY_GIS}/${layer}/query`);
  u.searchParams.set("where", "1=1");
  u.searchParams.set("outFields", fields);
  u.searchParams.set("returnGeometry", String(geometry));
  u.searchParams.set("outSR", "4326");
  u.searchParams.set("f", "json");
  const j = await getJSON<any>(u.toString());
  if (j.error) throw new Error(j.error.message ?? "GIS error");
  return j.features ?? [];
};

// Traffic jams and road reports from Waze, as published by the city.
export type Jam = { level: number; kmh: number; delay: number; street: string; path: [number, number][][] };
export type RoadReport = { type: string; subtype: string; street: string; since: number; lat: number; lon: number };

export const fetchTraffic = async (): Promise<{ jams: Jam[]; reports: RoadReport[] }> => {
  const [j, r] = await Promise.all([
    cityQuery(892, "level,speedKMH,delay,street"),
    cityQuery(891, "type,subtype,street,pubMillis,reliability").catch(() => []),
  ]);
  return {
    jams: j.filter((f) => f.geometry?.paths).map((f) => ({
      level: f.attributes.level ?? 0, kmh: f.attributes.speedKMH ?? 0, delay: f.attributes.delay ?? 0,
      street: f.attributes.street ?? "", path: f.geometry.paths,
    })),
    reports: r.filter((f) => f.geometry?.x != null && (f.attributes.reliability ?? 10) >= 5).map((f) => ({
      type: f.attributes.type ?? "", subtype: f.attributes.subtype ?? "", street: f.attributes.street ?? "",
      since: Number(f.attributes.pubMillis) || 0, lat: f.geometry.y, lon: f.geometry.x,
    })),
  };
};

// Ahuzot HaHof car parks with their live status sign (free / few / full).
export type CarPark = {
  id: string; name: string; address: string; lat: number; lon: number;
  status: "free" | "few" | "full" | "closed" | "unknown"; statusAt: number | null;
  dayRate?: string; nightRate?: string; dailyMax?: string; notes?: string; hours?: string;
};

const parkStatus = (s?: string): CarPark["status"] =>
  !s ? "unknown" : /פנוי/.test(s) ? "free" : /מעט/.test(s) ? "few" : /מלא/.test(s) ? "full" : /סגור/.test(s) ? "closed" : "unknown";

export const fetchParking = async (): Promise<CarPark[]> => {
  const rows = await cityQuery(970, "code_achoza,shem_chenyon,ktovet,lon,lat,taarif_yom,taarif_layla,taarif_yomi,hearot_taarif,chalon_zman_chenyon_patoach,status_chenyon,tr_status_chenyon", false);
  const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() || undefined : undefined);
  return rows
    .map((f) => f.attributes)
    .filter((a) => a.lat && a.lon)
    .map((a) => ({
      id: String(a.code_achoza), name: a.shem_chenyon ?? "", address: a.ktovet ?? "", lat: a.lat, lon: a.lon,
      status: parkStatus(a.status_chenyon), statusAt: a.tr_status_chenyon ?? null,
      dayRate: clean(a.taarif_yom), nightRate: clean(a.taarif_layla), dailyMax: clean(a.taarif_yomi),
      notes: clean(a.hearot_taarif), hours: clean(a.chalon_zman_chenyon_patoach),
    }));
};

// Tel-O-Fun bike share docks with live bike counts.
export type BikeDock = { id: number; name: string; lat: number; lon: number; bikes: number; ebikes: number; docks: number };

export const fetchTelofan = async (): Promise<BikeDock[]> => {
  const j = await getJSON<any>("https://api.tel-aviv.gov.il/telofan/stations");
  // The feed repeats stations across imports; keep the newest row for each.
  const best = new Map<number, any>();
  for (const f of j.features ?? []) {
    const a = f.attributes;
    if (!a?.lat) continue;
    const prev = best.get(a.tachana_id);
    if (!prev || a.OBJECTID > prev.OBJECTID) best.set(a.tachana_id, a);
  }
  return [...best.values()].map((a) => ({
    id: a.tachana_id, name: a.Shem_tachana ?? "", lat: a.lat, lon: a.lon,
    bikes: a.free_bikes ?? 0, ebikes: a.free_bikesE ?? 0, docks: (a.free_amudim ?? 0) + (a.free_amudimE ?? 0),
  }));
};

/* ---------------- Beach day: hourly forecast for the coast ---------------- */

export type BeachHour = {
  time: string; temp: number; feels: number; uv: number; wind: number; rain: number; cloud: number;
  wave: number | null; sea: number | null; isDay: boolean; score: number;
};

// 0-10: how good an hour is for the beach. Warm not scorching, small waves, little wind, no rain.
export const beachScore = (h: Omit<BeachHour, "score">) => {
  if (!h.isDay) return 0;
  let s = 10;
  const t = h.feels;
  if (t < 24) s -= Math.min(6, (24 - t) * 0.6);
  if (t > 32) s -= Math.min(4, (t - 32) * 0.5);
  if (h.wave != null) s -= h.wave > 1.5 ? 3.5 : h.wave > 1 ? 2 : h.wave > 0.6 ? 0.8 : 0;
  s -= h.wind > 35 ? 3.5 : h.wind > 25 ? 1.8 : h.wind > 18 ? 0.6 : 0;
  s -= h.rain >= 50 ? 4.5 : h.rain >= 25 ? 2 : h.rain >= 10 ? 0.5 : 0;
  s -= h.cloud > 85 ? 1.5 : h.cloud > 60 ? 0.5 : 0;
  if (h.sea != null) s -= h.sea < 18 ? 2.5 : h.sea < 21 ? 1 : 0;
  return Math.max(0, Math.min(10, Math.round(s * 10) / 10));
};

export const fetchBeachForecast = async (): Promise<BeachHour[]> => {
  const f = new URL("https://api.open-meteo.com/v1/forecast");
  f.searchParams.set("latitude", "32.08");
  f.searchParams.set("longitude", "34.766");
  f.searchParams.set("hourly", "temperature_2m,apparent_temperature,uv_index,wind_speed_10m,precipitation_probability,cloud_cover,is_day");
  f.searchParams.set("timezone", "Asia/Jerusalem");
  f.searchParams.set("forecast_days", "4");
  const m = new URL("https://marine-api.open-meteo.com/v1/marine");
  m.searchParams.set("latitude", "32.08");
  m.searchParams.set("longitude", String(34.766 + OFFSHORE_LON_SHIFT));
  m.searchParams.set("hourly", "wave_height,sea_surface_temperature");
  m.searchParams.set("timezone", "Asia/Jerusalem");
  m.searchParams.set("forecast_days", "4");
  const [w, s] = await Promise.all([getJSON<any>(f.toString()), getJSON<any>(m.toString()).catch(() => null)]);
  const H = w.hourly;
  const marine = new Map<string, [number | null, number | null]>(
    (s?.hourly?.time ?? []).map((t: string, i: number) => [t, [s.hourly.wave_height[i], s.hourly.sea_surface_temperature[i]]]),
  );
  return (H.time as string[]).map((time, i) => {
    const [wave, sea] = marine.get(time) ?? [null, null];
    const h = {
      time, temp: H.temperature_2m[i], feels: H.apparent_temperature[i], uv: H.uv_index[i] ?? 0,
      wind: H.wind_speed_10m[i], rain: H.precipitation_probability[i] ?? 0, cloud: H.cloud_cover[i] ?? 0,
      wave, sea, isDay: H.is_day[i] === 1,
    };
    return { ...h, score: beachScore(h) };
  });
};

/* ---------------- City static layers and jellyfish (nightly / two-hourly snapshots) ---------------- */

export type CityBeach = {
  name: string; station: number | null; at: [number, number]; accessible: boolean | null; showers: string | null;
  sport: boolean | null; playground: boolean | null; watersport: boolean | null; volleyball: boolean | null;
  cafe: boolean | null; lighting: boolean | null; parking: string | null; dogs: boolean | null;
};
export type CityData = {
  beaches?: CityBeach[];
  beachZones?: { type: "Feature"; geometry: unknown; properties: { beach: string | null; kind: string | null; what: string | null } }[];
  toilets?: { at: [number, number]; where: string | null; accessible: boolean | null; hours: string | null }[];
  dogParks?: { at: [number, number]; name: string | null; address: string | null; hours: string | null }[];
  shelters?: { at: [number, number]; id: number | null; kind: string | null; address: string | null; addressEn: string | null; note: string | null }[];
  naimLines?: { type: "Feature"; geometry: unknown; properties: { name: string | null; line: string | null; color: string | null } }[];
  naimStops?: { at: [number, number]; name: string | null; line: string | null; lines: string | null; code: number | null }[];
  taxiStands?: { at: [number, number]; name: string | null; where: string | null }[];
  shabbatShopping?: { name: string; at: [number, number] }[];
  culture?: { at: [number, number]; name: string; kind: string | null; address: string | null; phone: string | null; web: string | null; saturday: string | null }[];
};

export const fetchCityData = async (): Promise<CityData> => {
  const res = await fetch("/data/city.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`city ${res.status}`);
  return res.json();
};

export type JellyStatus = "none" | "few" | "fewStinging" | "many" | "mixed" | "manyStinging" | "stingingWater" | "unknown";
export type JellyRegion = { region: string; lat: number; lon: number; status: JellyStatus; sightings: number; summary: string; link: string };

export const fetchJellyfish = async (): Promise<{ updated: string | null; regions: JellyRegion[] }> => {
  const res = await fetch("/data/jellyfish.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`jellyfish ${res.status}`);
  return res.json();
};

/* ---------------- Upcoming Jewish and Israeli holidays (Hebcal) ---------------- */

export type Holiday = { date: string; title: string; yomtov: boolean; subcat: string; memo?: string };

export const fetchHolidays = async (lang: "en" | "he"): Promise<Holiday[]> => {
  const start = new Date();
  const end = new Date(Date.now() + 120 * 86400_000);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const u = new URL("https://www.hebcal.com/hebcal");
  for (const [k, v] of Object.entries({ v: "1", cfg: "json", maj: "on", min: "off", mod: "on", nx: "off", ss: "off", mf: "off", c: "off", i: "on", geo: "geoname", geonameid: String(HEBCAL_GEONAME_ID), lg: lang === "he" ? "he" : "s", start: ymd(start), end: ymd(end) })) u.searchParams.set(k, v);
  const j = await getJSON<any>(u.toString());
  return ((j.items ?? []) as any[])
    .filter((i) => i.category === "holiday")
    .map((i) => ({ date: i.date, title: i.title, yomtov: !!i.yomtov, subcat: i.subcat ?? "", memo: i.memo }));
};

/* ---------------- Cinema (snapshot every two hours) ---------------- */

export type Cinema = { id: string; name: string; nameEn: string; address: string; lat: number; lon: number; url: string };
export type Film = {
  id: string; title: string; poster: string | null; link: string; minutes: number | null; tags: string[]; trailer?: string | null;
  cinema: string; shows: { at: string; booking: string }[];
};

export const fetchCinema = async (): Promise<{ updated: string | null; cinemas: Cinema[]; films: Film[] }> => {
  const res = await fetch("/data/cinema.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`cinema ${res.status}`);
  return res.json();
};
