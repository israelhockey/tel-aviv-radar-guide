// Weekly: every street in Tel Aviv-Yafo from the city's address layer, with its English name,
// a centre point and its range of house numbers. Used for the street pages.
//   public/data/streets.json
import { writeFile } from "node:fs/promises";

const GIS = "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/527/query";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const page = async (offset) => {
  const u = `${GIS}?where=1%3D1&outFields=t_rechov,t_rechov_eng,ms_bayit,lat,lon&returnGeometry=false&orderByFields=t_rechov,ms_bayit,lat&resultOffset=${offset}&resultRecordCount=1000&f=json`;
  for (let a = 0; a < 3; a++) {
    try {
      const j = await (await fetch(u, { headers: { "user-agent": "DiscoverTelAviv/1.0" } })).json();
      if (j.error) throw new Error(j.error.message);
      return j;
    } catch (e) { if (a === 2) throw e; await sleep(2000 * (a + 1)); }
  }
};
const title = (s) => s.toLowerCase().replace(/(^|[\s\-(])([a-z])/g, (m, p, c) => p + c.toUpperCase()).replace(/\s+/g, " ").trim();
const by = new Map();
const seen = new Set();
for (let off = 0; off < 80000; off += 1000) {
  const j = await page(off);
  for (const f of j.features ?? []) {
    const a = f.attributes;
    const he = (a.t_rechov ?? "").replace(/\s+/g, " ").trim();
    if (!he || !a.lat || !a.lon) continue;
    const k = `${he}|${a.ms_bayit}|${a.lat}|${a.lon}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const s = by.get(he) ?? { he, en: a.t_rechov_eng ? title(a.t_rechov_eng) : undefined, lat: 0, lon: 0, n: 0, min: Infinity, max: 0 };
    s.lat += a.lat; s.lon += a.lon; s.n++;
    if (a.ms_bayit) { s.min = Math.min(s.min, a.ms_bayit); s.max = Math.max(s.max, a.ms_bayit); }
    by.set(he, s);
  }
  if (!j.exceededTransferLimit && (j.features ?? []).length < 1000) break;
  await sleep(250);
}
const streets = [...by.values()].map((s) => ({
  he: s.he, en: s.en, lat: Math.round((s.lat / s.n) * 1e5) / 1e5, lon: Math.round((s.lon / s.n) * 1e5) / 1e5, n: s.n,
  ...(s.max ? { min: s.min, max: s.max } : {}),
})).sort((a, b) => b.n - a.n);
if (streets.length < 500) { console.log(`::error::only ${streets.length} streets`); process.exit(1); }
await writeFile("public/data/streets.json", JSON.stringify({ updated: new Date().toISOString(), streets }));
console.log(`::notice::streets: ${streets.length}`);
