// Static city layers from the Tel Aviv-Yafo municipal map server (public ArcGIS REST):
// beaches and their facilities, beach zoning, public toilets, dog parks and public shelters.
// Writes public/data/city.json. Run nightly by .github/workflows/refresh-places.yml.
import { mkdir, writeFile } from "node:fs/promises";

const GIS = "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer";
const UA = "Mozilla/5.0 (compatible; TLV-Radar/1.0; free public city guide)";

const query = async (layer, fields = "*") => {
  const u = `${GIS}/${layer}/query?where=1%3D1&outFields=${encodeURIComponent(fields)}&outSR=4326&f=json`;
  const res = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`layer ${layer}: ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(`layer ${layer}: ${j.error.message}`);
  return j.features ?? [];
};

const round = (n) => Math.round(n * 1e5) / 1e5;
const centroid = (rings) => {
  const pts = rings.flat();
  return [round(pts.reduce((s, p) => s + p[0], 0) / pts.length), round(pts.reduce((s, p) => s + p[1], 0) / pts.length)];
};
const txt = (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() || null : v ?? null);
const yes = (v) => (typeof v === "string" ? (/^יש|כן/.test(v.trim()) ? true : /^אין|לא/.test(v.trim()) ? false : null) : null);
const pointOf = (f) => (f.geometry?.x != null ? [round(f.geometry.x), round(f.geometry.y)] : f.geometry?.rings ? centroid(f.geometry.rings) : null);

const out = { source: "City of Tel Aviv-Yafo open GIS", updated: new Date().toISOString() };
const report = [];

const step = async (name, fn) => {
  try {
    out[name] = await fn();
    report.push(`${name}: ${out[name].length ?? Object.keys(out[name]).length}`);
  } catch (e) {
    report.push(`${name}: FAILED ${e}`);
    console.log(`::warning::${name} failed: ${String(e).slice(0, 200)}`);
  }
};

await step("beaches", async () => (await query(579)).map((f) => {
  const a = f.attributes;
  return {
    name: txt(a.beach_name), station: a.station_num ?? null, at: pointOf(f),
    accessible: /נגיש/.test(a.accessibility_desc ?? "") || null,
    showers: txt(a.showers_desc), sport: yes(a.sport_facilities), playground: yes(a.playground),
    watersport: yes(a.water_sport), volleyball: yes(a.beach_volleyball), cafe: yes(a.cafeteria),
    lighting: yes(a.Lighting), parking: txt(a.Parking), dogs: yes(a.Dogs_allowed),
  };
}).filter((b) => b.at));

await step("beachZones", async () => (await query(968)).filter((f) => f.geometry?.rings).map((f) => ({
  type: "Feature",
  geometry: { type: "Polygon", coordinates: f.geometry.rings.map((r) => r.map(([x, y]) => [round(x), round(y)])) },
  properties: { beach: txt(f.attributes.shem_hof), kind: txt(f.attributes.sug_hof), what: txt(f.attributes.mahut), note: txt(f.attributes.hearot) },
})));

await step("toilets", async () => (await query(662)).map((f) => {
  const a = f.attributes;
  return { at: pointOf(f), where: txt(a.mekum), accessible: /נגיש|כן/.test(a.t_negishut ?? "") || null, hours: txt(a.shout_pticha) };
}).filter((t) => t.at));

await step("dogParks", async () => (await query(586)).map((f) => {
  const a = f.attributes;
  return { at: pointOf(f), name: txt(a.shem_gina), address: txt(a.Full_Address), hours: txt(a.shaot) };
}).filter((d) => d.at));

await step("shelters", async () => (await query(592, "ms_miklat,t_sug,Full_Address,shem_rechov_eng,ms_bait,hearot,t_sinon")).map((f) => {
  const a = f.attributes;
  return { at: pointOf(f), id: a.ms_miklat ?? null, kind: txt(a.t_sug), address: txt(a.Full_Address), addressEn: a.shem_rechov_eng ? `${txt(a.shem_rechov_eng)} ${a.ms_bait ?? ""}`.trim() : null, note: txt(a.hearot) };
}).filter((s) => s.at));

console.log(`::notice::city layers: ${report.join(" · ")}`);
if (!out.beaches && !out.shelters) process.exit(1);

await mkdir("public/data", { recursive: true });
await writeFile("public/data/city.json", JSON.stringify(out) + "\n");
console.log("Wrote public/data/city.json");
