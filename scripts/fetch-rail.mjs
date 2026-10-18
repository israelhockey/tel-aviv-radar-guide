// Pulls the Tel Aviv light rail and train lines and stations from OpenStreetMap (Overpass)
// and writes public/data/rail.json (two GeoJSON collections) for the live map.
// Run by .github/workflows/refresh-places.yml every night. No dependencies (Node 20+).
import { mkdir, writeFile } from "node:fs/promises";

const BBOX = "31.95,34.70,32.20,34.95"; // Gush Dan, so lines that leave the city still draw
const QUERY = `[out:json][timeout:120];
(
  relation["type"="route"]["route"~"^(light_rail|tram|subway|train)$"](${BBOX});
)->.routes;
.routes out geom tags;
(
  node["railway"="station"](${BBOX});
  node["public_transport"="station"]["light_rail"="yes"](${BBOX});
);
out tags;`;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const fetchOverpass = async () => {
  let last;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "TLV-Radar/1.0 (free public city guide)" },
        body: `data=${encodeURIComponent(QUERY)}`,
      });
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return await res.json();
    } catch (e) {
      last = e;
      console.warn(`Overpass endpoint failed: ${e}`);
    }
  }
  throw last;
};

const round = (n) => Math.round(n * 1e5) / 1e5;
const j = await fetchOverpass();

// Several route relations per line (one per direction): keep one geometry per line ref.
const lines = new Map();
for (const el of j.elements ?? []) {
  if (el.type !== "relation") continue;
  const t = el.tags ?? {};
  const kind = t.route === "train" ? "train" : "light_rail";
  const key = `${kind}:${t.ref ?? t.name ?? el.id}`;
  if (lines.has(key)) continue;
  const parts = (el.members ?? [])
    .filter((m) => m.type === "way" && Array.isArray(m.geometry) && (m.role === "" || m.role === "forward" || m.role === "backward"))
    .map((m) => m.geometry.map((g) => [round(g.lon), round(g.lat)]));
  if (!parts.length) continue;
  lines.set(key, {
    type: "Feature",
    geometry: { type: "MultiLineString", coordinates: parts },
    properties: {
      kind,
      ref: t.ref ?? "",
      name: t["name:en"] ?? t.name ?? "",
      nameHe: t["name:he"] ?? t.name ?? "",
      colour: t.colour ?? (kind === "train" ? "#8fa3bf" : "#e03131"),
    },
  });
}

const stations = (j.elements ?? [])
  .filter((el) => el.type === "node" && el.lat != null)
  .map((el) => {
    const t = el.tags ?? {};
    const kind = t.light_rail === "yes" || t.station === "light_rail" || t.subway === "yes" ? "light_rail" : "train";
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [round(el.lon), round(el.lat)] },
      properties: { kind, name: t["name:en"] ?? t.name ?? "", nameHe: t["name:he"] ?? t.name ?? "" },
    };
  });

if (lines.size < 2) throw new Error(`Only ${lines.size} rail lines returned; refusing to overwrite.`);

await mkdir("public/data", { recursive: true });
await writeFile(
  "public/data/rail.json",
  JSON.stringify({
    source: "© OpenStreetMap contributors, ODbL",
    lines: { type: "FeatureCollection", features: [...lines.values()] },
    stations: { type: "FeatureCollection", features: stations },
  }) + "\n",
);
console.log(`Wrote ${lines.size} lines and ${stations.length} stations.`);
