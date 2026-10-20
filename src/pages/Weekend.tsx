import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useBeachForecast, useEventsFeed, useShabbat } from "@/lib/live/hooks";
import { inRange } from "@/lib/live/when";
import { fmtClock, fmtWeekday } from "@/lib/live/format";
import { isEveningOut } from "@/lib/live/sources";
import { PosterCard } from "@/components/radar/PosterCard";
import { articlesFor } from "@/lib/articles";
import { ArticleCard } from "./Magazine";

// The weekend in one page: what we'd pick, the beach, Shabbat and the Friday markets.
const Weekend = () => {
  const { t, lang } = useI18n();
  const events = useEventsFeed();
  const beach = useBeachForecast();
  const shabbat = useShabbat(lang);

  useEffect(() => {
    document.title = lang === "he" ? "סוף השבוע · Discover Tel Aviv" : "This weekend · Discover Tel Aviv";
  }, [lang]);

  const weekend = useMemo(() => (events.data?.events ?? []).filter((e) => inRange(e.start, e.end, "weekend")), [events.data]);
  const picks = weekend.filter((e) => isEveningOut(e) && e.category !== "market");
  const byCat = (cats: string[]) => picks.filter((e) => cats.includes(e.category));
  const markets = weekend.filter((e) => e.category === "market");
  const free = picks.filter((e) => e.free);

  // Beach outlook for Friday and Saturday.
  const days = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of beach.data ?? []) if (h.isDay) m.set(h.time.slice(0, 10), Math.max(m.get(h.time.slice(0, 10)) ?? 0, h.score));
    return [...m.entries()].filter(([d]) => [5, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay())).slice(0, 2);
  }, [beach.data]);

  const sections: { key: StringKey; list: typeof picks }[] = [
    { key: "wk.music", list: byCat(["music", "party"]) },
    { key: "wk.stage", list: byCat(["theatre", "comedy"]) },
    { key: "wk.family", list: byCat(["family"]) },
    { key: "wk.culture", list: byCat(["art", "talk", "festival"]) },
  ];
  const reads = articlesFor(lang).filter((a) => ["food", "drink", "neighbourhoods"].includes(a.category)).slice(0, 3);

  return (
    <SiteLayout zone="night">
      <section className="border-b-2 border-accent">
        <div className="container-page py-10 sm:py-14">
          <h1 className="font-display text-[80px] sm:text-[150px] leading-[0.82]">{lang === "he" ? <>סוף<br /><span className="night-outline">השבוע</span></> : <>This<br /><span className="night-outline">weekend</span></>}</h1>
          <p className="mt-4 text-[20px] max-w-xl">{events.data ? `${picks.length} ${t("wk.things")}` : "…"}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {shabbat.data?.candles && <div className="rounded-[4px] bg-card px-4 py-3"><p className="text-[13px] text-muted-foreground">{t("shabbat.candles")}</p><p className="font-display text-[28px] leading-none tabular">{fmtClock(shabbat.data.candles, lang)}</p><p className="text-[12px] text-muted-foreground">{fmtWeekday(shabbat.data.candles, lang)}</p></div>}
            {shabbat.data?.havdalah && <div className="rounded-[4px] bg-card px-4 py-3"><p className="text-[13px] text-muted-foreground">{t("shabbat.ends")}</p><p className="font-display text-[28px] leading-none tabular">{fmtClock(shabbat.data.havdalah, lang)}</p><p className="text-[12px] text-muted-foreground">{fmtWeekday(shabbat.data.havdalah, lang)}</p></div>}
            {days.map(([d, s]) => (
              <Link key={d} to="/beach" className="rounded-[4px] bg-[#7a5cff] text-white px-4 py-3">
                <p className="text-[13px] text-white/80">{t("nav.beach")}, {new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))}</p>
                <p className="font-display text-[28px] leading-none tabular">{s.toFixed(1)}/10</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page">
        {sections.map(({ key, list }) => list.length > 0 && (
          <section key={key} className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[48px] leading-none">{t(key)}</h2>
              <span className="text-[14px] text-muted-foreground tabular">{list.length}</span>
            </div>
            <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2">
              {list.slice(0, 10).map((e) => <PosterCard key={e.id} e={e} showDay className="shrink-0 w-[46%] sm:w-[220px]" />)}
            </div>
          </section>
        ))}

        {markets.length > 0 && (
          <section className="mt-10 rounded-[4px] bg-accent text-accent-foreground p-5">
            <h2 className="font-display text-[26px] leading-none">{t("wk.markets")}</h2>
            <ul className="mt-3 space-y-1.5">{markets.slice(0, 6).map((m) => <li key={m.id} className="text-[15px]"><span className="font-semibold tabular">{fmtWeekday(m.start, lang)} {fmtClock(m.start, lang)}</span> <span dir="auto">{m.title}</span></li>)}</ul>
          </section>
        )}

        {free.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-[48px] leading-none">{t("wk.free")}</h2>
            <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2">
              {free.slice(0, 10).map((e) => <PosterCard key={e.id} e={e} showDay className="shrink-0 w-[46%] sm:w-[220px]" />)}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-[48px] leading-none">{t("wk.read")}</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">{reads.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
        </section>

        <div className="mt-12 rounded-[4px] border-2 border-accent p-6 sm:flex sm:items-center sm:justify-between gap-6">
          <div>
            <p className="font-display text-[24px] leading-tight">{t("wk.letter")}</p>
            <p className="mt-1 text-[14px] text-muted-foreground">{t("wk.letterBody")}</p>
          </div>
          <Link to="/newsletter" className="mt-4 sm:mt-0 shrink-0 inline-flex h-11 items-center rounded-lg bg-[#ffcb05] text-[#0b1a33] px-5 text-[14px] font-semibold">{t("wk.signup")}</Link>
        </div>
        <p className="mt-6"><Link to="/events?range=weekend" className="text-sea underline underline-offset-4">{t("wk.all")}</Link></p>
      </div>
    </SiteLayout>
  );
};

export default Weekend;
