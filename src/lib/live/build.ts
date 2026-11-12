// "What's being built near me?" Everything here comes live from the City of Tel Aviv-Yafo's
// public map service, which the city refreshes every night: building permit requests and permits,
// active building sites, night works, road works, dangerous buildings and town plans.

const GIS = "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer";

export type Geo = { type: "Point" | "Polygon" | "MultiLineString"; coordinates: any };

const q = async (layer: number, params: Record<string, string>) => {
  const u = new URL(`${GIS}/${layer}/query`);
  for (const [k, v] of Object.entries({ f: "json", outSR: "4326", ...params })) u.searchParams.set(k, v);
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`city map ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message ?? "city map error");
  return (j.features ?? []) as { attributes: Record<string, any>; geometry?: any }[];
};
const esc = (s: string) => s.replace(/'/g, "''");

/* ---------------- addresses ---------------- */

export type Address = { label: string; labelEn?: string; street: string; streetEn?: string; number?: number; lat: number; lon: number; gush?: number; chelka?: number };

const title = (s?: string) => s?.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_m, p, c) => p + c.toUpperCase());
const toAddress = (a: Record<string, any>): Address => ({
  label: String(a.t_ktovet_melea ?? "").trim(),
  labelEn: a.t_rechov_eng ? `${title(a.t_rechov_eng)} ${String(a.t_bayit_veknisa ?? a.ms_bayit ?? "").trim()}`.trim() : undefined,
  street: a.t_rechov, streetEn: title(a.t_rechov_eng) ?? undefined, number: a.ms_bayit ?? undefined,
  lat: a.lat, lon: a.lon, gush: a.ms_gush ?? undefined, chelka: a.ms_chelka ?? undefined,
});
const ADDR_FIELDS = "t_ktovet_melea,t_rechov,t_rechov_eng,ms_bayit,t_bayit_veknisa,lat,lon,ms_gush,ms_chelka";

/** Autocomplete: "דיזנגוף 100", "Dizengoff 100", or just a street name. */
export const searchAddresses = async (input: string): Promise<Address[]> => {
  const text = input.trim().replace(/[,"״׳]/g, " ").replace(/\s+/g, " ");
  if (text.length < 2) return [];
  const m = /^(.*?)\s*(\d+)\s*([א-תa-z])?$/i.exec(text);
  const street = (m ? m[1] : text).replace(/^(רחוב|רח'|שדרות|שד'|דרך)\s+/, "").trim();
  const num = m ? Number(m[2]) : null;
  if (!street) return [];
  const he = /[א-ת]/.test(street);
  const like = he ? `t_rechov LIKE '%${esc(street)}%'` : `UPPER(t_rechov_eng) LIKE '%${esc(street.toUpperCase())}%'`;
  const where = num != null ? `${like} AND ms_bayit = ${num}` : like;
  const rows = await q(527, { where, outFields: ADDR_FIELDS, returnGeometry: "false", resultRecordCount: "40", orderByFields: "t_rechov,ms_bayit" });
  // One result per street when no number was typed, so the list shows streets.
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const r of rows) {
    const a = toAddress(r.attributes);
    const key = num != null ? a.label : a.street;
    if (!a.lat || seen.has(key)) continue;
    seen.add(key);
    out.push(num != null ? a : { ...a, label: a.street, labelEn: a.streetEn, number: undefined });
  }
  return out.slice(0, 8);
};

/** The closest building address to a point (for "use my location" and map links). */
export const nearestAddress = async (lat: number, lon: number): Promise<Address | null> => {
  const rows = await q(527, {
    geometry: `${lon},${lat}`, geometryType: "esriGeometryPoint", inSR: "4326", spatialRel: "esriSpatialRelIntersects",
    distance: "60", units: "esriSRUnit_Meter", outFields: ADDR_FIELDS, returnGeometry: "false", resultRecordCount: "30",
  });
  const list = rows.map((r) => toAddress(r.attributes)).filter((a) => a.lat);
  list.sort((a, b) => dist({ lat, lon }, a) - dist({ lat, lon }, b));
  return list[0] ?? null;
};

/** A point somewhere along a street (for listings that only name the street). */
export const streetPoint = async (street: string): Promise<Address | null> => {
  const rows = await q(527, { where: `t_rechov = '${esc(street)}'`, outFields: ADDR_FIELDS, returnGeometry: "false", orderByFields: "ms_bayit", resultRecordCount: "400" });
  if (!rows.length) return null;
  const a = toAddress(rows[Math.floor(rows.length / 2)].attributes);
  return { ...a, label: a.street, labelEn: a.streetEn, number: undefined };
};

let streetCache: Promise<{ he: string; en?: string }[]> | null = null;
/** Every street name in the city, Hebrew and English, for reading addresses out of listing text. */
export const streetNames = () =>
  (streetCache ??= (async () => {
    // The service returns at most ~1,000 rows per call, so page through the distinct names.
    const all: { he: string; en?: string }[] = [];
    for (let off = 0; off < 6000; off += 1000) {
      const rows = await q(527, { where: "1=1", outFields: "t_rechov,t_rechov_eng", returnDistinctValues: "true", returnGeometry: "false", orderByFields: "t_rechov", resultOffset: String(off), resultRecordCount: "1000" });
      all.push(...rows.map((r) => ({ he: String(r.attributes.t_rechov ?? "").trim(), en: title(r.attributes.t_rechov_eng?.trim()) || undefined })));
      if (rows.length < 1000) break;
    }
    return all.filter((x, i, l) => x.he.length > 1 && l.findIndex((y) => y.he === x.he) === i);
  })());

/* ---------------- reading a pasted link or listing text ---------------- */

export type Resolved =
  | { kind: "point"; lat: number; lon: number; label?: string }
  | { kind: "street"; street: string; number?: number }
  | { kind: "link-only"; site: "facebook" | "yad2" | "madlan" | "other" }
  | { kind: "none" };

const SITE = (u: string): "facebook" | "yad2" | "madlan" | "other" =>
  /facebook\.com|fb\.(com|me|watch)/i.test(u) ? "facebook" : /yad2\.co\.il/i.test(u) ? "yad2" : /madlan\.co\.il/i.test(u) ? "madlan" : "other";

/**
 * Work out a place from whatever was pasted: a Google Maps or Waze link (coordinates are in the URL),
 * or the text of a listing that names the street. Facebook and Yad2 links on their own don't contain
 * an address, and those sites don't let other websites read their pages, so we ask for the text then.
 */
export const resolveInput = async (raw: string): Promise<Resolved> => {
  const text = raw.trim();
  const url = /https?:\/\/\S+/i.exec(text)?.[0];
  if (url) {
    const dec = decodeURIComponent(url);
    const at = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(dec) ?? /[?&](?:q|ll|query|destination|center)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(dec) ?? /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(dec);
    if (at) return { kind: "point", lat: Number(at[1]), lon: Number(at[2]) };
    const waze = /ll=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i.exec(url);
    if (waze) return { kind: "point", lat: Number(waze[1]), lon: Number(waze[2]) };
  }
  const body = url ? text.replace(url, " ") : text;
  if (body.trim().length >= 3) {
    const names = await streetNames();
    const he = body.replace(/[״"׳']/g, "");
    // Longest street name found in the text wins ("בן יהודה" before "יהודה").
    let best: { he: string; idx: number; len: number } | null = null;
    for (const s of names) {
      const n = s.he.replace(/[״"׳']/g, "");
      if (n.length < 3) continue;
      let i = he.indexOf(n);
      let len = n.length;
      if (i < 0 && s.en) { i = body.toLowerCase().indexOf(s.en.toLowerCase()); len = s.en.length; }
      if (i >= 0 && (!best || len > best.len)) best = { he: s.he, idx: i, len };
    }
    if (best) {
      const after = (he.slice(best.idx + best.len, best.idx + best.len + 8).match(/^\s*(\d{1,3})(?!\d)/) ?? body.slice(best.idx + best.len, best.idx + best.len + 8).match(/^\s*(\d{1,3})(?!\d)/));
      return { kind: "street", street: best.he, number: after ? Number(after[1]) : undefined };
    }
  }
  if (url) return { kind: "link-only", site: SITE(url) };
  return { kind: "none" };
};

/* ---------------- what's happening around a point ---------------- */

export type ActivityKind = "permit" | "site" | "night" | "road" | "rail" | "business" | "zone" | "danger" | "plan";
export type Activity = {
  id: string; kind: ActivityKind; title: string; address?: string; stage?: string; detail?: string;
  units?: number; tama38?: boolean; start?: number; end?: number; opened?: number; hours?: string;
  url?: string; distance: number; lat: number; lon: number; geometry?: Geo; progress?: number;
  permitted?: number; expires?: number;
};

const dist = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const dx = (a.lon - b.lon) * 111320 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const dy = (a.lat - b.lat) * 110540;
  return Math.hypot(dx, dy);
};

// ArcGIS geometry → GeoJSON, plus a representative point for distances and pins.
const toGeo = (g: any): { geometry?: Geo; lat?: number; lon?: number } => {
  if (!g) return {};
  if (g.x != null) return { geometry: { type: "Point", coordinates: [g.x, g.y] }, lon: g.x, lat: g.y };
  const pts: number[][] = g.rings ? g.rings.flat() : g.paths ? g.paths.flat() : [];
  if (!pts.length) return {};
  const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const geometry: Geo = g.rings ? { type: "Polygon", coordinates: g.rings } : { type: "MultiLineString", coordinates: g.paths };
  return { geometry, lat, lon };
};

// City dates come either as epoch milliseconds or "dd/mm/yyyy".
const date = (v: unknown): number | undefined => {
  if (typeof v === "number" && v > 0) return v;
  if (typeof v === "string") {
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v);
    if (m) return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }
  return undefined;
};
const clean = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").replace(/\s*,\s*$/, "").trim() || undefined : undefined);

/** Everything around a point, or (with `street`) everything the city lists on one street. */
export const fetchActivity = async (lat: number, lon: number, radius: number, street?: string): Promise<Activity[]> => {
  const around = {
    geometry: `${lon},${lat}`, geometryType: "esriGeometryPoint", inSR: "4326", spatialRel: "esriSpatialRelIntersects",
    distance: String(radius), units: "esriSRUnit_Meter", returnGeometry: "true",
  };
  const here = { lat, lon };
  const settle = async <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
  // Street mode: match on the address text instead of distance; area-only layers are skipped.
  const on = (field: string) => (street ? { where: `${field} LIKE '%${esc(street)}%'`, returnGeometry: "true" } : around);
  const none = Promise.resolve([] as { attributes: Record<string, any>; geometry?: any }[]);
  const [permits, sites, nights, roads, danger, plans, publicNights, railRoute, railStops, railYards, businesses, zones] = await Promise.all([
    settle(q(772, { ...on("addresses"), outFields: "oid_permit,request_num,open_request,permission_date,expiry_date,tr_hathalat_bniya,sug_bakasha,tochen_bakasha,building_stage,koteret,progress,yechidot_diyur,addresses,sw_tama_38,url_hadmaya,finished,occupation", resultRecordCount: "300" })),
    settle(q(499, { ...on("ktovet"), outFields: "oid_site,tik_tipul,ktovet,matzav_bniya,status_pikuach,tr_tchilat_avoda,sug_bakasha,tochen_bakasha,shimush,heterim,ishurei_laila", resultRecordCount: "200" })),
    settle(q(479, { ...on("ktovet"), outFields: "oid_avoda,tik_tipul,mahut,tr_hatchala,tr_siyum,shaot_between,ktovet", resultRecordCount: "100" })),
    settle(q(852, { ...on("t_ktovet"), outFields: "OBJECTID,GlobalID,t_ktovet,mahut_avoda,sivug_yom_layla,tzimtzum_netivim,commnets,time_start,time_end,date_start,date_end,kablan_name", resultRecordCount: "100" })),
    settle(q(591, { ...on("t_ktovet"), outFields: "oid_mivne,t_ktovet,t_tzav", resultRecordCount: "100" })),
    street ? none : settle(q(528, { ...around, distance: "0", outFields: "id_taba,taba,shem_taba,t_status,t_status_klali,t_hekef,tr_matan_tokef,tr_hafkada,url_documents,sw_hitchadshut_ironit", resultRecordCount: "60" })),
    // Night works in the street itself (utilities, roads), separate from building sites.
    settle(q(858, { ...(street ? { where: `t_rechov = '${esc(street)}'`, returnGeometry: "true" } : around), outFields: "OBJECTID,k_avodot_laila_shura,t_rechov,t_rechov_me,t_rechov_ad,tr_avodat_laila_me,tr_avodat_laila_ad,taarichim_shaot,gorem_yozem_rishayon", resultRecordCount: "60" })),
    // Light rail: Green and Purple line routes being built, their stations and work compounds.
    street ? none : Promise.all([settle(q(761, { ...around, outFields: "*", resultRecordCount: "20" })), settle(q(762, { ...around, outFields: "*", resultRecordCount: "20" }))]).then((x) => x.flat()),
    street ? none : Promise.all([settle(q(764, { ...around, outFields: "*", resultRecordCount: "10" })), settle(q(766, { ...around, outFields: "*", resultRecordCount: "10" }))]).then((x) => x.flat()),
    street ? none : settle(q(633, { ...around, outFields: "*", resultRecordCount: "10" })),
    // Businesses licensed in the last year (a new bar downstairs can be louder than a building site).
    settle(q(964, { ...(street ? { where: `shem_rechov = '${esc(street)}'`, returnGeometry: "true" } : around), outFields: "*", orderByFields: "taarich_kabalat_rishayon DESC", resultRecordCount: "80" })),
    // Nightlife policy zones: where venues may stay open late.
    street ? none : settle(q(575, { ...around, distance: "0", outFields: "OBJECTID,shem,t_sug", resultRecordCount: "5" })),
  ]);
  const out: Activity[] = [];
  const add = (a: Omit<Activity, "distance" | "lat" | "lon">, g: any) => {
    const geo = toGeo(g);
    if (geo.lat == null || geo.lon == null) return;
    // For lines (roads, rail routes) the nearest vertex is the honest distance, not the midpoint.
    const pts: number[][] = g?.paths ? g.paths.flat() : [];
    let best = { lat: geo.lat, lon: geo.lon, d: pts.length ? Infinity : dist(here, { lat: geo.lat, lon: geo.lon }) };
    for (const p of pts) { const d = dist(here, { lat: p[1], lon: p[0] }); if (d < best.d) best = { lat: p[1], lon: p[0], d }; }
    out.push({ ...a, geometry: geo.geometry, lat: best.lat, lon: best.lon, distance: Math.round(best.d) });
  };
  for (const f of permits) {
    const a = f.attributes;
    add({
      id: `permit-${a.request_num ?? a.oid_permit}`, kind: "permit", title: clean(a.sug_bakasha) ?? "בקשה להיתר בניה",
      address: clean(a.addresses)?.split(",").filter((x, i, l) => l.indexOf(x) === i).join(", "), stage: clean(a.building_stage),
      detail: clean(a.tochen_bakasha), units: a.yechidot_diyur || undefined, tama38: a.sw_tama_38 === "כן",
      opened: date(a.open_request), start: date(a.tr_hathalat_bniya), permitted: date(a.permission_date), expires: date(a.expiry_date),
      url: clean(a.url_hadmaya), progress: a.progress ?? undefined,
    }, f.geometry);
  }
  for (const f of sites) {
    const a = f.attributes;
    add({
      id: `site-${a.tik_tipul ?? a.oid_site}`, kind: "site", title: clean(a.sug_bakasha)?.split(",")[0] ?? "אתר בניה",
      address: clean(a.ktovet), stage: clean(a.matzav_bniya) ?? clean(a.status_pikuach), detail: clean(a.tochen_bakasha),
      start: date(a.tr_tchilat_avoda), hours: a.ishurei_laila ? "אישור לעבודת לילה" : undefined,
    }, f.geometry);
  }
  for (const f of nights) {
    const a = f.attributes;
    add({ id: `night-${a.tik_tipul ?? "x"}-${a.oid_avoda}`, kind: "night", title: clean(a.mahut) ?? "עבודות לילה", address: clean(a.ktovet), start: date(a.tr_hatchala), end: date(a.tr_siyum), hours: clean(a.shaot_between) }, f.geometry);
  }
  for (const f of roads) {
    const a = f.attributes;
    add({
      id: `road-${(a.GlobalID ?? String(a.OBJECTID)).replace(/[{}]/g, "")}`, kind: "road", title: clean(a.mahut_avoda) ?? "עבודות כביש", address: clean(a.t_ktovet),
      stage: clean(a.tzimtzum_netivim), detail: clean(a.commnets), start: date(a.date_start), end: date(a.date_end),
      hours: a.time_start && a.time_end ? `${a.time_start}–${a.time_end}${a.sivug_yom_layla ? ` (${a.sivug_yom_layla})` : ""}` : clean(a.sivug_yom_layla),
    }, f.geometry);
  }
  for (const f of danger) {
    const a = f.attributes;
    add({ id: `danger-${a.oid_mivne}`, kind: "danger", title: "מבנה מסוכן", address: clean(a.t_ktovet), stage: clean(a.t_tzav) }, f.geometry);
  }
  for (const f of publicNights) {
    const a = f.attributes;
    const where = [a.t_rechov, a.t_rechov_me && a.t_rechov_ad ? `(${a.t_rechov_me}–${a.t_rechov_ad})` : ""].filter(Boolean).join(" ");
    add({
      id: `pnight-${a.k_avodot_laila_shura ?? a.OBJECTID}`, kind: "night", title: `עבודות לילה ברחוב${a.gorem_yozem_rishayon ? ` – ${clean(a.gorem_yozem_rishayon)}` : ""}`,
      address: clean(where), start: date(a.tr_avodat_laila_me), end: date(a.tr_avodat_laila_ad), hours: clean(a.taarichim_shaot)?.split(",").pop()?.trim(),
    }, f.geometry);
  }
  for (const f of railRoute) {
    const a = f.attributes;
    const line = /סגול|purple/i.test(JSON.stringify(a)) ? "סגול" : "ירוק";
    add({ id: `rail-${line}-${a.oid ?? a.OBJECTID}`, kind: "rail", title: `הקו ה${line} של הרכבת הקלה`, detail: clean(a.mikta_teor), stage: clean(a.plan_name) }, f.geometry);
  }
  for (const f of railStops) {
    const a = f.attributes;
    const line = /סגול|purple/i.test(JSON.stringify(a)) ? "סגול" : "ירוק";
    add({ id: `railstop-${line}-${a.oid ?? a.OBJECTID}`, kind: "rail", title: `תחנת ${clean(a.station_name_HEB) ?? ""} – הקו ה${line}`, address: clean(a.station_name_ENG), stage: clean(a.type) }, f.geometry);
  }
  for (const f of railYards) {
    add({ id: `railyard-${f.attributes.oid ?? f.attributes.OBJECTID}`, kind: "rail", title: "שטח התארגנות של הרכבת הקלה", detail: "מתחם עבודה ואחסון לבניית הרכבת הקלה" }, f.geometry);
  }
  const yearAgo = Date.now() - 365 * 864e5;
  for (const f of businesses) {
    const a = f.attributes;
    const m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(a.taarich_kabalat_rishayon ?? ""));
    const got = typeof a.taarich_kabalat_rishayon === "number" ? a.taarich_kabalat_rishayon : m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : undefined;
    if (!got || got < yearAgo) continue;
    add({
      id: `biz-${a.oid_rishayon ?? a.OBJECTID}`, kind: "business", title: clean(a.t_shem_esek) ?? clean(a.t_hesber_mahut_esek)?.slice(0, 60) ?? "עסק חדש",
      detail: clean(a.t_hesber_mahut_esek), address: [clean(a.shem_rechov), a.ms_bayit].filter(Boolean).join(" ") || undefined,
      opened: got,
    }, f.geometry);
  }
  for (const f of zones) {
    const a = f.attributes;
    add({ id: `zone-${a.OBJECTID}`, kind: "zone", title: `אזור בילוי${a.shem ? `: ${clean(a.shem)}` : ""}`, stage: clean(a.t_sug) }, { x: lon, y: lat });
  }
  for (const f of plans) {
    const a = f.attributes;
    // Only plans still alive: approved, in deposit or in progress (not cancelled or shelved).
    // City-wide plans cover every address, so they say nothing about this one.
    if (/מבוטל|גנוז|נדחת/.test(`${a.t_status_klali} ${a.t_status}`) || /כלל עירונית/.test(a.t_hekef ?? "")) continue;
    add({
      id: `plan-${a.id_taba}`, kind: "plan", title: clean(a.shem_taba) ?? clean(a.taba) ?? "תכנית בניין עיר",
      stage: clean(a.t_status), start: date(a.tr_hafkada), end: date(a.tr_matan_tokef), url: clean(a.url_documents),
      tama38: !!a.sw_hitchadshut_ironit,
    }, f.geometry);
  }
  if (street) {
    // LIKE also matches longer names ("הרצל" in "הרצליה"), so keep only real matches on this street.
    const onStreet = (a: Activity) => !a.address || streetsIn(a.address).includes(street) || (a.kind === "road" && a.address.includes(street)) || a.id.startsWith("pnight-") || a.id.startsWith("biz-");
    // Distance from the middle of a long street means nothing; score everything as "on the street".
    return out.filter(onStreet).map((a) => ({ ...a, distance: 60 })).sort((a, b) => (houseNo(a.address, street) ?? 9999) - (houseNo(b.address, street) ?? 9999));
  }
  return out.sort((a, b) => a.distance - b.distance);
};

/** Street names in a city address text like "דיזנגוף 100, דיזנגוף 102א". */
export const streetsIn = (address: string) =>
  [...new Set(address.split(",").map((p) => p.replace(/\s+/g, " ").trim().replace(/\s+\d+\s*[א-ת]?$/, "").trim()).filter(Boolean))];
/** The house number on a given street in an address text, for sorting. */
export const houseNo = (address: string | undefined, street: string) => {
  if (!address) return undefined;
  for (const p of address.split(",")) {
    const m = /^(.*?)\s+(\d+)\s*[א-ת]?$/.exec(p.replace(/\s+/g, " ").trim());
    if (m && m[1] === street) return Number(m[2]);
  }
  return undefined;
};

/** Is a permit item still "live" (in process, approved recently, or building), rather than long finished? */
export const isLive = (a: Activity) => {
  // Street night-work approvals have exact dates: once they've passed, they're over.
  if (a.id.startsWith("pnight-")) return !a.end || a.end > Date.now() - 864e5;
  if (a.kind !== "permit") return a.kind !== "plan" || !a.end || a.end > Date.now() - 3 * 365 * 864e5;
  if (/תעודת גמר|אכלוס|בוטל|נסגר/.test(a.stage ?? "")) return false;
  return (a.opened ?? 0) > Date.now() - 6 * 365 * 864e5;
};

/* ---------------- English for the city's Hebrew labels ---------------- */

const STAGE_EN: [RegExp, string][] = [
  [/בתהליך היתר/, "Permit requested, under review"],
  [/קיים היתר/, "Permit granted"],
  [/בבניה/, "Under construction"],
  [/תעודת גמר/, "Completed"],
  [/אכלוס/, "Completed and occupied"],
  [/תחילת עבודות/, "Works started"],
  [/גמר יסודות/, "Foundations finished"],
  [/שלד/, "Frame going up"],
  [/גמר/, "Finishing"],
  [/בתוקף/, "In force"],
  [/הפקדה|הופקדה/, "Deposited for objections"],
  [/בהכנה|בתכנון/, "Being prepared"],
  [/חסימה הרמטית/, "Road fully closed"],
  [/צמצום/, "Lanes reduced"],
  [/צו 3/, "Order: private engineer's inspection required"],
  [/עד 1:00/, "Venues may open until 1:00"],
  [/עד 2:00/, "Venues may open until 2:00"],
  [/עד 3:00|ללא הגבלה/, "Venues may open late"],
  [/^עילית$/, "Street-level station"],
  [/^תחתית$|תת.?קרקעית/, "Underground station"],
  [/צו/, "Safety order issued"],
];
export const stageEn = (s?: string) => (s ? STAGE_EN.find(([re]) => re.test(s))?.[1] ?? s : undefined);

const TYPE_EN: [RegExp, string][] = [
  [/עבודות לילה ברחוב/, "Street night works"],
  [/תחנת .*הקו הירוק/, "Light rail station, Green Line"],
  [/תחנת .*הקו הסגול/, "Light rail station, Purple Line"],
  [/הקו הירוק/, "Light rail Green Line (under construction)"],
  [/הקו הסגול/, "Light rail Purple Line (under construction)"],
  [/שטח התארגנות/, "Light rail works compound"],
  [/אזור בילוי/, "Nightlife zone"],
  [/תמ"א ?38|תמא 38/, "TAMA 38 (strengthening and adding floors)"],
  [/בניה חדשה.*מגורים גבוה|בניין מגורים גבוה/, "New high-rise residential building"],
  [/בניה חדשה.*מגורים/, "New residential building"],
  [/בניה חדשה/, "New building"],
  [/הריסה/, "Demolition"],
  [/תוספות בניה|תוספת/, "Additions to an existing building"],
  [/שימוש חורג/, "Change of use"],
  [/שינויים/, "Alterations"],
  [/הארכת תוקף/, "Permit extension"],
  [/מנוף/, "Crane work"],
  [/יציקה/, "Concrete pouring"],
  [/עבודות לילה/, "Night works"],
  [/תשתית|ביוב|מים|חשמל|תקשורת/, "Utility works"],
  [/כביש|סלילה|ריבוד/, "Road works"],
  [/מבנה מסוכן/, "Dangerous building"],
];
export const typeEn = (s?: string) => (s ? TYPE_EN.find(([re]) => re.test(s))?.[1] ?? s : undefined);

/** City-wide totals for the home page. */
export const fetchCityBuildCounts = async () => {
  const count = async (layer: number, where = "1=1") => {
    const u = `${GIS}/${layer}/query?where=${encodeURIComponent(where)}&returnCountOnly=true&f=json`;
    const j = await (await fetch(u)).json();
    return typeof j.count === "number" ? j.count : null;
  };
  const [review, building, sites, nights, roads] = await Promise.all([
    count(772, "building_stage = 'בתהליך היתר'").catch(() => null),
    count(772, "building_stage = 'בבניה' OR building_stage = 'קיים היתר'").catch(() => null),
    count(499).catch(() => null),
    count(479).catch(() => null),
    count(852).catch(() => null),
  ]);
  return { review, building, sites, nights, roads };
};

/* ---------------- English addresses ---------------- */

/** "רחוב דיזנגוף מס' 98, אסתר המלכה 2" → "Meir Dizengoff 98, Ester Hamalka 2", using the city's own street names. */
export const addressEn = (he: string | undefined, streets: { he: string; en?: string }[] | undefined) => {
  if (!he || !streets?.length) return undefined;
  const norm = (x: string) => x.replace(/["״׳']/g, "").replace(/\s+/g, " ").trim();
  const parts = he.split(",").map((p) => norm(p.replace(/^\s*(רחוב|רח'|שדרות|שד'|דרך)\s+/, "").replace(/מס'\s*/g, "")));
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    let best: { he: string; en?: string } | undefined;
    for (const s of streets) {
      const n = norm(s.he);
      if (s.en && p.startsWith(n) && (!best || n.length > norm(best.he).length)) best = s;
    }
    out.push(best ? `${best.en}${p.slice(norm(best.he).length)}` : p);
  }
  const res = [...new Set(out)].join(", ");
  return /[א-ת]/.test(res) ? undefined : res;
};
