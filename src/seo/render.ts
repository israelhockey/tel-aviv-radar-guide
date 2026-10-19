// Build-time pages for search engines and link previews.
//
// The site itself is a single-page app: pages fill in once the visitor's browser runs the code.
// Google indexes that slowly, and WhatsApp/Facebook previews never see it. So at build time we
// write a real HTML file for every route, with its own title, description, share image,
// structured data and readable text. When the app starts it replaces that text with the live page.

import { ARTICLES, CATEGORY_LABEL, type Article } from "@/lib/articles";
import { WALKS } from "@/content/walks";
import { describePlace } from "@/lib/describePlace";
import { placeKindLabel } from "@/lib/live/places";
import { neighbourhoodOf, NEIGHBOURHOODS, distanceMeters, TLV_CENTER } from "@/lib/live/geo";
import { CRAVINGS, dishOf, pickPhoto } from "@/lib/live/dishes";
import { findPlaces, placeSlug } from "@/lib/placeMatch";
import {
  AREA_KINDS, MIN_PER_PAGE, eventSlug, eventsNear, hoodSlug, placesForCraving, placesInHood, placesOfKind,
} from "@/lib/areas";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { FeedEvent, Hotel, Place } from "@/lib/live/sources";

type Photo = { src: string; by?: string; license?: string; page?: string };
export type Data = {
  places: Place[];
  hotels: Hotel[];
  events: FeedEvent[];
  photos: { dishes: Record<string, Photo[]>; city: Record<string, Photo> };
  now: string; // ISO time of the build
};
export type Page = {
  path: string;
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
  jsonld: object[];
  body: string;
  priority?: number;
  changefreq?: "hourly" | "daily" | "weekly" | "monthly";
  lastmod?: string;
};

// ---------- helpers ----------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s: string, n = 158) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…`);
const abs = (path: string) => `${SITE_URL}${path}`;
const nameOf = (p: { name: string; nameEn?: string }) => p.nameEn || p.name;

const crumbs = (items: [string, string][]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
});
const itemList = (name: string, items: [string, string][]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  itemListElement: items.slice(0, 50).map(([n, path], i) => ({ "@type": "ListItem", position: i + 1, name: n, url: abs(path) })),
});

const photoFor = (d: Data, spec?: string, seed = ""): Photo | undefined => {
  if (!spec) return undefined;
  if (spec.startsWith("dish:")) return pickPhoto(d.photos.dishes[spec.slice(5)], seed || spec);
  if (spec.startsWith("city:")) return d.photos.city[spec.slice(5)];
  return { src: spec };
};

const NAV: [string, string][] = [
  ["What's on", "/events"], ["Food", "/food"], ["Beach", "/beach"], ["Magazine", "/magazine"], ["Hotels", "/hotels"],
  ["Walking tours", "/walks"], ["Neighbourhoods", "/area"], ["Live map", "/live"], ["News", "/news"], ["Jobs", "/jobs"],
];
const frame = (inner: string) =>
  `<div class="container-page py-8"><nav aria-label="Sections"><a href="/"><strong>${SITE_NAME}</strong></a> · ${NAV.map(([n, p]) => `<a href="${p}">${n}</a>`).join(" · ")}</nav><main>${inner}</main></div>`;

const placeLine = (p: Place) => {
  const hood = neighbourhoodOf(p);
  const bits = [placeKindLabel(p.kind, "en"), hood?.en, p.street && `${p.street}${p.number ? ` ${p.number}` : ""}`].filter(Boolean);
  return `<li><a href="/place/${placeSlug(p)}">${esc(nameOf(p))}</a> · ${esc(bits.join(", "))}</li>`;
};

// ---------- markdown (same rules as the on-site renderer) ----------

const inline = (t: string) =>
  esc(t)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => `<a href="${href}">${label}</a>`);

const params = (s: string) =>
  Object.fromEntries(s.split(";").map((kv) => kv.split("=").map((x) => x.trim())).filter((kv) => kv[0]).map(([k, v]) => [k, v ?? "1"]));

const blockHtml = (d: Data, raw: string): string => {
  const m = /^\[\[(\w+):\s*([\s\S]*)\]\]$/.exec(raw.trim());
  if (!m) return "";
  const [, kind, rest] = m;
  const [first, ...more] = rest.split("|");
  const text = more.join("|").trim();
  switch (kind) {
    case "pick": {
      const p = findPlaces(d.places, first.trim())[0];
      const title = p ? `<a href="/place/${placeSlug(p)}">${esc(first.trim())}</a>` : esc(first.trim());
      const where = p ? [neighbourhoodOf(p)?.en, p.street && `${p.street}${p.number ? ` ${p.number}` : ""}`].filter(Boolean).join(", ") : "";
      return `<section><h3>${title}</h3>${where ? `<p><small>${esc(where)}</small></p>` : ""}<p>${inline(text)}</p></section>`;
    }
    case "list": {
      const q = params(rest);
      const crave = CRAVINGS.find((c) => c.id === q.craving);
      const list = (crave ? placesForCraving(d.places, crave) : d.places.filter((p) => p.kind !== "bicycle_rental"))
        .filter((p) => (q.kind ? q.kind.split(",").includes(p.kind) : true))
        .filter((p) => (q.kosher ? p.kosher === "yes" || p.kosher === "only" : true))
        .filter((p) => (q.vegan ? p.vegan === "yes" || p.vegan === "only" : true))
        .filter((p) => (q.outdoor ? p.outdoor : true))
        .sort((a, b) => distanceMeters(TLV_CENTER, a) - distanceMeters(TLV_CENTER, b))
        .slice(0, Number(q.limit ?? 8));
      return list.length ? `<section><h4>${esc(q.title ?? "More places on the map")}</h4><ul>${list.map(placeLine).join("")}</ul></section>` : "";
    }
    case "events": return `<p><a href="/events">See what's on in Tel Aviv</a></p>`;
    case "tip": return `<aside><p><strong>Tip:</strong> ${inline(rest.trim())}</p></aside>`;
    case "photo": {
      const ph = photoFor(d, first.trim());
      return ph ? `<figure><img src="${esc(ph.src)}" alt="${esc(text)}" loading="lazy"><figcaption>${esc(text)}</figcaption></figure>` : "";
    }
    default: return "";
  }
};

export const markdownHtml = (d: Data, src: string) => {
  const lines = src.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.trim().startsWith("[[")) {
      let buf = line;
      while (!buf.trim().endsWith("]]") && i + 1 < lines.length) buf += "\n" + lines[++i];
      out.push(blockHtml(d, buf));
      continue;
    }
    const h = /^(#{2,4})\s+(.*)$/.exec(line);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(`<li>${inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>`);
        i++;
      }
      i--;
      out.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }
    if (line.startsWith(">")) { out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`); continue; }
    const para = [line];
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|\[\[|>|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i + 1])) para.push(lines[++i]);
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
};

const plain = (md: string) =>
  md.replace(/\[\[[\s\S]*?\]\]/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[#*>_]/g, "").replace(/\s+/g, " ").trim();

// ---------- pages ----------

const ORG = { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: abs("/icons/icon-512.png") };

const sectionPages = (d: Data): Page[] => {
  const S = (path: string, title: string, description: string, extra = "", priority = 0.8, changefreq: Page["changefreq"] = "daily"): Page => ({
    path, title, description, jsonld: [], priority, changefreq,
    body: frame(`<h1>${esc(title.replace(` · ${SITE_NAME}`, ""))}</h1><p>${esc(description)}</p>${extra}`),
  });
  const upcoming = d.events.slice(0, 60);
  const evList = `<ul>${upcoming.map((e) => `<li><a href="/event/${eventSlug(e)}">${esc(e.title)}</a> · ${esc(new Date(e.start).toUTCString().slice(0, 16))}${e.venue ? ` · ${esc(e.venue)}` : ""}</li>`).join("")}</ul>`;
  const mag = `<ul>${ARTICLES.map((a) => `<li><a href="/magazine/${a.slug}">${esc(a.title)}</a> · ${esc(a.dek)}</li>`).join("")}</ul>`;
  const home: Page = {
    path: "/",
    title: "Discover Tel Aviv · Events, food, beaches and the city right now",
    description: "Everything Tel Aviv in one place: every event tonight and this weekend, the best food and bars, beach conditions, Shabbat times, traffic, parking and a live city map. Free.",
    priority: 1, changefreq: "hourly",
    jsonld: [
      { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, inLanguage: ["en", "he"] },
      { "@context": "https://schema.org", ...ORG },
    ],
    body: frame(`<h1>Discover Tel Aviv</h1><p>Tel Aviv right now: what's on tonight, where to eat, the beach, the news and a live map of the city.</p><h2>Coming up</h2>${evList}<h2>From the magazine</h2>${mag}`),
  };
  const hoodLinks = `<ul>${NEIGHBOURHOODS.map((h) => `<li><a href="/area/${hoodSlug(h)}">${esc(h.en)}</a></li>`).join("")}</ul>`;
  const cravingLinks = `<ul>${CRAVINGS.map((c) => `<li><a href="/eat/${c.id}">${esc(c.en)} in Tel Aviv</a></li>`).join("")}</ul>`;
  return [
    home,
    { ...S("/events", "What's on in Tel Aviv: events tonight, this week and this weekend · Discover Tel Aviv", "Every event in Tel Aviv in one calendar: concerts, comedy, theatre, parties, markets, festivals and free city events, updated every two hours.", evList, 0.9, "hourly"),
      jsonld: [itemList("Events in Tel Aviv", upcoming.map((e) => [e.title, `/event/${eventSlug(e)}`]))] },
    S("/weekend", "This weekend in Tel Aviv · Discover Tel Aviv", "The best things to do in Tel Aviv this weekend: our picks of concerts, shows and parties, Friday markets, the beach outlook and Shabbat times.", evList, 0.9, "daily"),
    S("/free", "Free things to do in Tel Aviv this week · Discover Tel Aviv", "Free events in Tel Aviv this week: concerts, talks, markets, festivals and city events that cost nothing.", "", 0.8, "daily"),
    S("/food", "Where to eat in Tel Aviv: restaurants, cafés and bars · Discover Tel Aviv", "Find somewhere to eat in Tel Aviv by craving: hummus, coffee, brunch, sushi, pizza, burgers, cocktails and more, with opening hours and what's open now.", cravingLinks + hoodLinks, 0.9),
    S("/beach", "Tel Aviv beaches today: sea, wind, UV and jellyfish · Discover Tel Aviv", "Today's beach conditions in Tel Aviv: wave height, wind, water temperature, UV, jellyfish reports and the best hours to go, beach by beach.", "", 0.9, "hourly"),
    S("/magazine", "The Discover Tel Aviv magazine: best of guides and city stories", "Our guides to Tel Aviv: the best hummus, coffee, bars and brunch, neighbourhood guides, holidays, and practical help for visitors and newcomers.", mag, 0.9),
    S("/hotels", "Where to stay in Tel Aviv: hotels and hostels by area · Discover Tel Aviv", "Hotels, hostels and apartments in Tel Aviv on a map, with what's nearby: the beach, food, and what's on tonight.",
      `<ul>${d.hotels.map((h) => `<li><a href="/hotel/${h.id}">${esc(nameOf(h))}</a></li>`).join("")}</ul>`, 0.9, "weekly"),
    S("/walks", "Free self-guided walking tours of Tel Aviv · Discover Tel Aviv", "Free walking tours you can do on your own: the White City's Bauhaus, Old Jaffa, Florentin street art, the Carmel Market and the promenade.",
      `<ul>${WALKS.map((w) => `<li><a href="/walks/${w.slug}">${esc(w.title)}</a> · ${esc(w.dek)}</li>`).join("")}</ul>`, 0.8, "monthly"),
    S("/area", "Tel Aviv neighbourhoods: where to eat, drink and go · Discover Tel Aviv", "Guides to every Tel Aviv neighbourhood, from Jaffa and Florentin to the Old North and the Port: restaurants, cafés, bars and what's on nearby.", hoodLinks, 0.8, "weekly"),
    S("/live", "Live map of Tel Aviv: traffic, parking, bikes and events · Discover Tel Aviv", "A live map of Tel Aviv: Waze traffic and road reports, free spaces in city car parks, Tel-O-Fun bikes, weekend shuttles and tonight's events.", "", 0.7, "hourly"),
    S("/news", "Tel Aviv news today · Discover Tel Aviv", "The latest Tel Aviv and Israel news in English and Hebrew, from the city's main outlets, in one place.", "", 0.7, "hourly"),
    S("/shabbat", "Shabbat times in Tel Aviv this week · Discover Tel Aviv", "Candle lighting and Havdalah times in Tel Aviv this week, plus what's open on Shabbat: shops, buses, the weekend shuttle and beaches.", "", 0.8, "daily"),
    S("/cinema", "Movies in Tel Aviv today: cinema showtimes · Discover Tel Aviv", "What's playing at Tel Aviv cinemas today, with showtimes and tickets, from Planet Ayalon to the Cinematheque.", "", 0.8, "daily"),
    S("/getting-around", "Getting around Tel Aviv: buses, trains, bikes and taxis · Discover Tel Aviv", "How to get around Tel Aviv: the light rail, buses, trains, Tel-O-Fun bikes, scooters, taxis, the airport and the Shabbat shuttle.", "", 0.7, "monthly"),
    S("/guide", "Tel Aviv city guide: everything visitors and newcomers need · Discover Tel Aviv", "Practical help for Tel Aviv: money, phones, safety and shelters, public toilets, dog parks, Shabbat, and where to find what.", "", 0.7, "monthly"),
    S("/jobs", "Jobs in Tel Aviv: open positions at tech companies · Discover Tel Aviv", "Open jobs in Tel Aviv from the city's tech companies and startups, updated every day.", "", 0.7, "daily"),
    S("/newsletter", "The Discover Tel Aviv weekly email", "Every Thursday: the best of the weekend in Tel Aviv, new places to eat and drink, and what's coming up.", "", 0.4, "monthly"),
  ];
};

const articlePage = (d: Data, a: Article): Page => {
  const ph = photoFor(d, a.cover, a.slug);
  const cat = CATEGORY_LABEL[a.category]?.en ?? "Magazine";
  const related = ARTICLES.filter((x) => x.slug !== a.slug && x.category === a.category).slice(0, 4);
  return {
    path: `/magazine/${a.slug}`,
    title: `${a.title} · ${SITE_NAME}`,
    description: clip(a.dek || plain(a.body)),
    image: ph?.src, type: "article", priority: 0.8, changefreq: "weekly", lastmod: a.updated ?? a.date,
    jsonld: [
      {
        "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.dek,
        image: ph?.src ? [ph.src] : undefined, datePublished: a.date, dateModified: a.updated ?? a.date,
        author: { "@type": "Organization", name: a.author || SITE_NAME, url: SITE_URL }, publisher: ORG,
        mainEntityOfPage: abs(`/magazine/${a.slug}`), inLanguage: a.lang, keywords: a.tags.join(", "),
      },
      crumbs([["Magazine", "/magazine"], [cat, `/magazine?cat=${a.category}`], [a.title, `/magazine/${a.slug}`]]),
    ],
    body: frame(`<article><p><a href="/magazine">${esc(cat)}</a></p><h1>${esc(a.title)}</h1><p><strong>${esc(a.dek)}</strong></p>${ph ? `<img src="${esc(ph.src)}" alt="" />` : ""}${markdownHtml(d, a.body)}</article>${related.length ? `<h2>More ${esc(cat.toLowerCase())}</h2><ul>${related.map((r) => `<li><a href="/magazine/${r.slug}">${esc(r.title)}</a></li>`).join("")}</ul>` : ""}`),
  };
};

const SCHEMA_KIND: Record<string, string> = {
  restaurant: "Restaurant", cafe: "CafeOrCoffeeShop", bar: "BarOrPub", pub: "BarOrPub", biergarten: "BarOrPub",
  fast_food: "FastFoodRestaurant", ice_cream: "IceCreamShop",
};

const placePage = (d: Data, p: Place): Page => {
  const name = nameOf(p);
  const hood = neighbourhoodOf(p);
  const kind = placeKindLabel(p.kind, "en");
  const lines = describePlace(p, "en");
  const ph = pickPhoto(d.photos.dishes[dishOf(p)], p.id);
  const street = p.street ? `${p.street}${p.number ? ` ${p.number}` : ""}` : undefined;
  const nearby = d.places.filter((x) => x.id !== p.id && x.kind !== "bicycle_rental" && distanceMeters(p, x) < 450)
    .sort((a, b) => distanceMeters(p, a) - distanceMeters(p, b)).slice(0, 8);
  const mentions = ARTICLES.filter((a) => a.body.includes(p.name) || (p.nameEn && a.body.includes(p.nameEn))).slice(0, 4);
  const hoodPath = hood ? `/area/${hoodSlug(hood)}` : "/area";
  return {
    path: `/place/${placeSlug(p)}`,
    title: `${name} · ${kind}${hood ? ` in ${hood.en}` : ""}, Tel Aviv · ${SITE_NAME}`,
    description: clip(`${lines.join(" ")} Opening hours, map, directions and what's nearby.`),
    image: ph?.src, priority: 0.6, changefreq: "weekly",
    jsonld: [
      {
        "@context": "https://schema.org", "@type": SCHEMA_KIND[p.kind] ?? "LocalBusiness", name,
        alternateName: p.nameEn && p.nameEn !== p.name ? p.name : undefined,
        address: { "@type": "PostalAddress", streetAddress: street, addressLocality: "Tel Aviv-Yafo", addressCountry: "IL" },
        geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lon },
        servesCuisine: p.cuisine ? p.cuisine.split(/[;,]/).map((c) => c.trim().replace(/_/g, " ")) : undefined,
        openingHours: p.hours && p.hours !== "24/7" ? p.hours.split(";").map((s) => s.trim()).filter(Boolean) : p.hours === "24/7" ? "Mo-Su 00:00-23:59" : undefined,
        url: p.web, sameAs: p.insta ? [`https://instagram.com/${p.insta.replace(/^@/, "")}`] : undefined, image: ph?.src,
      },
      crumbs([["Food", "/food"], [hood?.en ?? "Tel Aviv", hoodPath], [name, `/place/${placeSlug(p)}`]]),
    ],
    body: frame(`<h1>${esc(name)}</h1><p>${esc(kind)}${hood ? ` · <a href="${hoodPath}">${esc(hood.en)}</a>` : ""}${street ? ` · ${esc(street)}` : ""}</p>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}${p.hours ? `<h2>Opening hours</h2><p>${esc(p.hours)}</p>` : ""}${mentions.length ? `<h2>In our guides</h2><ul>${mentions.map((a) => `<li><a href="/magazine/${a.slug}">${esc(a.title)}</a></li>`).join("")}</ul>` : ""}${nearby.length ? `<h2>Nearby</h2><ul>${nearby.map(placeLine).join("")}</ul>` : ""}`),
  };
};

const HOTEL_SCHEMA: Record<string, string> = { hotel: "Hotel", hostel: "Hostel", guest_house: "BedAndBreakfast", apartment: "Apartment", motel: "Motel" };
const HOTEL_KIND: Record<string, string> = { hotel: "Hotel", hostel: "Hostel", guest_house: "Guest house", apartment: "Apartments", motel: "Motel" };

const hotelPage = (d: Data, h: Hotel): Page => {
  const name = nameOf(h);
  const hood = neighbourhoodOf(h);
  const street = h.street ? `${h.street}${h.number ? ` ${h.number}` : ""}` : undefined;
  const kind = HOTEL_KIND[h.kind] ?? "Hotel";
  const food = d.places.filter((x) => x.kind !== "bicycle_rental" && distanceMeters(h, x) < 400).sort((a, b) => distanceMeters(h, a) - distanceMeters(h, b)).slice(0, 8);
  const desc = `${name} is a ${kind.toLowerCase()}${hood ? ` in ${hood.en}` : ""}, Tel Aviv${street ? `, on ${street}` : ""}${h.stars ? `, rated ${h.stars} stars` : ""}. See it on the map with the beach, restaurants and what's on nearby.`;
  return {
    path: `/hotel/${h.id}`,
    title: `${name} · ${kind}${hood ? ` in ${hood.en}` : ""}, Tel Aviv · ${SITE_NAME}`,
    description: clip(desc), priority: 0.6, changefreq: "weekly",
    jsonld: [
      {
        "@context": "https://schema.org", "@type": HOTEL_SCHEMA[h.kind] ?? "LodgingBusiness", name,
        address: { "@type": "PostalAddress", streetAddress: street, addressLocality: "Tel Aviv-Yafo", addressCountry: "IL" },
        geo: { "@type": "GeoCoordinates", latitude: h.lat, longitude: h.lon },
        starRating: h.stars ? { "@type": "Rating", ratingValue: h.stars } : undefined,
        numberOfRooms: h.rooms, url: h.web,
        amenityFeature: h.wifi ? [{ "@type": "LocationFeatureSpecification", name: "Wi-Fi", value: true }] : undefined,
      },
      crumbs([["Hotels", "/hotels"], [name, `/hotel/${h.id}`]]),
    ],
    body: frame(`<h1>${esc(name)}</h1><p>${esc(desc)}</p>${food.length ? `<h2>Eat and drink nearby</h2><ul>${food.map(placeLine).join("")}</ul>` : ""}<p><a href="/hotels">More places to stay in Tel Aviv</a></p>`),
  };
};

const walkPage = (d: Data, w: (typeof WALKS)[number]): Page => {
  const ph = photoFor(d, w.cover);
  return {
    path: `/walks/${w.slug}`,
    title: `${w.title}: a free self-guided walking tour · ${SITE_NAME}`,
    description: clip(`${w.dek} ${w.stops.length} stops with a map.`),
    image: ph?.src, type: "article", priority: 0.7, changefreq: "monthly",
    jsonld: [
      {
        "@context": "https://schema.org", "@type": "TouristTrip", name: w.title, description: w.dek, touristType: "Self-guided walk",
        itinerary: { "@type": "ItemList", itemListElement: w.stops.map((s, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "TouristAttraction", name: s.name, description: s.text, geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lon } } })) },
        provider: ORG,
      },
      crumbs([["Walking tours", "/walks"], [w.title, `/walks/${w.slug}`]]),
    ],
    body: frame(`<h1>${esc(w.title)}</h1><p>${esc(w.dek)}</p><ol>${w.stops.map((s) => `<li><h2>${esc(s.name)}</h2><p>${esc(s.text)}</p></li>`).join("")}</ol>`),
  };
};

const fmtWhen = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }).format(new Date(iso));

const eventPage = (_d: Data, e: FeedEvent): Page => {
  const when = fmtWhen(e.start);
  const desc = `${e.title}${e.venue ? ` at ${e.venue}` : ""}, ${when}.${e.free ? " Free entry." : e.priceFrom != null ? ` Tickets from ₪${Math.round(e.priceFrom)}.` : ""} ${e.summary ?? ""}`;
  return {
    path: `/event/${eventSlug(e)}`,
    title: `${e.title} · ${when.replace(/ at .*$/, "")} · Tel Aviv · ${SITE_NAME}`,
    description: clip(desc.trim()), image: e.image ?? undefined, priority: 0.5, changefreq: "daily",
    jsonld: [
      {
        "@context": "https://schema.org", "@type": "Event", name: e.title, startDate: e.start, endDate: e.end ?? undefined,
        eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: { "@type": "Place", name: e.venue ?? "Tel Aviv", address: { "@type": "PostalAddress", streetAddress: e.address ?? undefined, addressLocality: "Tel Aviv-Yafo", addressCountry: "IL" },
          geo: e.lat != null ? { "@type": "GeoCoordinates", latitude: e.lat, longitude: e.lon } : undefined },
        image: e.image ? [e.image] : undefined, description: e.summary ?? undefined,
        offers: { "@type": "Offer", url: e.url, price: e.free ? 0 : e.priceFrom ?? undefined, priceCurrency: "ILS", availability: "https://schema.org/InStock" },
      },
      crumbs([["What's on", "/events"], [e.title, `/event/${eventSlug(e)}`]]),
    ],
    body: frame(`<h1>${esc(e.title)}</h1><p><strong>${esc(when)}</strong>${e.venue ? ` · ${esc(e.venue)}` : ""}</p>${e.summary ? `<p>${esc(e.summary)}</p>` : ""}<p><a href="${esc(e.url)}" rel="nofollow">Tickets and details</a></p><p><a href="/events">More events in Tel Aviv</a></p>`),
  };
};

const areaPages = (d: Data): Page[] => {
  const out: Page[] = [];
  for (const h of NEIGHBOURHOODS) {
    const all = placesInHood(d.places, h);
    if (!all.length) continue;
    const slug = hoodSlug(h);
    const kinds = AREA_KINDS.map((k) => ({ k, list: placesOfKind(all, k) })).filter((x) => x.list.length >= MIN_PER_PAGE);
    const guide = ARTICLES.find((a) => a.title.includes(h.en) && a.category === "neighbourhoods");
    const ev = eventsNear(d.events, h).slice(0, 10);
    out.push({
      path: `/area/${slug}`,
      title: `${h.en}, Tel Aviv: where to eat, drink and go · ${SITE_NAME}`,
      description: clip(`A guide to ${h.en} in Tel Aviv: ${kinds.map(({ k, list }) => `${list.length} ${k.en.toLowerCase()}`).join(", ")}, with opening hours, a map and what's on nearby.`),
      priority: 0.7, changefreq: "weekly",
      jsonld: [crumbs([["Neighbourhoods", "/area"], [h.en, `/area/${slug}`]]), itemList(`Places in ${h.en}`, all.slice(0, 50).map((p) => [nameOf(p), `/place/${placeSlug(p)}`]))],
      body: frame(`<h1>${esc(h.en)}</h1>${guide ? `<p>Read our <a href="/magazine/${guide.slug}">${esc(guide.title)}</a>.</p>` : ""}${kinds.map(({ k, list }) => `<h2><a href="/area/${slug}/${k.id}">${esc(k.en)} in ${esc(h.en)}</a></h2><ul>${list.slice(0, 8).map(placeLine).join("")}</ul>`).join("")}${ev.length ? `<h2>On nearby</h2><ul>${ev.map((e) => `<li><a href="/event/${eventSlug(e)}">${esc(e.title)}</a></li>`).join("")}</ul>` : ""}`),
    });
    for (const { k, list } of kinds) {
      out.push({
        path: `/area/${slug}/${k.id}`,
        title: `${k.en} in ${h.en}, Tel Aviv · ${SITE_NAME}`,
        description: clip(`All ${list.length} ${k.en.toLowerCase()} in ${h.en}, Tel Aviv, on one map: opening hours, what's open now, kosher and vegan options, and directions.`),
        priority: 0.6, changefreq: "weekly",
        jsonld: [crumbs([["Neighbourhoods", "/area"], [h.en, `/area/${slug}`], [k.en, `/area/${slug}/${k.id}`]]), itemList(`${k.en} in ${h.en}`, list.map((p) => [nameOf(p), `/place/${placeSlug(p)}`]))],
        body: frame(`<h1>${esc(k.en)} in ${esc(h.en)}</h1><ul>${list.map(placeLine).join("")}</ul><p><a href="/area/${slug}">More in ${esc(h.en)}</a></p>`),
      });
    }
  }
  return out;
};

const cravingPages = (d: Data): Page[] =>
  CRAVINGS.map((c) => {
    const list = placesForCraving(d.places, c);
    const guide = ARTICLES.find((a) => a.slug.includes(c.id) || a.tags.some((t) => t.toLowerCase() === c.en.toLowerCase()));
    return {
      path: `/eat/${c.id}`,
      title: `${c.en} in Tel Aviv: ${list.length} places on the map · ${SITE_NAME}`,
      description: clip(`Where to find ${c.en.toLowerCase()} in Tel Aviv: ${list.length} places with opening hours, what's open now, and directions, plus our picks of the best.`),
      image: d.photos.dishes[c.id]?.[0]?.src, priority: 0.8, changefreq: "weekly",
      jsonld: [crumbs([["Food", "/food"], [c.en, `/eat/${c.id}`]]), itemList(`${c.en} in Tel Aviv`, list.map((p) => [nameOf(p), `/place/${placeSlug(p)}`]))],
      body: frame(`<h1>${esc(c.en)} in Tel Aviv</h1>${guide ? `<p>Our picks: <a href="/magazine/${guide.slug}">${esc(guide.title)}</a></p>` : ""}<ul>${list.slice(0, 120).map(placeLine).join("")}</ul>`),
    } satisfies Page;
  });

export const renderSite = (d: Data): Page[] => {
  const nowMs = Date.parse(d.now);
  const events = d.events.filter((e) => Date.parse(e.end ?? e.start) > nowMs);
  const data = { ...d, events };
  return [
    ...sectionPages(data),
    ...ARTICLES.map((a) => articlePage(data, a)),
    ...WALKS.map((w) => walkPage(data, w)),
    ...areaPages(data),
    ...cravingPages(data),
    ...d.places.filter((p) => p.kind !== "bicycle_rental" && p.name).map((p) => placePage(data, p)),
    ...d.hotels.map((h) => hotelPage(data, h)),
    ...events.map((e) => eventPage(data, e)),
  ];
};
export { SITE_URL } from "@/lib/site";
