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

// Wikipedia asks API users to slow down when busy (HTTP 429): wait and try again.
const polite = async (u) => {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(u, { headers: { "User-Agent": UA } });
    if (res.status !== 429) return res;
    await sleep(5000 * (i + 1));
  }
  throw new Error(`429 ${u}`);
};

// Lead photo of an article, with an 800px thumbnail and its credit, from one API call.
const leadPhoto = async (title) => {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  for (const [k, v] of Object.entries({ action: "query", format: "json", titles: title, redirects: "1", prop: "pageimages", piprop: "name", pilicense: "free" })) u.searchParams.set(k, v);
  const res = await polite(u);
  if (!res.ok) throw new Error(`${res.status} ${title}`);
  const page = Object.values((await res.json()).query?.pages ?? {})[0];
  const name = page?.pageimage;
  if (!name || BAD.test(name) || !/\.jpe?g$/i.test(name)) return null;
  const c = new URL("https://commons.wikimedia.org/w/api.php");
  for (const [k, v] of Object.entries({ action: "query", format: "json", titles: `File:${name}`, prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "800" })) c.searchParams.set(k, v);
  const r2 = await polite(c);
  if (!r2.ok) return null;
  const ii = Object.values((await r2.json()).query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!ii || ii.width < 500 || ii.width / ii.height < 0.6 || ii.width / ii.height > 2) return null;
  const m = ii.extmetadata ?? {};
  return { file: name, src: ii.thumburl, by: strip(m.Artist?.value).slice(0, 80) || "Wikimedia Commons", license: strip(m.LicenseShortName?.value) || "", page: ii.descriptionurl, dish: title };
};

const strip = (s = "") => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let prev = {};
let prevCity = {};
try {
  const old = JSON.parse(await readFile("public/data/food-photos.json", "utf8"));
  prev = old.dishes ?? {};
  prevCity = old.city ?? {};
} catch { /* first run */ }

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
    await sleep(700);
  }
  dishes[key] = out.length >= (prev[key]?.length ?? 0) ? out : prev[key];
}

const n = Object.values(dishes).reduce((s, l) => s + l.length, 0);
console.log(`::notice::food photos: ${n} photos for ${Object.keys(dishes).length} dishes; empty: ${Object.entries(dishes).filter(([, l]) => !l.length).map(([k]) => k).join(", ") || "none"}`);
if (n < 25) process.exit(1);
// City photos for articles and guides: places in Tel Aviv-Yafo, one lead photo each.
const CITY = {
  skyline: "Tel Aviv", jaffa: "Jaffa", oldjaffa: "Old Jaffa", clocktower: "Jaffa Clock Tower", fleamarket: "Jaffa Flea Market",
  carmel: "Carmel Market", levinsky: "Levinsky Market", rothschild: "Rothschild Boulevard", whitecity: "White City (Tel Aviv)",
  promenade: "Tel Aviv Promenade", nevetzedek: "Neve Tzedek", florentin: "Florentin, Tel Aviv", port: "Port of Tel Aviv",
  sarona: "Sarona, Tel Aviv", dizengoff: "Dizengoff Square", dizengoffst: "Dizengoff Street", yarkon: "Yarkon Park",
  hatachana: "HaTachana", habima: "Habima Square", museum: "Tel Aviv Museum of Art", kerem: "Kerem HaTeimanim",
  gordon: "Gordon Beach", azrieli: "Azrieli Center", rabin: "Rabin Square", nahalat: "Nahalat Binyamin Street",
  hilton: "Hilton Beach", charlesclore: "Charles Clore Park", ramataviv: "Ramat Aviv", cinematheque: "Tel Aviv Cinematheque",
  bauhaus: "Bauhaus Center (Tel Aviv)", ulpan: "Ulpan", sukkah: "Sukkah", hanukkah: "Hanukkah", purim: "Purim", pride: "Tel Aviv Pride",
  shabbat: "Shabbat", hotel: "Dan Tel Aviv Hotel", lightrail: "Red Line (Tel Aviv Light Rail)",
};
const city = {};
for (const [key, title] of Object.entries(CITY)) {
  try {
    const p = await leadPhoto(title);
    if (p) city[key] = p;
    else if (prevCity[key]) city[key] = prevCity[key];
  } catch (e) {
    console.log(`::warning::${title}: ${String(e).slice(0, 120)}`);
    if (prevCity[key]) city[key] = prevCity[key];
  }
  await sleep(700);
}
console.log(`::notice::city photos: ${Object.keys(city).length}/${Object.keys(CITY).length}; missing: ${Object.keys(CITY).filter((k) => !city[k]).join(", ")}`);

await writeFile("public/data/food-photos.json", JSON.stringify({ source: "Wikimedia Commons, via Wikipedia", updated: new Date().toISOString(), dishes, city }) + "\n");
