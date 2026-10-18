// Pulls Tel Aviv-Yafo food, drink and bike-rental places from OpenStreetMap (Overpass)
// and writes a compact static file the site loads directly: public/data/places.json.
// Run by .github/workflows/refresh-places.yml every night. No dependencies (Node 20+).
import { mkdir, writeFile } from "node:fs/promises";

const BBOX = "32.025,34.735,32.135,34.83"; // south,west,north,east — keep in sync with src/lib/live/geo.ts
const QUERY = `[out:json][timeout:90];(nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|biergarten)$"](${BBOX});nwr["amenity"="bicycle_rental"](${BBOX}););out center tags;`;
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

const json = await fetchOverpass();
const places = [];
for (const e of json.elements ?? []) {
  const lat = e.lat ?? e.center?.lat;
  const lon = e.lon ?? e.center?.lon;
  const t = e.tags ?? {};
  if (lat == null || lon == null) continue;
  if (!t.name && t.amenity !== "bicycle_rental") continue;
  const p = {
    id: `${e.type[0]}${e.id}`,
    name: t.name ?? t["name:he"] ?? t["name:en"] ?? "",
    kind: t.amenity,
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6,
  };
  if (t["name:en"]) p.nameEn = t["name:en"];
  if (t.opening_hours) p.hours = t.opening_hours;
  if (t.cuisine) p.cuisine = t.cuisine;
  if (t["diet:kosher"]) p.kosher = t["diet:kosher"];
  if (t["diet:vegan"]) p.vegan = t["diet:vegan"];
  if (t["addr:street"]) p.street = t["addr:street"];
  if (t["addr:housenumber"]) p.number = t["addr:housenumber"];
  places.push(p);
}
places.sort((a, b) => a.id.localeCompare(b.id));

if (places.length < 500) throw new Error(`Only ${places.length} places returned; refusing to overwrite the file.`);

await mkdir("public/data", { recursive: true });
await writeFile(
  "public/data/places.json",
  JSON.stringify({ source: "© OpenStreetMap contributors, ODbL", bbox: BBOX, count: places.length, places }) + "\n",
);
console.log(`Wrote ${places.length} places.`);
