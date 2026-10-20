import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useEventsFeed, usePlaces, useTelofan, useWeather } from "@/lib/live/hooks";
import { fmtClock } from "@/lib/live/format";
import { inRange } from "@/lib/live/when";
import { isEveningOut, type FeedEvent } from "@/lib/live/sources";
import { openStateAt } from "@/lib/live/openingHours";
import { NEIGHBOURHOODS, neighbourhoodOf } from "@/lib/live/geo";
import { eventSlug, hoodSlug } from "@/lib/areas";

// The After Dark look for the going-out pages: a huge headline, a marquee of tonight's shows,
// and where the night goes, all from live data.

const BAR_KINDS = ["bar", "pub", "biergarten"];

const useTonight = () => {
  const events = useEventsFeed();
  return useMemo(() => {
    const all = (events.data?.events ?? []).filter((e) => isEveningOut(e) && e.category !== "market");
    const tonight = all.filter((e) => inRange(e.start, e.end, "tonight"));
    const week = all.filter((e) => inRange(e.start, e.end, "week"));
    const list = tonight.length >= 3 ? tonight : week;
    const lead = list.find((e) => e.image) ?? list[0];
    return { loaded: !!events.data, tonight, week, list, lead, quiet: tonight.length < 3 };
  }, [events.data]);
};

export const NightHero = ({ title, sub, onList = true }: { title?: [string, string]; sub?: string; onList?: boolean }) => {
  const { t, lang } = useI18n();
  const he = lang === "he";
  const weather = useWeather();
  const places = usePlaces();
  const { loaded, tonight, list, lead, quiet } = useTonight();
  const [broken, setBroken] = useState(false);
  const barsOpen = useMemo(() => (places.data ?? []).filter((p) => BAR_KINDS.includes(p.kind) && openStateAt(p.hours).status === "open").length, [places.data]);
  const now = new Intl.DateTimeFormat(he ? "he-IL" : "en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jerusalem" }).format(new Date());
  const [l1, l2] = title ?? (he ? ["הלילה", "עוד צעיר"] : ["The night", "is young"]);
  const line = sub ?? (loaded
    ? he
      ? `${quiet ? `${list.length} הופעות השבוע` : `${tonight.length} הופעות הערב`}${places.data ? `, ${barsOpen} ברים פתוחים עכשיו` : ""}. לכאן כולם הולכים.`
      : `${quiet ? `${list.length} shows this week` : `${tonight.length} shows tonight`}${places.data ? `, ${barsOpen} bars pouring right now` : ""}. Here's where everyone is going.`
    : "…");
  return (
    <section className="flex flex-wrap items-stretch min-h-[560px] lg:min-h-[640px]">
      <div className="flex-1 basis-[520px] px-[4%] pt-10 pb-12 flex flex-col justify-end gap-5">
        <p className="text-[15px] font-semibold text-muted-foreground">
          {now}{he ? " בתל אביב" : " in Tel Aviv"}{weather.data ? `. ${Math.round(weather.data.temp)}°${weather.data.windKmh < 10 ? (he ? " ובלי רוח" : " and no wind") : ""}.` : "."}
        </p>
        <h1 className="font-display leading-[0.82] text-[78px] sm:text-[130px] lg:text-[170px]">
          {l1}<br /><span className="night-outline">{l2}</span>
        </h1>
        <p className="text-[19px] sm:text-[21px] leading-relaxed max-w-[36ch]">{line}</p>
        <div className="flex flex-wrap gap-2.5">
          {onList ? (
            <a href="#list" onClick={(ev) => { ev.preventDefault(); document.getElementById("list")?.scrollIntoView({ behavior: "smooth" }); }} className="rounded-full bg-accent px-6 py-4 text-[17px] font-extrabold text-accent-foreground">{quiet ? t("now.seeWeek") : t("hero.seeTonight")}</a>
          ) : (
            <Link to="/events" className="rounded-full bg-accent px-6 py-4 text-[17px] font-extrabold text-accent-foreground">{t("hero.seeTonight")}</Link>
          )}
          <Link to="/nightlife" className="rounded-full border-2 border-[#7a5cff] px-6 py-4 text-[17px] font-extrabold">{he ? "ברים פתוחים עד מאוחר" : "Bars open late"}</Link>
        </div>
      </div>
      <div className="relative flex-1 basis-[420px] min-h-[420px] bg-secondary">
        {lead?.image && !broken && <img src={lead.image} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />}
        {lead && (
          <Link to={`/event/${eventSlug(lead)}`} className="absolute start-5 bottom-5 end-5 sm:end-auto max-w-[420px] bg-[#7a5cff] text-white px-4 py-3 rounded-[4px] flex flex-col gap-0.5">
            <span className="font-poster text-[36px] sm:text-[40px] leading-none uppercase">{lead.allDay ? "" : `${fmtClock(lead.start, lang)} `}{(lead.venue ?? "").split(",")[0]}</span>
            <span className="font-semibold line-clamp-2" dir="auto">{lead.title}{lead.priceFrom != null ? `, ${t("on.from")} ₪${Math.round(lead.priceFrom)}` : ""}</span>
          </Link>
        )}
      </div>
    </section>
  );
};

export const NightMarquee = () => {
  const { lang } = useI18n();
  const { list } = useTonight();
  if (!list.length) return null;
  const items = list.slice(0, 14);
  const run = [...items, ...items];
  return (
    <div className="overflow-hidden border-y-2 border-accent bg-card" dir="ltr">
      <div className="night-marquee flex w-max gap-10 py-4 font-poster text-[26px] sm:text-[30px] uppercase whitespace-nowrap hover:[animation-play-state:paused]">
        {run.map((e, i) => (
          <Link key={`${e.id}-${i}`} to={`/event/${eventSlug(e)}`} className="inline-flex items-center gap-10 hover:text-accent">
            <span dir="auto">{e.allDay ? "" : `${fmtClock(e.start, lang)} `}{e.title.length > 34 ? `${e.title.slice(0, 32)}…` : e.title}</span>
            <span className="text-accent" aria-hidden>✦</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

/** "Who's on": big poster tiles for the headline shows. */
export const WhosOn = () => {
  const { t, lang } = useI18n();
  const { list, quiet } = useTonight();
  const shown = list.filter((e) => e.image).slice(0, 6);
  if (shown.length < 3) return null;
  return (
    <section className="container-page pt-16">
      <h2 className="font-display text-[60px] sm:text-[84px] leading-[0.9]">{quiet ? (lang === "he" ? "השבוע" : "This week") : (lang === "he" ? "מי מופיע" : "Who's on")}</h2>
      <div className="mt-7 grid gap-4 grid-cols-2 lg:grid-cols-3">
        {shown.map((e, i) => <NightPoster key={e.id} e={e} hot={i % 2 === 0} t={t} />)}
      </div>
    </section>
  );
};

const NightPoster = ({ e, hot, t }: { e: FeedEvent; hot: boolean; t: (k: StringKey) => string }) => {
  const { lang } = useI18n();
  const [broken, setBroken] = useState(false);
  return (
    <Link to={`/event/${eventSlug(e)}`} className="group relative block aspect-[3/4] overflow-hidden rounded-[4px] bg-secondary">
      {e.image && !broken && <img src={e.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />}
      <span className={`absolute top-3 start-3 px-2.5 py-1 text-[13px] font-extrabold rounded-[2px] ${hot ? "bg-accent text-accent-foreground" : "bg-[#7a5cff] text-white"}`}>{t(`cat.${e.category}` as StringKey)}</span>
      <span className="absolute inset-x-0 bottom-0 p-4 bg-background flex flex-col gap-1">
        <span className="font-poster text-[34px] sm:text-[44px] leading-none">{e.allDay ? "" : fmtClock(e.start, lang)}</span>
        <span className="font-semibold leading-snug line-clamp-2" dir="auto">{e.title}</span>
        {e.venue && <span className="text-[13px] text-muted-foreground truncate" dir="auto">{e.venue}</span>}
      </span>
    </Link>
  );
};

const NIGHT_HOODS = ["Florentin", "Lev HaIr", "City Centre", "Jaffa", "Montefiore", "The Port", "Old North", "Neve Tzedek"];

export const WhereTheNightGoes = () => {
  const { lang } = useI18n();
  const he = lang === "he";
  const places = usePlaces();
  const docks = useTelofan();
  const { tonight } = useTonight();
  const rows = useMemo(() => {
    const m = new Map<string, { open: number; total: number; shows: number }>();
    for (const p of places.data ?? []) {
      if (!BAR_KINDS.includes(p.kind)) continue;
      const h = neighbourhoodOf(p)?.en;
      if (!h || !NIGHT_HOODS.includes(h)) continue;
      const r = m.get(h) ?? { open: 0, total: 0, shows: 0 };
      r.total++;
      if (openStateAt(p.hours).status === "open") r.open++;
      m.set(h, r);
    }
    for (const e of tonight) {
      if (e.lat == null || e.lon == null) continue;
      const h = neighbourhoodOf({ lat: e.lat, lon: e.lon })?.en;
      if (h && m.has(h)) m.get(h)!.shows++;
    }
    return [...m.entries()].sort((a, b) => b[1].open - a[1].open || b[1].total - a[1].total).slice(0, 5);
  }, [places.data, tonight]);
  const happy = (places.data ?? []).filter((p) => p.happy).length;
  const bikes = (docks.data ?? []).reduce((n, d) => n + d.bikes + d.ebikes, 0);
  if (!places.data) return null;
  return (
    <section className="container-page pt-16 pb-4 flex flex-wrap gap-10">
      <div className="flex-1 basis-[480px]">
        <h2 className="font-display text-[60px] sm:text-[84px] leading-[0.9]">{he ? <>לאן הלילה<br />הולך</> : <>Where the<br />night goes</>}</h2>
        <ul className="mt-7">
          {rows.map(([h, r]) => {
            const hood = NEIGHBOURHOODS.find((x) => x.en === h)!;
            return (
              <li key={h} className="border-t border-border last:border-b">
                <Link to={`/area/${hoodSlug(hood)}/bars`} className="flex items-baseline justify-between gap-4 py-4 hover:text-accent">
                  <span className="text-[24px] sm:text-[28px] font-extrabold">{he ? hood.he : hood.en}</span>
                  <span className="text-accent font-extrabold text-end">
                    {r.open ? (he ? `${r.open} פתוחים עכשיו` : `${r.open} open now`) : (he ? `${r.total} ברים` : `${r.total} bars`)}
                    {r.shows ? (he ? ` · ${r.shows} הופעות` : ` · ${r.shows} shows`) : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex-1 basis-[340px] flex flex-col gap-4">
        <Link to="/food" className="block rounded-[4px] bg-accent text-accent-foreground p-7">
          <span className="block text-[15px] font-extrabold">{he ? "הפי האוור" : "Happy hour"}</span>
          <span className="block font-poster text-[80px] sm:text-[96px] leading-[0.9]">{happy}</span>
          <span className="block font-semibold">{he ? "ברים ומסעדות עם הפי האוור על המפה" : "bars and kitchens with a happy hour on the map"}</span>
        </Link>
        <Link to="/getting-around" className="block rounded-[4px] bg-[#7a5cff] text-white p-7">
          <span className="block text-[15px] font-extrabold">{he ? "הדרך הביתה" : "Getting home"}</span>
          <span className="block font-poster text-[48px] sm:text-[56px] leading-none uppercase">{docks.data ? (he ? `${bikes} אופניים פנויים` : `${bikes} bikes free`) : (he ? "תל-אופן" : "Tel-O-Fun")}</span>
          <span className="block font-semibold">{he ? "תל-אופן עכשיו. הרכבת הקלה פועלת עד מאוחר באמצע השבוע, ואחריה מוניות." : "Tel-O-Fun right now. The light rail runs late on weeknights, then taxis."}</span>
        </Link>
      </div>
    </section>
  );
};
