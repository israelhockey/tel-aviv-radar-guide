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
    // Season tickets, refunds and long-running passes are not events people go to tonight.
    if (r.subscription || /מנוי|החזר|פיצוי|כרטיס עונתי|season/i.test(`${r.event_name ?? ""}`)) continue;
    if (r.event_start * 1000 < Date.now() - 24 * 3600_000) continue;
    // categories is an object keyed by category id: { "3": { category_name: "מוזיקה", ... } }
    const cats = Object.keys(r.categories ?? {}).map(Number);
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

// The City of Tel Aviv-Yafo publishes its own events and community-centre activities on its
// public map server: free concerts, festivals, talks, tours, classes. Most are free or cheap.
const CITY_GIS = "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer";

// The city stores local wall-clock time as if it were UTC; turn it into a real instant.
const israelIso = (ms) => {
  const wall = new Date(ms).toISOString().slice(0, 19);
  const guess = new Date(`${wall}Z`);
  const off = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "shortOffset" })
    .formatToParts(guess).find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "+2";
  const [h, m = "0"] = off.split(":");
  const sign = h.startsWith("-") ? "-" : "+";
  return `${wall}${sign}${String(Math.abs(Number(h))).padStart(2, "0")}:${m.padStart(2, "0")}`;
};

const CITY_CATS = [
  [/סטנד.?אפ|stand.?up|קומדי/i, "comedy"],
  [/הופע|קונצרט|מוזיק|ג'אז|ג׳אז|תזמורת|מקהל|אופרה|רסיטל|concert|music|jazz|dj\b/i, "music"],
  [/הצג|תיאטר|מחזה|theat/i, "theatre"],
  [/מסיב|רייב|party|rave/i, "party"],
  [/פסטיבל|festival|חגיג|קרנבל/i, "festival"],
  [/ילד|משפח|הורים|פעוט|תינוק|kids|family/i, "family"],
  [/מרוץ|ריצ|אופני|ספורט|יוגה|פילאטיס|שחי|כדור|race|run\b|sport|yoga/i, "sport"],
  [/תערוכ|גלרי|אמנות|אומנות|מוזיאון|exhibit|gallery|art\b/i, "art"],
  [/הרצא|כנס|מפגש|סיור|שיח|lecture|talk|tour/i, "talk"],
];
const cityCategory = (title, summary) => CITY_CATS.find(([re]) => re.test(title))?.[1] ?? CITY_CATS.find(([re]) => re.test(summary))?.[1] ?? "other";

const fetchCityEvents = async () => {
  const u = `${CITY_GIS}/410/query?where=1%3D1&outFields=OBJECTID,title,startdate,location,type,image_url,sitemapurl,summary,lon,lat&returnGeometry=false&f=json`;
  const j = JSON.parse(await get(u, UA));
  const now = Date.now();
  const out = [];
  for (const { attributes: a } of j.features ?? []) {
    if (!a?.title || !a.startdate || !a.sitemapurl) continue;
    const type = String(a.type ?? "");
    if (/הודעות/.test(type)) continue; // announcements, not events
    const community = /קויינג/.test(type);
    // No time given (midnight): file it under that day, shown without a clock.
    const allDay = new Date(a.startdate).toISOString().slice(11, 16) === "00:00";
    const start = israelIso(allDay ? a.startdate + 9 * 3600_000 : a.startdate);
    const t = new Date(start).getTime();
    // Community classes repeat weekly; two weeks ahead is plenty. City events: two months.
    if (t < now - 6 * 3600_000 || t > now + (community ? 14 : 60) * 24 * 3600_000) continue;
    const title = decode(a.title).replace(/\s*[-|]\s*(נדחה|בוטל).*$/, "");
    if (/נדחה|בוטל|cancel/i.test(a.title)) continue;
    const summary = decode(a.summary ?? "");
    out.push({
      id: `tlv:${/ItemID=(\d+)/.exec(a.sitemapurl)?.[1] ?? a.OBJECTID}:${start.slice(0, 16)}`,
      title,
      start,
      end: null,
      allDay,
      venue: a.location ? decode(a.location) : null,
      address: a.location ? `${decode(a.location)}, תל אביב-יפו` : null,
      lat: a.lat || null, lon: a.lon || null,
      priceFrom: null,
      free: /חינם|ללא עלות|free/i.test(`${title} ${summary}`),
      category: community ? "community" : cityCategory(title, summary),
      url: a.sitemapurl,
      image: a.image_url || null,
      summary: summary.slice(0, 240) || null,
      source: "עיריית תל אביב-יפו",
    });
  }
  return out;
};

// Regular weekly happenings that never appear on ticket sites. Days: 0 = Sunday.
const WEEKLY = [
  { id: "nahalat-binyamin", title: "יריד האמנים בנחלת בנימין · Nahalat Binyamin crafts fair", days: [2, 5], from: "09:00", to: "17:00",
    venue: "נחלת בנימין", lat: 32.0668, lon: 34.7703, url: "https://www.timeout.com/israel/shopping/nahalat-binyamin-arts-and-crafts-fair" },
  { id: "dizengoff-food", title: "שוק האוכל בדיזנגוף סנטר · Dizengoff Center food market", days: [5], from: "09:00", to: "14:00",
    venue: "דיזנגוף סנטר", lat: 32.0753, lon: 34.7748, url: "https://www.google.com/maps/search/?api=1&query=Dizengoff+Center+Tel+Aviv" },
  { id: "port-farmers", title: "שוק האיכרים בנמל · Port farmers' market", days: [5], from: "08:00", to: "14:00",
    venue: "נמל תל אביב", lat: 32.0985, lon: 34.7737, url: "https://www.google.com/maps/search/?api=1&query=Tel+Aviv+Port+Market" },
];

const weeklyEvents = () => {
  const out = [];
  for (let d = 0; d < 14; d++) {
    const day = new Date(Date.now() + d * 86400_000);
    const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(day);
    const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay();
    for (const w of WEEKLY) {
      if (!w.days.includes(dow)) continue;
      const at = (hm) => israelIso(Date.parse(`${ymd}T${hm}:00Z`));
      out.push({
        id: `weekly:${w.id}:${ymd}`, title: w.title, start: at(w.from), end: at(w.to),
        venue: w.venue, address: `${w.venue}, תל אביב-יפו`, lat: w.lat, lon: w.lon,
        priceFrom: null, free: true, category: "market", url: w.url, image: null, source: "TLV Radar",
      });
    }
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

  try {
    const city = await fetchCityEvents();
    for (const ev of city) all.set(ev.id, ev);
    report.push(`city of Tel Aviv: ${city.length} events (${city.filter((e) => e.category === "community").length} community classes)`);
  } catch (e) {
    report.push(`city of Tel Aviv: FAILED ${e}`);
  }

  for (const ev of weeklyEvents()) all.set(ev.id, ev);

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
    const raw = (t) => (new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, "i").exec(it) ?? [])[1] ?? "";
    const tag = (t) => decode(raw(t));
    return { title: tag("title"), link: tag("link") || tag("guid"), pubDate: tag("pubDate"), description: tag("description"), image: rssImage(it, raw) };
  });

// A picture for the story, from whichever RSS convention the feed uses.
const rssImage = (it, raw) => {
  const attr = (re) => (re.exec(it) ?? [])[1];
  const html = (raw("description") + raw("content:encoded")).replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  const url =
    attr(/<media:content[^>]+url=["']([^"']+)["'][^>]*(?:medium=["']image|type=["']image)/i) ??
    attr(/<media:content[^>]+url=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i) ??
    attr(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) ??
    attr(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i) ??
    attr(/<enclosure[^>]+type=["']image[^>]+url=["']([^"']+)["']/i) ??
    (/<img[^>]+src=["']([^"']+)["']/i.exec(html) ?? [])[1];
  return cleanImage(url);
};

const cleanImage = (url) => {
  if (!url) return null;
  const u = url.replace(/&amp;/g, "&").trim();
  if (!/^https?:\/\//.test(u) || /pixel|spacer|1x1|feedburner|gravatar/i.test(u)) return null;
  return u.replace(/^http:/, "https:");
};

// Story pages almost always carry an og:image even when the feed doesn't.
const ogImage = async (url) => {
  try {
    const html = (await get(url)).slice(0, 200_000);
    const m = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]+content=["']([^"']+)["']/i.exec(html)
      ?? /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i.exec(html);
    return cleanImage(m?.[1]);
  } catch { return null; }
};

const summarize = (text) => {
  const s = text.replace(/\s+/g, " ").replace(/The post .* appeared first on .*$/i, "").trim();
  return s.length > 200 ? `${s.slice(0, 197).replace(/\s+\S*$/, "")}…` : s || null;
};

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
          image: r.image,
          summary: summarize(r.description),
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
  // Fill missing pictures from the story page; reuse what earlier runs found.
  let prev = new Map();
  try { prev = new Map(JSON.parse(await readFile("public/data/news.json", "utf8")).news.map((n) => [n.id, n.image])); } catch { /* first run */ }
  const todo = news.filter((n) => !n.image);
  let found = 0;
  for (let i = 0; i < todo.length; i += 6) {
    await Promise.all(todo.slice(i, i + 6).map(async (n) => {
      n.image = prev.get(n.id) ?? (await ogImage(n.url));
      if (n.image) found++;
    }));
  }
  report.push(`news images: ${news.length - todo.length} from feeds, ${found} from story pages, ${news.filter((n) => !n.image).length} without`);
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
