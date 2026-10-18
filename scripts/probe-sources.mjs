// One-off diagnostic: which candidate event and news sources return machine-readable data
// (schema.org Event JSON-LD, RSS/Atom, iCal, embedded JSON)? Prints a report to the log.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const URLS = process.env.PROBE_URLS ? process.env.PROBE_URLS.split(/\s+/).filter(Boolean) : [
  // events
  "https://www.eventbrite.com/d/israel--tel-aviv/events/",
  "https://www.eventbrite.com/d/israel--tel-aviv/events--this-weekend/",
  "https://ra.co/events/il/telaviv",
  "https://www.meetup.com/find/?location=il--tel-aviv&source=EVENTS",
  "https://www.barby.co.il/",
  "https://www.zappa-club.co.il/",
  "https://live.tickchak.co.il/",
  "https://www.eventer.co.il/",
  "https://www.leaan.co.il/",
  "https://www.secrettelaviv.com/tickets",
  "https://www.tamuseum.org.il/en/",
  "https://www.cinema.co.il/",
  "https://www.habima.co.il/",
  "https://www.cameri.co.il/",
  "https://www.israel-opera.co.il/",
  "https://www.ipo.co.il/",
  "https://www.tel-aviv.gov.il/en/Visit/UpcomingEvents/Pages/default.aspx",
  "https://www.tel-aviv.gov.il/Events/Pages/default.aspx",
  "https://www.timeout.co.il/",
  "https://www.go-out.co/",
  // news / feeds
  "https://www.secrettelaviv.com/feed",
  "https://www.timeout.co.il/feed",
  "https://www.timesofisrael.com/feed/",
  "https://www.jpost.com/rss/rssfeedsisraelnews.aspx",
  "https://www.ynet.co.il/Integration/StoryRss2.xml",
  "https://www.ynetnews.com/Integration/StoryRss3082.xml",
  "https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2",
  "https://www.calcalist.co.il/GeneralRSS/0,16335,L-8,00.xml",
  "https://www.haaretz.co.il/srv/htz",
  "https://www.haaretz.com/srv/haaretz-latest-headlines",
  "https://www.maariv.co.il/Rss/RssChadashot",
  "https://www.mako.co.il/rss-news-israel?partner=rss",
  "https://telavivian.com/feed",
  "https://www.tel-aviv.gov.il/_layouts/15/listfeed.aspx",
];

const count = (s, re) => (s.match(re) ?? []).length;

const probe = async (url) => {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "he,en;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    const body = await res.text();
    const ld = [...body.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
    const ldEvents = ld.reduce((n, s) => n + count(s, /"@type"\s*:\s*"(Event|MusicEvent|TheaterEvent|ExhibitionEvent|SocialEvent|ComedyEvent|Festival|ScreeningEvent|DanceEvent|EducationEvent)"/g), 0);
    return {
      url, status: res.status, ms: Date.now() - t0, type: (res.headers.get("content-type") ?? "").split(";")[0], kb: Math.round(body.length / 1024),
      ldBlocks: ld.length, ldEvents,
      rssItems: count(body, /<item[\s>]/g), atomEntries: count(body, /<entry[\s>]/g),
      ical: body.includes("BEGIN:VCALENDAR"), nextData: body.includes("__NEXT_DATA__"), nuxt: body.includes("__NUXT__"),
      icsLinks: count(body, /\.ics["'?]/g), rssLinks: count(body, /application\/rss\+xml/g),
      head: body.slice(0, 300),
      cloudflare: /cf-chl|challenge-platform|Just a moment/i.test(body),
      ldSample: ld.length ? ld.join("\n").slice(0, 2500) : undefined,
      nextSample: (() => {
        const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(body);
        if (!m) return undefined;
        try {
          const j = JSON.parse(m[1]);
          const pp = j.props?.pageProps ?? {};
          return { page: j.page, pagePropsKeys: Object.keys(pp), sample: JSON.stringify(pp).slice(0, 2500) };
        } catch { return "unparseable"; }
      })(),
      arrays: (() => {
        // Largest lists inside the embedded page data: where listings usually live.
        const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(body);
        if (!m) return undefined;
        let j; try { j = JSON.parse(m[1]); } catch { return undefined; }
        const found = [];
        const walk = (v, path, depth) => {
          if (depth > 12 || v == null || typeof v !== "object") return;
          if (Array.isArray(v)) {
            if (v.length >= 8 && v[0] && typeof v[0] === "object") found.push({ path, n: v.length, keys: Object.keys(v[0]).slice(0, 30), sample: JSON.stringify(v[0]).slice(0, 3000) });
            v.slice(0, 3).forEach((x, i) => walk(x, `${path}[${i}]`, depth + 1));
          } else for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, depth + 1);
        };
        walk(j, "$", 0);
        return found.sort((a, b) => b.n - a.n).slice(0, 8);
      })(),
      links: [...new Set([...body.matchAll(/href="([^"]*(tel-aviv|tlv|telaviv|%D7%AA%D7%9C)[^"]*)"/gi)].map((m) => m[1]))].slice(0, 15),
    };
  } catch (e) {
    return { url, error: `${String(e)} ${e?.cause?.code ?? ""} ${e?.cause?.message ?? ""}`.slice(0, 200), ms: Date.now() - t0 };
  }
};

const results = await Promise.all(URLS.map(probe));
for (const r of results) console.log(JSON.stringify(r));
await import("node:fs").then((fs) => fs.writeFileSync("probe-results.json", JSON.stringify(results, null, 1)));
