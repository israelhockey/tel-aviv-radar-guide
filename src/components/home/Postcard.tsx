import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import {
  useBeachForecast, useBeaches, useEventsFeed, useFoodPhotos, useParking, usePlaces, useShabbat, useWeather,
} from "@/lib/live/hooks";
import { openStateAt } from "@/lib/live/openingHours";
import { inRange } from "@/lib/live/when";
import { fmtClock, fmtWeekday } from "@/lib/live/format";
import { isEveningOut, type FeedEvent } from "@/lib/live/sources";
import { NEIGHBOURHOODS, neighbourhoodOf } from "@/lib/live/geo";
import { eventSlug, hoodSlug } from "@/lib/areas";
import { CRAVINGS, pickPhoto } from "@/lib/live/dishes";
import type { StringKey } from "@/lib/i18n";

// The home page in the Postcard look: a photo with a giant "Tel Aviv", a weather stamp,
// ticket-stub events, a sun-yellow numbers band and postcards from the neighbourhoods.

type L = { en: string; he: string };
const useL = () => {
  const { lang } = useI18n();
  return (x: L) => (lang === "he" ? x.he : x.en);
};

const tonightEvents = (events: FeedEvent[] | undefined) =>
  (events ?? []).filter((e) => isEveningOut(e) && e.category !== "market" && inRange(e.start, e.end, "tonight"));

/** Today's beach: best score and the hours it holds within a point of it. */
export const useBeachToday = () => {
  const beach = useBeachForecast();
  return useMemo(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
    const hours = (beach.data ?? []).filter((h) => h.time.startsWith(today) && h.isDay);
    if (!hours.length) return null;
    const best = Math.max(...hours.map((h) => h.score));
    const good = hours.filter((h) => h.score >= best - 1);
    return { score: best, from: good[0].time.slice(11, 16), to: `${String(Number(good[good.length - 1].time.slice(11, 13)) + 1).padStart(2, "0")}:00` };
  }, [beach.data]);
};

export const PostcardHero = () => {
  const L = useL();
  const { lang } = useI18n();
  const photos = useFoodPhotos();
  const weather = useWeather();
  const seas = useBeaches();
  const hero = photos.data?.__city?.promenade;
  const gordon = seas.data?.find((b) => b.id === "gordon") ?? seas.data?.[0];
  return (
    <section className="relative h-[460px] sm:h-[600px] overflow-hidden bg-[#0057ff]">
      {hero && <img src={hero.src} alt={L({ en: "The Tel Aviv promenade and beach", he: "הטיילת והחוף בתל אביב" })} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0057ff]/70 via-transparent to-transparent" />
      <div className="stamp absolute top-5 end-[4%] w-[150px] sm:w-[170px] p-3 rotate-[4deg] flex flex-col gap-1 text-foreground">
        <span className="text-[12px] font-bold">{L({ en: "Tel Aviv-Yafo, right now", he: "תל אביב-יפו, עכשיו" })}</span>
        <span className="font-poster text-[50px] sm:text-[56px]">{weather.data ? `${Math.round(weather.data.temp)}°` : "…"}</span>
        {gordon?.seaTemp != null && <span className="text-[13px]">{L({ en: "Sea", he: "ים" })} {Math.round(gordon.seaTemp)}°{gordon.waveHeight != null ? `, ${L({ en: "waves", he: "גלים" })} ${gordon.waveHeight.toFixed(1)} m` : ""}</span>}
        {weather.data?.sunset && <span className="text-[13px]">{L({ en: "Sunset", he: "שקיעה" })} {weather.data.sunset.slice(11, 16)}</span>}
      </div>
      <div className="absolute inset-x-[4%] -bottom-[0.12em]">
        <h1 className="font-display text-white leading-[0.8] text-[22vw] sm:text-[180px] lg:text-[196px]" style={{ fontStretch: lang === "he" ? undefined : "125%" }}>
          {lang === "he" ? "תל אביב" : "Tel Aviv"}
        </h1>
      </div>
    </section>
  );
};

export const LiveStrip = () => {
  const L = useL();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const events = useEventsFeed();
  const places = usePlaces();
  const beach = useBeachToday();
  const tonight = tonightEvents(events.data?.events).length;
  const open = useMemo(() => (places.data ?? []).filter((p) => p.kind !== "bicycle_rental" && openStateAt(p.hours).status === "open").length, [places.data]);
  const submit = (e: FormEvent) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(q.trim())}`); };
  const bits = [
    events.data && L({ en: `${tonight} events tonight`, he: `${tonight} אירועים הערב` }),
    beach && L({ en: `a ${beach.score.toFixed(1)} beach day`, he: `יום חוף של ${beach.score.toFixed(1)}` }),
    places.data && L({ en: `${open} kitchens and bars open now`, he: `${open} מטבחים וברים פתוחים עכשיו` }),
  ].filter(Boolean);
  return (
    <section className="bg-[#0057ff] text-white">
      <div className="container-page pt-12 pb-10 flex flex-wrap items-end justify-between gap-8">
        <p className="flex-1 basis-[480px] max-w-2xl text-[22px] sm:text-[28px] leading-[1.25] font-medium">
          {L({ en: "Everything happening in the city today: ", he: "כל מה שקורה בעיר היום: " })}{bits.length ? bits.join(", ") : "…"}.
        </p>
        <form onSubmit={submit} role="search" className="flex-1 basis-[340px] max-w-md flex gap-2">
          <label htmlFor="home-q" className="sr-only">{L({ en: "Search", he: "חיפוש" })}</label>
          <input id="home-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L({ en: "Search a place, a show, a craving", he: "חפשו מקום, הופעה, חשק" })} className="min-w-0 flex-1 h-14 rounded-md px-4 text-[17px] text-[#0b1a33] outline-none focus-visible:ring-4 focus-visible:ring-[#ffcb05]" />
          <button type="submit" className="h-14 rounded-md bg-[#ffcb05] px-5 text-[17px] font-extrabold text-[#0b1a33]">{L({ en: "Discover", he: "גלו" })}</button>
        </form>
      </div>
    </section>
  );
};

const TICKET_BG = ["#fff4c2", "#ffd9d4", "#d6e4ff", "#d3f9d8", "#f3d9fa", "#ffe8cc"];

export const Ticket = ({ e, i }: { e: FeedEvent; i: number }) => {
  const { t, lang } = useI18n();
  const [broken, setBroken] = useState(false);
  return (
    <Link to={`/event/${eventSlug(e)}`} className="group flex min-h-[170px] overflow-hidden rounded-[10px] text-[#0b1a33] transition-transform hover:-translate-y-1" style={{ background: TICKET_BG[i % TICKET_BG.length] }}>
      {e.image && !broken
        ? <img src={e.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="w-[112px] sm:w-[132px] shrink-0 object-cover" />
        : <span className="w-[112px] sm:w-[132px] shrink-0 bg-[#0057ff]" />}
      <span className="flex-1 min-w-0 px-4 py-4 sm:px-5 flex flex-col gap-1.5 border-s-[3px] border-dashed border-[#0b1a33]">
        <span className="font-poster text-[40px] sm:text-[44px]">{e.allDay ? (lang === "he" ? "כל היום" : "All day") : fmtClock(e.start, lang)}</span>
        <span className="text-[18px] sm:text-[20px] font-bold leading-snug line-clamp-2" dir="auto">{e.title}</span>
        {e.venue && <span className="text-[14px] truncate" dir="auto">{e.venue}</span>}
        <span className="mt-auto text-[13px] font-bold">
          {t(`cat.${e.category}` as StringKey)}{e.free ? `, ${t("on.free")}` : e.priceFrom != null ? `, ${t("on.from")} ₪${Math.round(e.priceFrom)}` : ""}
        </span>
      </span>
    </Link>
  );
};

export const TonightTickets = () => {
  const L = useL();
  const events = useEventsFeed();
  const all = tonightEvents(events.data?.events);
  // Lead with the ones that have artwork; fall back to the week when tonight is quiet.
  const week = (events.data?.events ?? []).filter((e) => isEveningOut(e) && e.category !== "market" && inRange(e.start, e.end, "week"));
  const list = (all.length >= 3 ? all : week).slice().sort((a, b) => Number(!!b.image) - Number(!!a.image)).slice(0, 6);
  const quiet = all.length < 3;
  return (
    <section className="container-page pt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-[38px] sm:text-[56px] leading-[1]">{quiet ? L({ en: "This week's tickets", he: "הכרטיסים של השבוע" }) : L({ en: "Tonight's tickets", he: "הכרטיסים של הערב" })}</h2>
        <Link to="/events" className="text-[17px] font-bold text-sea underline-offset-4 hover:underline">{L({ en: `All ${(quiet ? week : all).length} events`, he: `כל ${(quiet ? week : all).length} האירועים` })}</Link>
      </div>
      {!events.data ? <div className="mt-7 h-[180px] rounded-[10px] bg-secondary animate-pulse" /> : (
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e, i) => <Ticket key={e.id} e={e} i={i} />)}
        </div>
      )}
    </section>
  );
};

export const NumbersBand = () => {
  const L = useL();
  const { lang } = useI18n();
  const beach = useBeachToday();
  const places = usePlaces();
  const parking = useParking();
  const shabbat = useShabbat(lang);
  const open = useMemo(() => (places.data ?? []).filter((p) => p.kind !== "bicycle_rental" && openStateAt(p.hours).status === "open").length, [places.data]);
  const free = (parking.data ?? []).filter((k) => k.status === "free" || k.status === "few").length;
  const items: { n: string; label: string; to: string }[] = [
    { n: beach ? beach.score.toFixed(1) : "…", label: beach ? L({ en: `Beach score today, best ${beach.from} to ${beach.to}`, he: `ציון החוף היום, הכי טוב ${beach.from}–${beach.to}` }) : L({ en: "Beach score today", he: "ציון החוף היום" }), to: "/beach" },
    { n: places.data ? String(open) : "…", label: L({ en: "Cafés, bars and kitchens open now", he: "בתי קפה, ברים ומטבחים פתוחים עכשיו" }), to: "/food" },
    { n: parking.data ? String(free) : "…", label: L({ en: "City car parks with space", he: "חניונים עם מקום" }), to: "/live?layers=parking" },
    { n: shabbat.data?.candles ? fmtClock(shabbat.data.candles, lang) : "…", label: shabbat.data?.candles ? L({ en: `Shabbat candle lighting, ${fmtWeekday(shabbat.data.candles, "en")}`, he: `הדלקת נרות, ${fmtWeekday(shabbat.data.candles, "he")}` }) : L({ en: "Shabbat times", he: "זמני שבת" }), to: "/shabbat" },
  ];
  return (
    <section className="mt-14 bg-[#ffcb05] text-[#0b1a33]">
      <div className="container-page py-10 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
        {items.map((x) => (
          <Link key={x.to} to={x.to} className="group flex flex-col gap-1.5">
            <span className="font-poster text-[56px] sm:text-[72px] group-hover:underline decoration-4 underline-offset-4">{x.n}</span>
            <span className="text-[15px] sm:text-[16px] font-semibold leading-snug">{x.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

const CARDS: { hood: string; photo: string; blurb: L; tilt: string }[] = [
  { hood: "Jaffa", photo: "oldjaffa", blurb: { en: "The flea market, the old port and sunsets.", he: "שוק הפשפשים, הנמל העתיק והשקיעות." }, tilt: "-rotate-2" },
  { hood: "Kerem HaTeimanim", photo: "carmel", blurb: { en: "The Carmel Market and the Yemenite Quarter's lanes.", he: "שוק הכרמל וסמטאות כרם התימנים." }, tilt: "rotate-[1.5deg]" },
  { hood: "Florentin", photo: "florentin", blurb: { en: "Street art by day, the late bars by night.", he: "גרפיטי ביום, הברים המאוחרים בלילה." }, tilt: "-rotate-1" },
  { hood: "Lev HaIr", photo: "whitecity", blurb: { en: "Rothschild, the White City and the boulevard cafés.", he: "רוטשילד, העיר הלבנה ובתי הקפה בשדרה." }, tilt: "rotate-2" },
];

export const NeighbourhoodPostcards = () => {
  const L = useL();
  const { lang } = useI18n();
  const photos = useFoodPhotos();
  const places = usePlaces();
  const events = useEventsFeed();
  const counts = useMemo(() => {
    const m: Record<string, { open: number; tonight: number }> = {};
    for (const c of CARDS) m[c.hood] = { open: 0, tonight: 0 };
    for (const p of places.data ?? []) {
      const h = neighbourhoodOf(p)?.en;
      if (h && m[h] && p.kind !== "bicycle_rental" && openStateAt(p.hours).status === "open") m[h].open++;
    }
    for (const e of tonightEvents(events.data?.events)) {
      if (e.lat == null || e.lon == null) continue;
      const h = neighbourhoodOf({ lat: e.lat, lon: e.lon })?.en;
      if (h && m[h]) m[h].tonight++;
    }
    return m;
  }, [places.data, events.data]);
  return (
    <section className="container-page pt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-[38px] sm:text-[56px] leading-[1]">{L({ en: "Postcards from the neighbourhoods", he: "גלויות מהשכונות" })}</h2>
        <Link to="/area" className="text-[17px] font-bold text-sea underline-offset-4 hover:underline">{L({ en: "Every neighbourhood", he: "כל השכונות" })}</Link>
      </div>
      <div className="mt-9 grid gap-7 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => {
          const h = NEIGHBOURHOODS.find((x) => x.en === c.hood)!;
          const ph = photos.data?.__city?.[c.photo];
          const n = counts[c.hood];
          return (
            <Link key={c.hood} to={`/area/${hoodSlug(h)}`} className={`postcard flex flex-col text-foreground ${c.tilt}`}>
              {ph ? <img src={ph.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-[210px] object-cover" /> : <span className="block w-full h-[210px] bg-secondary" />}
              <span className="mt-3.5 font-display text-[26px] leading-tight">{lang === "he" ? h.he : h.en}</span>
              <span className="text-[15px]">
                {L(c.blurb)}{" "}
                {n && (n.open || n.tonight) ? L({ en: `${n.open} open now${n.tonight ? `, ${n.tonight} on tonight` : ""}.`, he: `${n.open} פתוחים עכשיו${n.tonight ? `, ${n.tonight} אירועים הערב` : ""}.` }) : ""}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export const Hungry = () => {
  const L = useL();
  const { lang } = useI18n();
  const photos = useFoodPhotos();
  const ph = pickPhoto(photos.data?.shakshuka, "home") ?? pickPhoto(photos.data?.hummus, "home");
  const chips = ["breakfast", "hummus", "coffee", "street", "pizza", "sushi", "cocktail", "icecream"];
  const colors = ["#ff5a4e", "#0b1a33", "#0057ff", "#ffcb05"];
  return (
    <section className="container-page pt-16 flex flex-wrap gap-8 items-stretch">
      {ph ? <img src={ph.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="flex-1 basis-[480px] h-[300px] sm:h-[420px] object-cover rounded-[10px]" /> : <span className="flex-1 basis-[480px] h-[300px] rounded-[10px] bg-secondary" />}
      <div className="flex-1 basis-[340px] flex flex-col justify-center gap-4">
        <h2 className="font-display text-[44px] sm:text-[56px] leading-[1]">{L({ en: "Hungry?", he: "רעבים?" })}</h2>
        <p className="text-[19px] leading-relaxed max-w-[34ch]">{L({ en: "What's open right now, by craving, with photos, hours and a page for every place.", he: "מה פתוח עכשיו, לפי חשק, עם תמונות, שעות ודף לכל מקום." })}</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((id, i) => {
            const c = CRAVINGS.find((x) => x.id === id)!;
            const bg = colors[i % colors.length];
            return <Link key={id} to={`/eat/${id}`} className="rounded-md px-4 py-3 font-bold" style={{ background: bg, color: bg === "#ffcb05" ? "#0b1a33" : "#fff" }}>{lang === "he" ? c.he : c.en}</Link>;
          })}
        </div>
        <Link to="/food" className="text-[17px] font-bold text-sea underline-offset-4 hover:underline">{L({ en: "Everything open now", he: "כל מה שפתוח עכשיו" })}</Link>
      </div>
    </section>
  );
};

