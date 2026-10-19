// Hotels, hostels and guest houses in Tel Aviv-Yafo from OpenStreetMap (Overpass).
// Writes public/data/hotels.json. Run nightly by .github/workflows/refresh-places.yml.
import { mkdir, writeFile } from "node:fs/promises";

const BBOX = "32.025,34.735,32.135,34.83";
const QUERY = `[out:json][timeout:90];nwr["tourism"~"^(hotel|hostel|guest_house|apartment|motel)$"](${BBOX});out center tags;`;
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchOverpass = async () => {
  let last;
  await sleep(20000); // the places and rail queries run just before this one
  for (const url of [...ENDPOINTS, ...ENDPOINTS]) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Discover-Tel-Aviv/1.0 (free public city guide)" },
        body: `data=${encodeURIComponent(QUERY)}`,
      });
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return await res.json();
    } catch (e) {
      last = e;
      console.log(`::warning::Overpass failed: ${String(e).slice(0, 160)}`);
      await sleep(10000);
    }
  }
  throw last;
};

const j = await fetchOverpass();
const hotels = [];
for (const e of j.elements ?? []) {
  const t = e.tags ?? {};
  const lat = e.lat ?? e.center?.lat;
  const lon = e.lon ?? e.center?.lon;
  if (lat == null || !t.name) continue;
  const h = { id: `${e.type[0]}${e.id}`, name: t.name, kind: t.tourism, lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 };
  if (t["name:en"]) h.nameEn = t["name:en"];
  if (t.stars) h.stars = Number(String(t.stars).replace(/[^\d.]/g, "")) || undefined;
  if (t.website || t["contact:website"]) h.web = t.website ?? t["contact:website"];
  if (t["addr:street"]) h.street = t["addr:street"];
  if (t["addr:housenumber"]) h.number = t["addr:housenumber"];
  if (t.rooms) h.rooms = Number(t.rooms) || undefined;
  if (t.wheelchair) h.wheelchair = t.wheelchair;
  if (t.internet_access) h.wifi = t.internet_access !== "no";
  hotels.push(h);
}
hotels.sort((a, b) => a.id.localeCompare(b.id));
console.log(`::notice::hotels: ${hotels.length} (${hotels.filter((h) => h.kind === "hotel").length} hotels, ${hotels.filter((h) => h.kind === "hostel").length} hostels)`);
if (hotels.length < 50) process.exit(1);
await mkdir("public/data", { recursive: true });
await writeFile("public/data/hotels.json", JSON.stringify({ source: "© OpenStreetMap contributors, ODbL", hotels }) + "\n");
