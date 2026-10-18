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

// Try the source directly from the browser; if that fails (CORS, network), go through
// our own Supabase edge function, which forwards only to an allow-list of open data hosts.
const getJSON = async <T,>(url: string, init?: { method?: "GET" | "POST"; body?: string; contentType?: string }): Promise<T> => {
  const requestInit: RequestInit | undefined = init?.method === "POST"
    ? { method: "POST", body: init.body, headers: { "Content-Type": init.contentType ?? "application/x-www-form-urlencoded" } }
    : undefined;
  try {
    return (await withTimeout(url, requestInit)) as T;
  } catch (direct) {
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
    holiday: items.find((i) => i.category === "holiday")?.title,
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
  lineRef: number; operatorRef: number; line?: string; to?: string; agency?: string;
};

type RouteInfo = { line?: string; to?: string; agency?: string };
const routeCache = new Map<number, RouteInfo>();

const lookupRoutes = async (lineRefs: number[]) => {
  const missing = lineRefs.filter((r) => !routeCache.has(r));
  if (!missing.length) return;
  const today = new Date().toISOString().slice(0, 10);
  // Batch to keep URLs short.
  for (let i = 0; i < missing.length; i += 120) {
    const chunk = missing.slice(i, i + 120);
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
        const dest = longName.split("<->")[1]?.replace(/-\d+#?$/, "").replace(/-/g, " · ").trim();
        routeCache.set(r.line_ref, { line: r.route_short_name ?? undefined, to: dest || undefined, agency: r.agency_name ?? undefined });
      }
    } catch { /* names are a nice-to-have; positions still show */ }
    for (const r of chunk) if (!routeCache.has(r)) routeCache.set(r, {});
  }
};

export const fetchBuses = async (): Promise<{ buses: Bus[]; newest: string | null }> => {
  const query = async (minutes: number) => {
    const u = new URL(`${STRIDE}/siri_vehicle_locations/list`);
    u.searchParams.set("recorded_at_time_from", new Date(Date.now() - minutes * 60000).toISOString());
    u.searchParams.set("lat__greater_or_equal", String(TLV_BBOX.south));
    u.searchParams.set("lat__lower_or_equal", String(TLV_BBOX.north));
    u.searchParams.set("lon__greater_or_equal", String(TLV_BBOX.west));
    u.searchParams.set("lon__lower_or_equal", String(TLV_BBOX.east));
    u.searchParams.set("order_by", "recorded_at_time desc");
    u.searchParams.set("limit", "5000");
    return getJSON<any[]>(u.toString());
  };
  // The public feed usually lags a few minutes behind real time; widen the window if it's empty.
  let rows = await query(8);
  if (!rows.length) rows = await query(30);

  const latest = new Map<string, Bus>();
  for (const r of rows) {
    const id = String(r.siri_ride__vehicle_ref ?? r.siri_ride__id ?? r.id);
    if (latest.has(id)) continue; // rows are newest-first
    latest.set(id, {
      id, lat: r.lat, lon: r.lon, bearing: r.bearing ?? 0, speed: r.velocity ?? 0, recordedAt: r.recorded_at_time,
      lineRef: r.siri_route__line_ref, operatorRef: r.siri_route__operator_ref,
    });
  }
  const buses = [...latest.values()];
  await lookupRoutes([...new Set(buses.map((b) => b.lineRef).filter(Boolean))]);
  for (const b of buses) Object.assign(b, routeCache.get(b.lineRef) ?? {});
  return { buses, newest: rows[0]?.recorded_at_time ?? null };
};

/* ---------------- Aircraft (adsb.lol, ODbL; OpenSky fallback) ---------------- */

export type Aircraft = { id: string; callsign: string; lat: number; lon: number; track: number; altFt: number | null; speedKt: number | null; type?: string };

export const fetchAircraft = async (): Promise<Aircraft[]> => {
  try {
    const j = await getJSON<any>(`https://api.adsb.lol/v2/lat/${TLV_CENTER.lat}/lon/${TLV_CENTER.lon}/dist/25`);
    return (j.ac ?? [])
      .filter((a: any) => typeof a.lat === "number" && typeof a.lon === "number")
      .map((a: any) => ({
        id: a.hex, callsign: (a.flight ?? a.r ?? a.hex ?? "").trim(), lat: a.lat, lon: a.lon,
        track: a.track ?? a.true_heading ?? 0,
        altFt: typeof a.alt_baro === "number" ? a.alt_baro : null,
        speedKt: a.gs ?? null, type: a.t,
      }));
  } catch {
    const u = new URL("https://opensky-network.org/api/states/all");
    u.searchParams.set("lamin", "31.85"); u.searchParams.set("lamax", "32.3");
    u.searchParams.set("lomin", "34.5"); u.searchParams.set("lomax", "35.1");
    const j = await getJSON<any>(u.toString());
    return (j.states ?? [])
      .filter((s: any[]) => s[5] != null && s[6] != null)
      .map((s: any[]) => ({
        id: s[0], callsign: (s[1] ?? s[0]).trim(), lon: s[5], lat: s[6], track: s[10] ?? 0,
        altFt: s[7] != null ? Math.round(s[7] * 3.281) : null,
        speedKt: s[9] != null ? Math.round(s[9] * 1.944) : null,
      }));
  }
};

/* ---------------- Places (OpenStreetMap via Overpass, ODbL) ---------------- */

export type Place = {
  id: string; name: string; nameEn?: string; kind: string; lat: number; lon: number;
  hours?: string; cuisine?: string; kosher?: string; vegan?: string; street?: string; number?: string;
};

const PLACES_CACHE_KEY = "radar.places.v1";
const PLACES_TTL_MS = 24 * 60 * 60 * 1000;

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

export const fetchPlaces = async (): Promise<Place[]> => {
  try {
    const cached = JSON.parse(localStorage.getItem(PLACES_CACHE_KEY) ?? "null");
    if (cached && Date.now() - cached.at < PLACES_TTL_MS && Array.isArray(cached.places)) return cached.places;
  } catch { /* storage unavailable */ }

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
