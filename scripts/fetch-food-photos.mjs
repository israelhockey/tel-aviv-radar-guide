// Food photography for the Food & drink page: freely licensed photos of each dish, taken from
// the dish's Wikipedia article (images on Wikimedia Commons). Writes public/data/food-photos.json
// with credit and licence for each photo. Run nightly by .github/workflows/refresh-city.yml.
import { readFile, writeFile } from "node:fs/promises";

const UA = "TLV-Radar/1.0 (free public city guide; https://tel-aviv-radar-guide.lovable.app)";

// Our dish keys → Wikipedia articles. Each article's lead photo (the one its editors chose to
// show the dish) becomes one photo, so every dish gets several good pictures.
const DISHES = {
  coffee: ["Cappuccino", "Caffè latte", "Espresso", "Flat white", "Iced coffee"],
  burger: ["Hamburger", "Cheeseburger", "Veggie burger"],
  pizza: ["Pizza", "Neapolitan pizza", "Pizza Margherita"],
  hummus: ["Hummus", "Ful medames", "Msabbha"],
  falafel: ["Falafel", "Pita"],
  shawarma: ["Shawarma", "Gyros", "Doner kebab"],
  sabich: ["Sabich", "Amba (condiment)"],
  shakshuka: ["Shakshouka", "Menemen (food)"],
  sushi: ["Sushi", "Sashimi", "Makizushi"],
  ramen: ["Ramen", "Udon", "Pho"],
  asian: ["Pad thai", "Dim sum", "Bao (food)", "Jiaozi"],
  pasta: ["Spaghetti alla carbonara", "Lasagna", "Cacio e pepe", "Ravioli"],
  mexican: ["Taco", "Burrito", "Guacamole"],
  seafood: ["Calamari", "Paella", "Fish and chips"],
  steak: ["Steak", "Ribeye", "Entrecôte"],
  chicken: ["Fried chicken", "Schnitzel", "Shashlik"],
  salad: ["Israeli salad", "Greek salad", "Tabbouleh", "Fattoush"],
  breakfast: ["Israeli breakfast", "Eggs Benedict", "Pancake", "Brunch"],
  icecream: ["Gelato", "Ice cream", "Sundae", "Ice cream cone"],
  dessert: ["Cheesecake", "Chocolate cake", "Malabi", "Knafeh"],
  juice: ["Smoothie", "Orange juice", "Lemonade"],
  bubbletea: ["Bubble tea"],
  ethiopian: ["Injera", "Ethiopian cuisine"],
  indian: ["Chicken tikka masala", "Biryani", "Butter chicken", "Samosa"],
  french: ["Croissant", "Pain au chocolat", "Crème brûlée"],
  bagel: ["Bagel", "Ka'ak"],
  sandwich: ["Club sandwich", "Bánh mì", "Sandwich"],
  cocktail: ["Cocktail", "Negroni", "Margarita", "Mojito", "Spritz Veneziano"],
  beer: ["Beer", "India pale ale", "Lager"],
  wine: ["Rosé", "Red wine", "Sparkling wine", "Wine"],
  kebab: ["Kebab", "Shish kebab", "Kofta"],
  bourekas: ["Bourekas", "Börek"],
  vegan: ["Buddha bowl", "Poke (dish)", "Tofu"],
  meze: ["Meze", "Baba ghanoush", "Labneh"],
};

const BAD = /map|logo|flag|icon|diagram|stamp|coat|chart|\.svg|drawing|portrait|statue/i;

// Lead photo of an article, with an 800px thumbnail and its credit, from one API call.
const leadPhoto = async (title) => {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  for (const [k, v] of Object.entries({ action: "query", format: "json", titles: title, redirects: "1", prop: "pageimages", piprop: "name", pilicense: "free" })) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${title}`);
  const page = Object.values((await res.json()).query?.pages ?? {})[0];
  const name = page?.pageimage;
  if (!name || BAD.test(name) || !/\.jpe?g$/i.test(name)) return null;
  const c = new URL("https://commons.wikimedia.org/w/api.php");
  for (const [k, v] of Object.entries({ action: "query", format: "json", titles: `File:${name}`, prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "800" })) c.searchParams.set(k, v);
  const r2 = await fetch(c, { headers: { "User-Agent": UA } });
  if (!r2.ok) return null;
  const ii = Object.values((await r2.json()).query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!ii || ii.width < 500 || ii.width / ii.height < 0.6 || ii.width / ii.height > 2) return null;
  const m = ii.extmetadata ?? {};
  return { file: name, src: ii.thumburl, by: strip(m.Artist?.value).slice(0, 80) || "Wikimedia Commons", license: strip(m.LicenseShortName?.value) || "", page: ii.descriptionurl, dish: title };
};

const strip = (s = "") => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let prev = {};
try { prev = JSON.parse(await readFile("public/data/food-photos.json", "utf8")).dishes ?? {}; } catch { /* first run */ }

const dishes = {};
for (const [key, titles] of Object.entries(DISHES)) {
  const out = [];
  for (const title of titles) {
    try {
      const p = await leadPhoto(title);
      if (p && !out.some((o) => o.file === p.file)) out.push(p);
    } catch (e) {
      console.log(`::warning::${title}: ${String(e).slice(0, 120)}`);
    }
    await sleep(250);
  }
  dishes[key] = out.length ? out : prev[key] ?? [];
}

const n = Object.values(dishes).reduce((s, l) => s + l.length, 0);
console.log(`::notice::food photos: ${n} photos for ${Object.keys(dishes).length} dishes; empty: ${Object.entries(dishes).filter(([, l]) => !l.length).map(([k]) => k).join(", ") || "none"}`);
if (n < 25) process.exit(1);
await writeFile("public/data/food-photos.json", JSON.stringify({ source: "Wikimedia Commons, via Wikipedia", updated: new Date().toISOString(), dishes }) + "\n");
