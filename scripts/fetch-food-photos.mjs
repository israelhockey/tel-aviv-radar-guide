// Food photography for the Food & drink page: freely licensed photos of each dish, taken from
// the dish's Wikipedia article (images on Wikimedia Commons). Writes public/data/food-photos.json
// with credit and licence for each photo. Run nightly by .github/workflows/refresh-city.yml.
import { readFile, writeFile } from "node:fs/promises";

const UA = "TLV-Radar/1.0 (free public city guide; https://tel-aviv-radar-guide.lovable.app)";

// Our dish keys → Wikipedia articles to draw photos from, best first.
const DISHES = {
  coffee: ["Cappuccino", "Latte", "Espresso", "Flat white"],
  burger: ["Hamburger", "Cheeseburger"],
  pizza: ["Pizza", "Neapolitan pizza"],
  hummus: ["Hummus"],
  falafel: ["Falafel"],
  shawarma: ["Shawarma"],
  sabich: ["Sabich"],
  shakshuka: ["Shakshouka"],
  sushi: ["Sushi", "Nigiri"],
  ramen: ["Ramen"],
  asian: ["Pad thai", "Dim sum", "Bao (food)"],
  pasta: ["Spaghetti alla carbonara", "Pasta"],
  mexican: ["Taco"],
  seafood: ["Seafood", "Calamari"],
  steak: ["Steak"],
  chicken: ["Fried chicken"],
  salad: ["Israeli salad", "Greek salad"],
  breakfast: ["Israeli breakfast", "Eggs Benedict"],
  icecream: ["Gelato", "Ice cream"],
  dessert: ["Cake", "Chocolate cake"],
  juice: ["Smoothie", "Juice"],
  bubbletea: ["Bubble tea"],
  ethiopian: ["Injera"],
  indian: ["Curry"],
  french: ["Croissant"],
  bagel: ["Bagel"],
  sandwich: ["Sandwich"],
  cocktail: ["Cocktail", "Negroni", "Margarita"],
  beer: ["Beer", "Draught beer"],
  wine: ["Wine"],
  kebab: ["Kebab"],
  bourekas: ["Bourekas"],
  vegan: ["Buddha bowl", "Salad"],
  meze: ["Meze", "Mezze"],
};

const BAD = /map|logo|flag|icon|diagram|stamp|coat|chart|svg|drawing|sign|menu|portrait|statue|label|commons-logo|wikidata/i;

const api = async (title) => {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  for (const [k, v] of Object.entries({
    action: "query", format: "json", titles: title, redirects: "1", generator: "images", gimlimit: "40",
    prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "800",
  })) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${title}`);
  return res.json();
};

const lead = async (title) => {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const j = await res.json();
  return j.originalimage?.source ? decodeURIComponent(j.originalimage.source.split("/").pop()) : null;
};

const strip = (s = "") => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let prev = {};
try { prev = JSON.parse(await readFile("public/data/food-photos.json", "utf8")).dishes ?? {}; } catch { /* first run */ }

const dishes = {};
for (const [key, titles] of Object.entries(DISHES)) {
  const out = [];
  for (const title of titles) {
    if (out.length >= 4) break;
    try {
      const [j, leadFile] = await Promise.all([api(title), lead(title)]);
      const pages = Object.values(j.query?.pages ?? {});
      const photos = pages
        .map((p) => ({ name: p.title.replace(/^File:/, ""), ii: p.imageinfo?.[0] }))
        .filter(({ name, ii }) => ii && ii.mime === "image/jpeg" && ii.width >= 700 && ii.width / ii.height > 0.65 && ii.width / ii.height < 1.9 && !BAD.test(name));
      // The article's own lead photo first: editors picked it as the best picture of the dish.
      photos.sort((a, b) => (b.name.replace(/ /g, "_") === leadFile?.replace(/ /g, "_") ? 1 : 0) - (a.name.replace(/ /g, "_") === leadFile?.replace(/ /g, "_") ? 1 : 0));
      for (const { name, ii } of photos) {
        if (out.length >= 4 || out.some((o) => o.file === name)) continue;
        const m = ii.extmetadata ?? {};
        out.push({
          file: name,
          src: ii.thumburl,
          by: strip(m.Artist?.value).slice(0, 80) || "Wikimedia Commons",
          license: strip(m.LicenseShortName?.value) || "",
          page: ii.descriptionurl,
        });
      }
    } catch (e) {
      console.log(`::warning::${title}: ${String(e).slice(0, 120)}`);
    }
    await sleep(300);
  }
  dishes[key] = out.length ? out : prev[key] ?? [];
}

const n = Object.values(dishes).reduce((s, l) => s + l.length, 0);
console.log(`::notice::food photos: ${n} photos for ${Object.keys(dishes).length} dishes; empty: ${Object.entries(dishes).filter(([, l]) => !l.length).map(([k]) => k).join(", ") || "none"}`);
if (n < 30) process.exit(1);
await writeFile("public/data/food-photos.json", JSON.stringify({ source: "Wikimedia Commons, via Wikipedia", updated: new Date().toISOString(), dishes }) + "\n");
