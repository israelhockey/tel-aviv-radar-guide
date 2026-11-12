// Nightly: snapshot every building permit, building site, night work and road work the city publishes,
// compare with yesterday's snapshot, and record what's new or has moved to a new stage.
//   data/build-snapshot.json        full snapshot (kept in the repo, not served to the site)
//   public/data/build-changes.json  the last 45 days of changes, for the site's "new near you" lists
//                                   and, later, the email alerts.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const GIS = "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const page = async (layer, fields, offset) => {
  const u = `${GIS}/${layer}/query?where=1%3D1&outFields=${fields}&returnGeometry=true&outSR=4326&geometryPrecision=5&orderByFields=${fields.split(",")[0]}&resultOffset=${offset}&resultRecordCount=1000&f=json`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(u, { headers: { "user-agent": "DiscoverTelAviv/1.0 (+https://tel-aviv-radar-guide.lovable.app)" } });
      const j = await res.json();
      if (j.error) throw new Error(j.error.message);
      return j;
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(2000 * (attempt + 1));
    }
  }
};
const all = async (layer, fields) => {
  const out = [];
  for (let off = 0; off < 40000; off += 1000) {
    const j = await page(layer, fields, off);
    out.push(...(j.features ?? []));
    if (!j.exceededTransferLimit && (j.features ?? []).length < 1000) break;
    await sleep(300);
  }
  return out;
};
const centre = (g) => {
  if (!g) return null;
  if (g.x != null) return [g.y, g.x];
  const pts = g.rings ? g.rings.flat() : g.paths ? g.paths.flat() : [];
  if (!pts.length) return null;
  return [pts.reduce((s, p) => s + p[1], 0) / pts.length, pts.reduce((s, p) => s + p[0], 0) / pts.length].map((v) => Math.round(v * 1e5) / 1e5);
};
const clean = (s) => (typeof s === "string" ? s.replace(/\s+/g, " ").replace(/\s*,\s*$/, "").trim() || undefined : undefined);

const LAYERS = [
  { kind: "permit", layer: 772, fields: "oid_permit,request_num,building_stage,sug_bakasha,addresses,yechidot_diyur,sw_tama_38,open_request",
    map: (a) => ({ key: `permit-${a.request_num ?? a.oid_permit}`, stage: clean(a.building_stage), title: clean(a.sug_bakasha), address: clean(a.addresses)?.split(",").filter((x, i, l) => l.indexOf(x) === i).join(", "), units: a.yechidot_diyur || undefined, tama38: a.sw_tama_38 === "כן" || undefined, opened: a.open_request || undefined }) },
  { kind: "site", layer: 499, fields: "oid_site,tik_tipul,ktovet,matzav_bniya,sug_bakasha",
    map: (a) => ({ key: `site-${a.tik_tipul ?? a.oid_site}`, stage: clean(a.matzav_bniya), title: clean(a.sug_bakasha)?.split(",")[0], address: clean(a.ktovet) }) },
  { kind: "night", layer: 479, fields: "oid_avoda,tik_tipul,mahut,ktovet,tr_hatchala,tr_siyum,shaot_between",
    map: (a) => ({ key: `night-${a.tik_tipul ?? ""}-${a.tr_hatchala ?? a.oid_avoda}`, title: clean(a.mahut), address: clean(a.ktovet), stage: [a.tr_hatchala, a.tr_siyum].filter(Boolean).join("–") || undefined, hours: clean(a.shaot_between) }) },
  { kind: "road", layer: 852, fields: "OBJECTID,GlobalID,t_ktovet,mahut_avoda,tzimtzum_netivim,date_start,date_end",
    map: (a) => ({ key: `road-${a.GlobalID ?? a.OBJECTID}`, title: clean(a.mahut_avoda), address: clean(a.t_ktovet), stage: clean(a.tzimtzum_netivim), from: a.date_start, to: a.date_end }) },
];

const prevSnap = JSON.parse(await readFile("data/build-snapshot.json", "utf8").catch(() => "null"));
const prevChanges = JSON.parse(await readFile("public/data/build-changes.json", "utf8").catch(() => "null"));
const today = new Date().toISOString().slice(0, 10);

const items = {};
const report = [];
for (const L of LAYERS) {
  try {
    const feats = await all(L.layer, L.fields);
    let n = 0;
    for (const f of feats) {
      const c = centre(f.geometry);
      if (!c) continue;
      const it = { kind: L.kind, lat: c[0], lon: c[1], ...L.map(f.attributes) };
      for (const k of Object.keys(it)) if (it[k] === undefined) delete it[k];
      items[it.key] = it;
      n++;
    }
    report.push(`${L.kind}: ${n}`);
  } catch (e) {
    report.push(`${L.kind}: FAILED ${e.message}`);
    // Keep yesterday's rows for a layer that failed today, so nothing looks "new" tomorrow.
    for (const [k, v] of Object.entries(prevSnap?.items ?? {})) if (v.kind === L.kind) items[k] = v;
  }
}

const changes = [];
if (prevSnap?.items) {
  for (const [k, it] of Object.entries(items)) {
    const old = prevSnap.items[k];
    if (!old) changes.push({ date: today, change: "new", ...it });
    else if (old.stage !== it.stage && it.kind === "permit") changes.push({ date: today, change: "stage", from: old.stage, ...it });
  }
}
const cutoff = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
const kept = [...changes, ...((prevChanges?.changes ?? []).filter((c) => c.date >= cutoff && c.date !== today))];

await mkdir("data", { recursive: true });
await writeFile("data/build-snapshot.json", JSON.stringify({ updated: new Date().toISOString(), items }));
await writeFile("public/data/build-changes.json", JSON.stringify({ updated: new Date().toISOString(), changes: kept }));
console.log([...report, `changes today: ${changes.length}, kept: ${kept.length}`].join("\n"));
if (process.env.GITHUB_ACTIONS) for (const line of [...report, `changes today: ${changes.length}`]) console.log(`::notice::${line}`);
