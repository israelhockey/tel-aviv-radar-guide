import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bus, Car, Radar, SquareParking } from "lucide-react";
import { useI18n, type StringKey } from "@/lib/i18n";
import {
  useBeachForecast, useBuses, useCinema, useEventsFeed, useHolidays, useNewsFeed, useParking, usePlaces, useShabbat, useTraffic,
} from "@/lib/live/hooks";
import { openStateAt } from "@/lib/live/openingHours";
import { inRange } from "@/lib/live/when";
import { fmtClock, fmtWeekday } from "@/lib/live/format";
import { isEveningOut, type FeedEvent } from "@/lib/live/sources";
import { distanceMeters, TLV_CENTER } from "@/lib/live/geo";
import { CAT_BG } from "./PosterCard";
import { relTime } from "./NewsCard";

const verdict = (s: number): StringKey => (s >= 8 ? "beach.v5" : s >= 6.5 ? "beach.v4" : s >= 4.5 ? "beach.v3" : s >= 2.5 ? "beach.v2" : "beach.v1");

const MiniPoster = ({ e }: { e: FeedEvent }) => {
  const { lang } = useI18n();
  const [broken, setBroken] = useState(false);
  return (
    <a href={e.url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-[3/4] rounded-md overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
      {e.image && !broken ? (
        <img src={e.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <span className={`absolute inset-0 ${CAT_BG[e.category] ?? CAT_BG.other}`} />
      )}
      <span className="absolute inset-x-0 bottom-0 p-2 bg-black/75">
        {!e.allDay && <span className="block text-[13px] font-semibold tabular text-white">{fmtClock(e.start, lang)}</span>}
        <span className="block text-[13px] leading-tight text-white line-clamp-2" dir="auto">{e.title}</span>
      </span>
    </a>
  );
};

// The home page board: one tile per part of city life, each in its own colour and shape.
export const HomeBoard = () => {
  const { t, lang } = useI18n();
  const events = useEventsFeed();
  const beach = useBeachForecast();
  const news = useNewsFeed();
  const places = usePlaces();
  const buses = useBuses();
  const traffic = useTraffic();
  const parking = useParking();
  const cinema = useCinema();
  const shabbat = useShabbat(lang);
  const holidays = useHolidays(lang);

  const now = new Date();
  const picks = useMemo(() => {
    const all = (events.data?.events ?? []).filter(isEveningOut);
    const tonight = all.filter((e) => inRange(e.start, e.end, "tonight"));
    const pool = tonight.length >= 4 ? tonight : [...tonight, ...all.filter((e) => !tonight.includes(e) && inRange(e.start, e.end, "week"))];
    return { count: tonight.length, list: [...pool.filter((e) => e.image), ...pool.filter((e) => !e.image)].slice(0, 6) };
  }, [events.data]);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
  const beachHours = (beach.data ?? []).filter((h) => h.time.startsWith(today) && h.isDay);
  const best = beachHours.length ? beachHours.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const hourNow = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", hourCycle: "h23" }).format(now));
  const seaNow = (beach.data ?? []).find((h) => h.time.startsWith(today) && Number(h.time.slice(11, 13)) === hourNow);

  const story = (news.data?.news ?? []).find((n) => n.image) ?? news.data?.news[0];
  const food = useMemo(() => {
    const list = (places.data ?? []).filter((p) => p.kind !== "bicycle_rental");
    const late = new Date(now); if (late.getHours() >= 5) late.setDate(late.getDate() + 1); late.setHours(0, 30, 0, 0);
    return {
      open: list.filter((p) => openStateAt(p.hours, now).status === "open").length,
      bars: list.filter((p) => ["bar", "pub", "biergarten"].includes(p.kind) && openStateAt(p.hours, now).status === "open").length,
      // Bars open now nearest Dizengoff Square, by name.
      near: list.filter((p) => ["bar", "pub", "biergarten", "cafe"].includes(p.kind) && openStateAt(p.hours, now).status === "open")
        .sort((a, b) => distanceMeters(TLV_CENTER, a) - distanceMeters(TLV_CENTER, b)).slice(0, 3),
      late: list.filter((p) => openStateAt(p.hours, late).status === "open").length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.data]);

  const films = (cinema.data?.films ?? []).filter((f) => f.shows.some((s) => { const d = new Date(s.at).getTime() - now.getTime(); return d > -30 * 60_000 && d < 24 * 3600_000; }));
  const jams = traffic.data?.jams.filter((j) => j.level >= 3).length;
  const lots = parking.data?.filter((k) => k.status === "free" || k.status === "few").length;
  const nextHoliday = holidays.data?.[0];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(150px,auto)]">
      {/* Tonight: the biggest tile, dark so the posters glow */}
      <section className="col-span-2 lg:row-span-2 rounded-xl bg-[#d6336c] text-white p-4 sm:p-5 flex flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[28px] sm:text-[34px] leading-none">{picks.count ? t("now.tonight") : t("board.thisWeek")}</h2>
          <Link to="/events" className="text-[14px] text-white/80 hover:text-white underline-offset-4 hover:underline">{picks.count ? `${picks.count} ${t("hero.thingsTonight")}` : t("now.seeWeek")}</Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 flex-1">
          {picks.list.map((e) => <MiniPoster key={e.id} e={e} />)}
          {!picks.list.length && Array.from({ length: 6 }, (_, i) => <span key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      </section>

      {/* Beach: the sea itself */}
      <Link to="/beach" className="relative overflow-hidden rounded-xl p-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-foreground/70" style={{ background: "#0e7c86" }}>
        <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="absolute inset-x-0 bottom-3 w-full h-4 opacity-50" aria-hidden><path d="M0 10 Q12.5 2 25 10 T50 10 T75 10 T100 10 T125 10 T150 10 T175 10 T200 10" fill="none" stroke="#fff" strokeWidth="2" /></svg>
        <p className="text-[14px] text-white/85">{t("nav.beach")}</p>
        <p className="mt-1 font-display text-[44px] leading-none tabular">{best ? best.score.toFixed(1) : "…"}</p>
        {best && <p className="mt-1 text-[14px] font-medium">{t(verdict(best.score))}</p>}
        {seaNow?.sea != null && <p className="mt-2 text-[12px] text-white/80">{t("now.sea")} {Math.round(seaNow.sea)}°{seaNow.wave != null ? `, ${seaNow.wave.toFixed(1)} m` : ""}</p>}
        {beachHours.length > 0 && (
          <div className="relative mt-3 hidden sm:flex items-end gap-[3px] h-14" aria-hidden>
            {beachHours.map((h) => <span key={h.time} className="flex-1 rounded-sm bg-white" style={{ height: `${8 + h.score * 9}%`, opacity: 0.35 + h.score / 16 }} />)}
          </div>
        )}
      </Link>

      {/* Top story: a picture you can't miss */}
      {story ? (
        <a href={story.url} target="_blank" rel="noopener noreferrer" className="relative overflow-hidden rounded-xl row-span-2 min-h-[300px] bg-cat-news text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-foreground/70">
          {story.image && <img src={story.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />}
          <span className="absolute inset-x-0 bottom-0 p-4 bg-[#0f1530]/90">
            <span className="text-[12px] text-white/80">{story.source}, {relTime(story.published, lang)}</span>
            <span className="mt-1 block font-display text-[17px] sm:text-[22px] leading-tight line-clamp-5 sm:line-clamp-4" lang={story.lang} dir={story.lang === "he" ? "rtl" : "ltr"}>{story.title}</span>
          </span>
        </a>
      ) : <div className="row-span-2 rounded-xl bg-secondary animate-pulse" />}

      {/* Food: citrus, with dark ink */}
      <Link to="/food" className="rounded-xl p-4 bg-[#ffc233] text-[#2b1d00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-foreground/70">
        <p className="text-[14px] opacity-80">{t("food.title")}</p>
        <p className="mt-1 font-display text-[44px] leading-none tabular">{places.data ? food.open : "…"}</p>
        <p className="text-[13px] font-medium">{t("food.openNow")}</p>
        {places.data && <p className="mt-2 text-[12px] opacity-80">{food.bars} {t("board.bars")}, {food.late} {t("board.late")}</p>}
        {food.near.length > 0 && (
          <ul className="mt-3 hidden sm:block space-y-1">
            {food.near.map((p) => <li key={p.id} className="text-[13px] font-medium truncate" dir="auto">{(lang === "en" && p.nameEn) || p.name}</li>)}
          </ul>
        )}
      </Link>

      {/* The city moving */}
      <Link to="/getting-around" className="col-span-2 rounded-xl p-4 bg-card border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-foreground/70">
        <p className="text-[14px] text-muted-foreground">{t("go.title")}</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div><Bus className="h-4 w-4 text-[#0b63e5]" aria-hidden /><p className="mt-1 font-display text-[30px] leading-none tabular text-[#0b63e5]">{buses.data?.buses.length ?? "…"}</p><p className="text-[12px] text-muted-foreground">{t("now.busesMoving")}</p></div>
          <div><Car className="h-4 w-4 text-[#e8590c]" aria-hidden /><p className="mt-1 font-display text-[30px] leading-none tabular text-[#e8590c]">{jams ?? "…"}</p><p className="text-[12px] text-muted-foreground">{t("go.jams")}</p></div>
          <div><SquareParking className="h-4 w-4 text-[#1971c2]" aria-hidden /><p className="mt-1 font-display text-[30px] leading-none tabular text-[#1971c2]">{lots ?? "…"}</p><p className="text-[12px] text-muted-foreground">{t("go.lots")}</p></div>
        </div>
      </Link>

      {/* Cinema tonight */}
      <Link to="/cinema" className="rounded-xl p-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-foreground/70" style={{ background: "#5b2a86" }}>
        <p className="text-[14px] text-white/85">{t("cin.title")}</p>
        <p className="mt-1 font-display text-[30px] leading-none tabular">{cinema.data ? films.length : "…"} <span className="text-[14px] font-sans">{t("board.films")}</span></p>
        <div className="mt-3 flex -space-x-3 rtl:space-x-reverse">
          {films.filter((f) => f.poster).slice(0, 4).map((f) => (
            <img key={f.id} src={f.poster!} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-16 w-11 rounded-md object-cover ring-2 ring-[#5b2a86]" />
          ))}
        </div>
      </Link>

      {/* Shabbat, or the next holiday */}
      <Link to="/shabbat" className="rounded-xl p-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-foreground/70" style={{ background: "#0f1530" }}>
        <p className="text-[14px] text-white/85">{t("shabbat.title")}</p>
        {shabbat.data?.candles ? (
          <>
            <p className="mt-1 font-display text-[36px] leading-none tabular text-[#ffc233]">{fmtClock(shabbat.data.candles, lang)}</p>
            <p className="text-[12px] text-white/85">{t("shabbat.candles")}, {fmtWeekday(shabbat.data.candles, lang)}</p>
          </>
        ) : <p className="mt-1 font-display text-[36px] leading-none">…</p>}
        {nextHoliday && <p className="mt-2 text-[12px] text-white/80" dir="auto">{nextHoliday.title}</p>}
      </Link>

      {/* The live map */}
      <Link to="/live" className="relative overflow-hidden col-span-2 lg:col-span-4 min-h-[150px] rounded-xl p-5 sm:p-6 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-foreground/70" style={{ background: "#2f6fed" }}>
        <span className="absolute -end-10 -bottom-10 h-40 w-40 rounded-full border-2 border-white/30" aria-hidden />
        <span className="absolute -end-2 -bottom-2 h-24 w-24 rounded-full border-2 border-white/50" aria-hidden />
        <span className="absolute end-7 bottom-7 h-6 w-6 rounded-full bg-[#ff5a1f] motion-safe:animate-ping opacity-60" aria-hidden />
        <Radar className="h-5 w-5 text-white" aria-hidden />
        <p className="mt-2 font-display text-[28px] sm:text-[36px] leading-tight">{t("board.map")}</p>
        <p className="mt-1 text-[14px] text-white/85 max-w-[44ch]">{t("board.mapBody")}</p>
      </Link>
    </div>
  );
};
