import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Map as MapIcon } from "lucide-react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useEventsFeed, useHebrewDate } from "@/lib/live/hooks";
import { fmtClock, fmtToday } from "@/lib/live/format";
import { inRange } from "@/lib/live/when";
import { isEveningOut, type FeedEvent } from "@/lib/live/sources";
import { CAT_BG } from "./PosterCard";

// A poster in the moving wall. Without artwork, the title on its category colour.
const Tile = ({ e }: { e: FeedEvent }) => {
  const { lang } = useI18n();
  const [broken, setBroken] = useState(false);
  const cat = CAT_BG[e.category] ?? CAT_BG.other;
  return (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={-1}
      className={`relative shrink-0 w-[112px] sm:w-[150px] aspect-[4/5] rounded-xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7)] ${e.image && !broken ? "bg-neutral-800" : cat}`}
    >
      {e.image && !broken ? (
        <img src={e.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 p-2.5 flex items-end font-display text-[15px] sm:text-[18px] leading-tight text-white" dir="auto">{e.title}</span>
      )}
      {!e.allDay && <span className="absolute top-1.5 start-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white tabular">{fmtClock(e.start, lang)}</span>}
    </a>
  );
};

const Row = ({ items, duration, reverse }: { items: FeedEvent[]; duration: number; reverse?: boolean }) => {
  // Two identical halves, so sliding by -50% loops without a seam.
  const half = items.length < 8 ? [...items, ...items, ...items].slice(0, Math.max(8, items.length)) : items;
  return (
    <div className="flex w-max gap-3 sm:gap-4 radar-marquee hover:[animation-play-state:paused]" style={{ animationDuration: `${duration}s`, animationDirection: reverse ? "reverse" : "normal" }}>
      {[...half, ...half].map((e, i) => <Tile key={`${e.id}-${i}`} e={e} />)}
    </div>
  );
};

// On the What's on page the buttons jump to the list below instead of opening the page.
export const TonightHero = ({ onWhatsOn = false }: { onWhatsOn?: boolean }) => {
  const { t, lang } = useI18n();
  const events = useEventsFeed();
  const hebrewDate = useHebrewDate();

  const { tonight, wall, cats } = useMemo(() => {
    const all = (events.data?.events ?? []).filter(isEveningOut);
    const tonight = all.filter((e) => inRange(e.start, e.end, "tonight"));
    const week = all.filter((e) => !tonight.includes(e) && inRange(e.start, e.end, "week"));
    // Posters with artwork first, so the wall looks like a street of gig posters.
    const byArt = (xs: FeedEvent[]) => [...xs.filter((e) => e.image), ...xs.filter((e) => !e.image)];
    const wall = [...byArt(tonight), ...byArt(week)].slice(0, 30);
    const counts = new Map<string, number>();
    for (const e of tonight.length ? tonight : week) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    const cats = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { tonight, wall, cats };
  }, [events.data]);

  const rows = [0, 1, 2].map((r) => wall.filter((_, i) => i % 3 === r));
  const quiet = !events.isLoading && tonight.length === 0;

  return (
    <section className="relative isolate overflow-hidden bg-[hsl(230_35%_8%)] text-white" aria-labelledby="hero-h">
      {/* The poster wall: three rows drifting in opposite directions, tilted like a street hoarding. */}
      <div className="absolute inset-0 -z-10 flex flex-col justify-center gap-3 sm:gap-4 opacity-90" dir="ltr" aria-hidden>
        <div className="flex flex-col gap-3 sm:gap-4 -rotate-[8deg] scale-[1.25] origin-center -translate-y-[6%]">
          {wall.length > 0
            ? rows.map((r, i) => r.length > 0 && <Row key={i} items={r} duration={70 + i * 18} reverse={i % 2 === 1} />)
            : [0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 sm:gap-4">
                {Array.from({ length: 12 }, (_, j) => <span key={j} className="shrink-0 w-[112px] sm:w-[150px] aspect-[4/5] rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ))}
        </div>
      </div>
      {/* Colour wash in the time-of-day sky, then darkness under the text so it always reads. */}
      <div className="absolute inset-0 -z-10 opacity-40 mix-blend-overlay pointer-events-none" style={{ background: "var(--hero-sky)" }} aria-hidden />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[hsl(230_35%_6%)] via-[hsl(230_35%_6%/0.72)] to-[hsl(230_35%_6%/0.15)] pointer-events-none" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-16 -z-10 bg-gradient-to-b from-transparent to-background pointer-events-none" aria-hidden />

      <div className={`container-page relative flex flex-col justify-end ${onWhatsOn ? "h-[62svh] max-h-[600px] min-h-[460px]" : "h-[74svh] max-h-[720px] min-h-[520px]"} pb-12 sm:pb-16 pointer-events-none`}>
        <p className="inline-flex flex-wrap items-center gap-x-2 text-[13px] text-white/80">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          {fmtToday(lang)}
          {hebrewDate.data && <><span className="text-white/40" aria-hidden>·</span><span lang="he" dir="rtl" className="text-white/65">{hebrewDate.data}</span></>}
        </p>
        <h1 id="hero-h" className="mt-2 font-display text-[48px] leading-[0.92] sm:text-[80px] lg:text-[100px] drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          {quiet ? t("hero.weekTitle") : t("hero.tonightTitle")}
        </h1>
        <p className="mt-3 text-[17px] sm:text-[20px] text-white/90">
          {events.isLoading ? "…" : (
            <>
              <span className="font-semibold tabular">{quiet ? wall.length : tonight.length}</span>{" "}
              {quiet ? t("hero.thingsWeek") : t("hero.thingsTonight")}
            </>
          )}
        </p>

        {cats.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 pointer-events-auto">
            {cats.map(([c, n]) => (
              <Link
                key={c}
                to={`/events?cat=${c}${quiet ? "&range=week" : ""}`}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-[13px] font-medium text-white ${CAT_BG[c] ?? CAT_BG.other} hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
              >
                {t(`cat.${c}` as StringKey)}
                <span className="tabular opacity-80">{n}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3 pointer-events-auto">
          <Link
            to={onWhatsOn ? "#list" : quiet ? "/events?range=week" : "/events"}
            onClick={onWhatsOn ? (ev) => { ev.preventDefault(); document.getElementById("list")?.scrollIntoView({ behavior: "smooth" }); } : undefined}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[hsl(230_35%_10%)] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {quiet ? t("now.seeWeek") : t("hero.seeTonight")}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          </Link>
          <Link
            to="/live"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/35 bg-white/10 backdrop-blur px-5 text-[15px] font-medium hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <MapIcon className="h-4 w-4" aria-hidden />
            {t("nav.live")}
          </Link>
        </div>
      </div>
    </section>
  );
};
