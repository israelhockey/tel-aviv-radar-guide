// What's playing: the Tel Aviv Cinematheque (from its public homepage listing) and Planet Ayalon
// (from the cinema chain's public booking API). Writes public/data/cinema.json.
// Run by .github/workflows/refresh-feeds.yml every two hours. No dependencies (Node 20+).
import { readFile, writeFile } from "node:fs/promises";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const get = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "he,en;q=0.8" }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
};
const decode = (s = "") => s.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#8211;/g, "–").replace(/&#8217;/g, "’")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const TZ = "Asia/Jerusalem";
const ymdIL = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
// Wall-clock Israel time → ISO with the right offset.
const isoIL = (ymd, hm) => {
  const guess = new Date(`${ymd}T${hm}:00Z`);
  const off = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" }).formatToParts(guess).find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "+2";
  return `${ymd}T${hm}:00+${String(Math.abs(Number(off.split(":")[0]))).padStart(2, "0")}:00`;
};

const cinemas = [];
const films = new Map();
const report = [];

const addShow = (cinema, f, at, booking) => {
  const key = `${cinema}:${f.id}`;
  const row = films.get(key) ?? { ...f, cinema, shows: [] };
  if (!row.shows.some((s) => s.at === at)) row.shows.push({ at, booking });
  films.set(key, row);
};

/* Tel Aviv Cinematheque */
try {
  const html = await get("https://www.cinema.co.il/");
  cinemas.push({ id: "cinematheque", name: "סינמטק תל אביב", nameEn: "Tel Aviv Cinematheque", address: "הארבעה 5, תל אביב", lat: 32.0727, lon: 34.7866, url: "https://www.cinema.co.il/" });
  // Keep links as markers, flatten every other tag, then read "title  dd.mm / hh:mm".
  const flat = html
    .replace(/<a [^>]*href="(https:\/\/www\.cinema\.co\.il\/event\/[^"]+)"[^>]*>([^<]*)<\/a>/g, (_, u, t) => `⟦${u}⟧${t}⟦/⟧`)
    .replace(/<a class="order" href="([^"]+)"[^>]*>/g, (_, u) => `⟦order:${u}⟧`)
    .replace(/<img[^>]+data-src="([^"]+)"[^>]*>/g, (_, u) => `⟦img:${u}⟧`)
    .replace(/<[^>]+>/g, " | ");
  const now = new Date();
  const re = /⟦(https:\/\/www\.cinema\.co\.il\/event\/[^⟧]+)⟧([^⟦|]{2,}?)⟦\/⟧[\s|]*(\d{1,2})\.(\d{1,2})[\s|/]*(\d{1,2}:\d{2})/g;
  let n = 0;
  for (const m of flat.matchAll(re)) {
    const [, url, title, dd, mm, hm] = m;
    let year = now.getFullYear();
    if (Number(mm) < now.getMonth() + 1 - 6) year++; // listings around New Year
    const ymd = `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const before = flat.slice(Math.max(0, m.index - 4000), m.index);
    const img = [...before.matchAll(/⟦img:([^⟧]+)⟧/g)].pop()?.[1] ?? null;
    const after = flat.slice(m.index, m.index + 1500);
    const order = /⟦order:([^⟧]+)⟧/.exec(after)?.[1] ?? null;
    const id = decodeURIComponent(url).split("/").filter(Boolean).pop();
    addShow("cinematheque", { id, title: decode(title), poster: img, link: url, minutes: null, tags: [] }, isoIL(ymd, hm.padStart(5, "0")), order ?? url);
    n++;
  }
  report.push(`cinematheque: ${n} screenings`);
} catch (e) {
  report.push(`cinematheque: FAILED ${e}`);
}

/* Planet Ayalon (Ramat Gan, next to Tel Aviv) */
try {
  const API = "https://www.yesplanet.co.il/il/data-api-service/v1/quickbook/10100";
  cinemas.push({ id: "planet-ayalon", name: "פלאנט אילון", nameEn: "Planet Ayalon", address: "קניון אילון, רמת גן", lat: 32.100334, lon: 34.826633, url: "https://www.planetcinema.co.il/cinemas/ayalon" });
  let n = 0;
  for (let d = 0; d < 3; d++) {
    const ymd = ymdIL(new Date(Date.now() + d * 86400_000));
    const j = JSON.parse(await get(`${API}/film-events/in-cinema/1025/at-date/${ymd}?attr=&lang=he_IL`));
    const byId = new Map((j.body?.films ?? []).map((f) => [f.id, f]));
    for (const ev of j.body?.events ?? []) {
      const f = byId.get(ev.filmId);
      if (!f) continue;
      const tags = (f.attributeIds ?? []).filter((a) => !/^(2d|subbed|first-subbed|\d+-plus|all)/.test(a)).slice(0, 4);
      addShow("planet-ayalon", { id: f.id, title: decode(f.name), poster: f.posterLink ?? null, link: f.link, minutes: f.length ?? null, tags, trailer: f.videoLink ?? null },
        isoIL(ymd, ev.eventDateTime.slice(11, 16)), ev.bookingLink ?? f.link);
      n++;
    }
  }
  report.push(`planet ayalon: ${n} screenings`);
} catch (e) {
  report.push(`planet ayalon: FAILED ${e}`);
}

console.log(`::notice::cinema: ${report.join(" · ")}`);
const cutoff = Date.now() - 30 * 60_000;
const list = [...films.values()]
  .map((f) => ({ ...f, shows: f.shows.filter((s) => new Date(s.at).getTime() > cutoff).sort((a, b) => a.at.localeCompare(b.at)) }))
  .filter((f) => f.shows.length)
  .sort((a, b) => a.shows[0].at.localeCompare(b.shows[0].at));

if (!list.length) {
  console.log("No screenings found; keeping the previous file.");
  process.exit(0);
}
const out = { cinemas, films: list };
try {
  const prev = JSON.parse(await readFile("public/data/cinema.json", "utf8"));
  if (JSON.stringify(prev.films) === JSON.stringify(list)) process.exit(0);
} catch { /* first run */ }
await writeFile("public/data/cinema.json", JSON.stringify({ updated: new Date().toISOString(), ...out }) + "\n");
console.log(`Wrote ${list.length} films.`);
