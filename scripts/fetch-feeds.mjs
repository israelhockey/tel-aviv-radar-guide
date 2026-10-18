// Collects Tel Aviv events (schema.org Event JSON-LD) and Tel Aviv news headlines (RSS)
// and writes public/data/events.json and public/data/news.json for the site to load directly.
// Run by .github/workflows/refresh-feeds.yml. No dependencies (Node 20+).
//
// Content rule: we store facts (titles, times, venues, links) and link back to the source.
// We never copy article bodies or event descriptions.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const UA = "Mozilla/5.0 (compatible; TLV-Radar/1.0; free public city guide)";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const get = async (url, ua = BROWSER_UA) => {
  const res = await fetch(url, { headers: { "User-Agent": ua, "Accept-Language": "he,en;q=0.8" }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
};

const decode = (s = "") =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;|&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();

/* ------------------------------ events ------------------------------ */

const EVENT_TYPES = /^(Event|MusicEvent|TheaterEvent|ExhibitionEvent|SocialEvent|ComedyEvent|Festival|ScreeningEvent|DanceEvent|EducationEvent|ChildrensEvent|LiteraryEvent|FoodEvent|SportsEvent|BusinessEvent|VisualArtsEvent)$/;

const ldBlocks = (html) =>
  [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => { try { return JSON.parse(m[1].trim()); } catch { return null; } })
    .filter(Boolean);

const collectEvents = (node, out = []) => {
  if (Array.isArray(node)) { node.forEach((n) => collectEvents(n, out)); return out; }
  if (!node || typeof node !== "object") return out;
  const types = [].concat(node["@type"] ?? []);
  if (types.some((t) => EVENT_TYPES.test(String(t)))) out.push(node);
  for (const v of Object.values(node)) if (v && typeof v === "object") collectEvents(v, out);
  return out;
};

const TLV_RE = /תל[\s-]?אביב|ת"א|יפו|tel[\s-]?aviv|jaffa|yafo/i;

const first = (v) => (Array.isArray(v) ? v[0] : v);

// Ticket sites pad titles for search engines: "Show - לוח הופעות והזמנת כרטיסים | Venue - 18.10".
const cleanTitle = (title, venue) => {
  let t = title
    .replace(/\s*[-–|]\s*(לוח הופעות|הזמנת כרטיסים|כרטיסים|tickets?)[^|]*$/i, "")
    .replace(/\s*[-–]\s*\d{1,2}[./]\d{1,2}([./]\d{2,4})?\s*$/, "");
  if (venue) {
    const parts = t.split(/\s*\|\s*/);
    if (parts.length > 1 && venue.includes(parts.at(-1).slice(0, 6))) parts.pop();
    t = parts.join(" | ");
  }
  return t.replace(/\s*[-–]\s*\d{1,2}[./]\d{1,2}([./]\d{2,4})?\s*$/, "").trim() || title;
};

const toEvent = (e, source) => {
  const loc = first(e.location) ?? {};
  const addr = typeof loc.address === "string" ? { streetAddress: loc.address } : (loc.address ?? {});
  const geo = loc.geo ?? {};
  const offers = [].concat(e.offers ?? []);
  const prices = offers.flatMap((o) => [o.price, o.lowPrice]).map(Number).filter((n) => Number.isFinite(n));
  const url = e.url ?? offers[0]?.url;
  const image = typeof e.image === "string" ? e.image : first(e.image)?.url ?? first(e.image);
  const status = String(e.eventStatus ?? "");
  if (!e.name || !e.startDate || !url) return null;
  if (/Cancelled|Postponed/i.test(status)) return null;
  const city = [addr.addressLocality, addr.streetAddress, loc.name].filter(Boolean).join(" ");
  return {
    id: `${source.id}:${String(url).replace(/[#?].*$/, "").split("/").filter(Boolean).pop()}`,
    title: cleanTitle(decode(e.name), loc.name ? decode(loc.name) : ""),
    start: e.startDate,
    end: e.endDate ?? null,
    venue: loc.name ? decode(loc.name) : null,
    address: [addr.streetAddress, addr.addressLocality].filter(Boolean).map(decode).join(", ") || null,
    lat: geo.latitude != null ? Number(geo.latitude) : null,
    lon: geo.longitude != null ? Number(geo.longitude) : null,
    priceFrom: prices.length ? Math.min(...prices) : null,
    free: offers.some((o) => Number(o.price) === 0) && !prices.some((p) => p > 0),
    category: source.category(url, e),
    url,
    image: typeof image === "string" ? image : null,
    source: source.name,
    inTelAviv: TLV_RE.test(city) || source.alwaysTelAviv === true,
  };
};

const tickchakCategory = (url) => {
  const seg = new URL(url).pathname.split("/").filter(Boolean)[0] ?? "";
  return ({ standup: "comedy", shows: "music", parties: "party", kids: "family", theatre: "theatre", theater: "theatre", lectures: "talk", festivals: "festival", sport: "sport" })[seg] ?? "other";
};

const meetupCategory = () => "meetup";

const EVENT_SOURCES = [
  { id: "tickchak", name: "Tickchak", url: "https://live.tickchak.co.il/tel-aviv", category: tickchakCategory, alwaysTelAviv: true },
  { id: "tickchak-week", name: "Tickchak", url: "https://live.tickchak.co.il/tel-aviv/thisWeek", category: tickchakCategory, alwaysTelAviv: true },
  { id: "tickchak-barby", name: "Tickchak", url: "https://live.tickchak.co.il/barby-tlv", category: () => "music", alwaysTelAviv: true },
  { id: "tickchak-menorah", name: "Tickchak", url: "https://live.tickchak.co.il/tel-aviv-menorah-hall", category: tickchakCategory, alwaysTelAviv: true },
  { id: "meetup", name: "Meetup", url: "https://www.meetup.com/find/?location=il--tel-aviv&source=EVENTS", category: meetupCategory },
];

// Leaan (a large Israeli ticket office) embeds its whole listing as Next.js page data.
const LEAAN_CATEGORIES = { 1: "theatre", 2: "family", 3: "music", 4: "comedy", 5: "sport" };
const fetchLeaan = async () => {
  const html = await get("https://www.leaan.co.il/events");
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error("no page data");
  const rows = JSON.parse(m[1])?.props?.pageProps?.initialState?.search?.events ?? [];
  const out = [];
  for (const r of rows) {
    const loc = r.location ?? {};
    if (!TLV_RE.test(`${loc.city ?? ""} ${loc.street ?? ""}`)) continue;
    if (!r.event_start || !r.id) continue;
    const cats = [].concat(r.categories ?? []).map((c) => (typeof c === "object" ? c.id ?? c.category_id : c)).map(Number);
    out.push({
      id: `leaan:${r.id}`,
      title: cleanTitle(decode(r.event_name ?? r.name ?? ""), loc.name ?? ""),
      start: new Date(r.event_start * 1000).toISOString(),
      end: r.event_end ? new Date(r.event_end * 1000).toISOString() : null,
      venue: loc.name ? decode(loc.name) : null,
      address: [loc.street, loc.city].filter(Boolean).map(decode).join(", ") || null,
      lat: null, lon: null,
      priceFrom: Number.isFinite(Number(r.starting_price)) && Number(r.starting_price) > 0 ? Number(r.starting_price) : null,
      free: false,
      category: LEAAN_CATEGORIES[cats.find((c) => LEAAN_CATEGORIES[c])] ?? "other",
      url: `https://www.leaan.co.il/events/${r.id}`,
      image: r.vivenu_image || null,
      source: "Leaan",
    });
  }
  return out;
};

// The same show often appears on several ticket sites: one entry per title + start time.
const normTitle = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

const fetchEvents = async () => {
  const all = new Map();
  const report = [];
  for (const src of EVENT_SOURCES) {
    try {
      const html = await get(src.url);
      const raw = ldBlocks(html).flatMap((b) => collectEvents(b));
      let kept = 0;
      for (const r of raw) {
        const ev = toEvent(r, src);
        if (!ev || !ev.inTelAviv) continue;
        // Same show listed on several pages: keep one per URL + start time.
        const key = `${ev.url.replace(/[#?].*$/, "")}|${ev.start}`;
        if (!all.has(key)) { all.set(key, ev); kept++; }
      }
      report.push(`${src.url}: ${raw.length} found, ${kept} kept`);
    } catch (e) {
      report.push(`${src.url}: FAILED ${e}`);
    }
  }
  try {
    const leaan = await fetchLeaan();
    let kept = 0;
    const seenTitles = new Set([...all.values()].map((e) => `${normTitle(e.title)}|${new Date(e.start).toISOString().slice(0, 16)}`));
    for (const ev of leaan) {
      const k = `${normTitle(ev.title)}|${new Date(ev.start).toISOString().slice(0, 16)}`;
      if (seenTitles.has(k)) continue;
      seenTitles.add(k);
      all.set(`${ev.url}|${ev.start}`, ev);
      kept++;
    }
    report.push(`leaan: ${leaan.length} Tel Aviv, ${kept} new`);
  } catch (e) {
    report.push(`leaan: FAILED ${e}`);
  }

  const now = Date.now();
  const events = [...all.values()]
    .filter((e) => new Date(e.end ?? e.start).getTime() > now - 3 * 3600_000)
    .filter((e) => new Date(e.start).getTime() < now + 60 * 24 * 3600_000)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .map(({ inTelAviv, ...e }) => e);
  return { events, report };
};

/* ------------------------------ venue geocoding ------------------------------ */
// Venues are looked up once in OpenStreetMap's Nominatim (max 1 request/second, per its usage
// policy) and cached in public/data/venues.json. Misses are retried after a week.

const VENUES_PATH = "public/data/venues.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Extra search terms for venues Nominatim doesn't find by their Hebrew listing name:
// English names as tagged in OpenStreetMap, plus well-known street addresses.
const VENUE_ALIASES = {
  "מועדון הבארבי": ["Barby", "קיבוץ גלויות 52, תל אביב"],
  "תיאטרון הקאמרי": ["Cameri Theatre", "שדרות שאול המלך 30, תל אביב"],
  "תיאטרון בית ליסין תל אביב": ["Beit Lessin Theatre", "בית ליסין"],
  "מועדון גגרין": ["Gagarin", "גגרין"],
  "אוזן בר תל-אביב יפו": ["Ozen Bar", "אוזן בר"],
  "קומדי בר תל אביב": ["Comedy Bar", "קומדי בר"],
  "סטנד אפ פקטורי - ת\"א": ["Stand Up Factory", "סטנדאפ פקטורי"],
  "גריי תל אביב": ["Gray", "גריי"],
  "AMAMA, תל אביב-יפו": ["AMAMA"],
};

const geocodeVenues = async (events) => {
  let cache = {};
  try { cache = JSON.parse(await readFile(VENUES_PATH, "utf8")); } catch { /* first run */ }
  const weekAgo = Date.now() - 7 * 24 * 3600_000;
  const keyOf = (e) => (e.venue ?? e.address ?? "").trim();
  const todo = [...new Set(events.filter((e) => e.lat == null).map(keyOf).filter(Boolean))]
    .filter((k) => !cache[k] || (cache[k].lat == null && new Date(cache[k].checked).getTime() < weekAgo))
    .slice(0, 40); // stay well inside the rate limit per run
  for (const k of todo) {
    const ev = events.find((e) => keyOf(e) === k);
    // Try the full venue + address, the venue name alone (Nominatim knows many venues by name),
    // and the street address; strip city words that make Nominatim settle for the city itself.
    const bare = (ev.venue ?? "").replace(/(תל[\s-]?אביב(-?\s?יפו)?|ת"א|tel[\s-]?aviv)/gi, "").replace(/[-–,()\s]+$/g, "").replace(/^[-–,()\s]+/g, "").trim();
    const street = (ev.address ?? "").split(",")[0].trim();
    const queries = [
      ...(VENUE_ALIASES[k] ?? []),
      [ev.venue, ev.address].filter(Boolean).join(", "),
      bare,
      bare && `${bare}, תל אביב`,
      /\d/.test(street) ? `${street}, תל אביב` : "",
    ].filter(Boolean);
    let hit = null;
    for (const q of queries) {
      const u = new URL("https://nominatim.openstreetmap.org/search");
      u.searchParams.set("q", q);
      u.searchParams.set("format", "jsonv2");
      u.searchParams.set("limit", "1");
      u.searchParams.set("countrycodes", "il");
      u.searchParams.set("viewbox", "34.735,32.135,34.83,32.025");
      u.searchParams.set("bounded", "1");
      try {
        const res = await fetch(u, { headers: { "User-Agent": "TLV-Radar/1.0 (free public city guide; github.com/israelhockey)" } });
        const rows = res.ok ? await res.json() : [];
        // A match on the city or a whole district is no better than not knowing: skip it.
        const r0 = rows[0];
        const vague = r0 && (/^(city|town|village|municipality|suburb|quarter|neighbourhood|state|county|region|country)$/.test(r0.addresstype ?? "") || r0.class === "boundary");
        if (r0 && !vague) hit = { lat: Number(r0.lat), lon: Number(r0.lon) };
      } catch { /* try next form */ }
      await sleep(1100);
      if (hit) break;
    }
    cache[k] = { ...(hit ?? { lat: null, lon: null }), checked: new Date().toISOString() };
  }
  for (const e of events) {
    const c = cache[keyOf(e)];
    if (e.lat == null && c?.lat != null) { e.lat = c.lat; e.lon = c.lon; }
  }
  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(VENUES_PATH, JSON.stringify(sorted, null, 1) + "\n");
  return todo.length;
};

/* ------------------------------ news ------------------------------ */

const NEWS_SOURCES = [
  { id: "secrettlv", name: "Secret Tel Aviv", url: "https://www.secrettelaviv.com/feed", lang: "en", local: true },
  { id: "ynet", name: "ynet", url: "https://www.ynet.co.il/Integration/StoryRss2.xml", lang: "he" },
  { id: "ynetnews", name: "Ynetnews", url: "https://www.ynetnews.com/Integration/StoryRss3082.xml", lang: "en" },
  { id: "haaretz", name: "Haaretz", url: "https://www.haaretz.com/srv/haaretz-latest-headlines", lang: "en" },
  { id: "jpost", name: "The Jerusalem Post", url: "https://www.jpost.com/rss/rssfeedsisraelnews.aspx", lang: "en" },
  { id: "maariv", name: "מעריב", url: "https://www.maariv.co.il/Rss/RssChadashot", lang: "he" },
  { id: "globes", name: "גלובס", url: "https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2", lang: "he" },
];

// What makes a headline a Tel Aviv story. Hebrew has no \b, so place names must stand alone,
// optionally with a one-letter prefix (ב/ל/מ/ה/ו/ש/כ) — "יפו" must not match inside other words.
const HE_PLACES = [
  'תל[\\s-]?אביב', 'ת"א', 'ת״א', 'יפו', 'פלורנטין', 'דיזנגוף', 'נווה צדק', 'רמת אביב', 'כיכר רבין',
  'נמל תל אביב', 'שדרות רוטשילד', 'חולדאי', 'כרם התימנים', 'שוק הכרמל', 'הצפון הישן', 'שכונת התקווה', 'עזריאלי',
];
const HE_RE = new RegExp(`(?<![\\u0590-\\u05FF])(?:[בלמהושכ]|וב|ול|מה|שב|וה)?(?:${HE_PLACES.join("|")})(?![\\u0590-\\u05FF])`);
const EN_RE = /\b(tel[\s-]?aviv|jaffa|yafo|florentin|dizengoff|rothschild boulevard|neve tzedek|ramat aviv|rabin square|huldai|carmel market|azrieli)\b/i;
const isLocal = (text) => HE_RE.test(text) || EN_RE.test(text);

const parseRss = (xml) =>
  [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => {
    const it = m[0];
    const tag = (t) => decode((new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, "i").exec(it) ?? [])[1]);
    return { title: tag("title"), link: tag("link") || tag("guid"), pubDate: tag("pubDate"), description: tag("description") };
  });

const fetchNews = async () => {
  const items = [];
  const report = [];
  for (const src of NEWS_SOURCES) {
    try {
      const xml = await get(src.url, UA);
      const rows = parseRss(xml);
      let kept = 0;
      for (const r of rows) {
        if (!r.title || !r.link) continue;
        if (!src.local && !isLocal(`${r.title} ${r.description.slice(0, 300)}`)) continue;
        const published = r.pubDate ? new Date(r.pubDate) : null;
        items.push({
          id: `${src.id}:${r.link.replace(/[?#].*$/, "")}`,
          title: r.title,
          url: r.link,
          source: src.name,
          lang: src.lang,
          published: published && !Number.isNaN(published.getTime()) ? published.toISOString() : null,
        });
        kept++;
      }
      report.push(`${src.url}: ${rows.length} items, ${kept} Tel Aviv`);
    } catch (e) {
      report.push(`${src.url}: FAILED ${e}`);
    }
  }
  const cutoff = Date.now() - 4 * 24 * 3600_000;
  const seen = new Set();
  const news = items
    .filter((n) => !n.published || new Date(n.published).getTime() > cutoff)
    .filter((n) => (seen.has(n.title) ? false : (seen.add(n.title), true)))
    .sort((a, b) => new Date(b.published ?? 0) - new Date(a.published ?? 0))
    .slice(0, 80);
  return { news, report };
};

/* ------------------------------ write ------------------------------ */

const keepPrevious = async (path, key, fresh) => {
  // If every source failed this run, keep yesterday's data rather than blanking the site.
  if (fresh.length) return fresh;
  try { return JSON.parse(await readFile(path, "utf8"))[key] ?? []; } catch { return []; }
};

const [{ events, report: er }, { news, report: nr }] = await Promise.all([fetchEvents(), fetchNews()]);
console.log([...er, ...nr].join("\n"));

await mkdir("public/data", { recursive: true });
const looked = await geocodeVenues(events);
console.log(`Geocoded ${looked} new venues; ${events.filter((e) => e.lat != null).length}/${events.length} events placed.`);
const ev = await keepPrevious("public/data/events.json", "events", events);
const nw = await keepPrevious("public/data/news.json", "news", news);
// Only rewrite a file when its content changed, so the repo isn't committed to every run.
const writeIfChanged = async (path, key, rows) => {
  try {
    const prev = JSON.parse(await readFile(path, "utf8"));
    if (JSON.stringify(prev[key]) === JSON.stringify(rows)) return;
  } catch { /* first run */ }
  await writeFile(path, JSON.stringify({ updated: new Date().toISOString(), count: rows.length, [key]: rows }) + "\n");
};
await writeIfChanged("public/data/events.json", "events", ev);
await writeIfChanged("public/data/news.json", "news", nw);
console.log(`Wrote ${ev.length} events and ${nw.length} news items.`);
