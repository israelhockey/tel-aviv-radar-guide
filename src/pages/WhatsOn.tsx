import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { eventSlug } from "@/lib/areas";
import { NightHero, NightMarquee, WhereTheNightGoes, WhosOn } from "@/components/night/Night";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useEventsFeed } from "@/lib/live/hooks";
import { fmtClock } from "@/lib/live/format";
import { dayHeading, inRange, nightKey, type Range } from "@/lib/live/when";
import type { FeedEvent } from "@/lib/live/sources";
import { CAT_BG, PosterCard } from "@/components/radar/PosterCard";

const RANGES: { id: Range; key: StringKey }[] = [
  { id: "tonight", key: "on.tonight" },
  { id: "tomorrow", key: "on.tomorrow" },
  { id: "weekend", key: "on.weekend" },
  { id: "week", key: "on.week" },
  { id: "all", key: "on.all" },
];

const CATS = ["music", "comedy", "theatre", "party", "family", "talk", "festival", "art", "market", "sport", "meetup", "community", "other"] as const;

export const EventRow = ({ e, showDay = false }: { e: FeedEvent; showDay?: boolean }) => {
  const { t, lang } = useI18n();
  return (
    <li>
      <Link
        to={`/event/${eventSlug(e)}`}
        className="group grid grid-cols-[3.5rem,1fr] gap-3 py-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
      >
        <span className="text-[14px] tabular text-muted-foreground pt-0.5">
          {!e.allDay && fmtClock(e.start, lang)}
          {showDay && <span className="block text-[11px]">{dayHeading(nightKey(e.start), lang)}</span>}
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] leading-snug group-hover:text-sea" dir="auto">{e.title}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-muted-foreground">
            {e.venue && <span dir="auto">{e.venue}</span>}
            <span>{t(`cat.${e.category}` as StringKey)}</span>
            {e.free ? (
              <span className="text-surf font-medium">{t("on.free")}</span>
            ) : e.priceFrom != null ? (
              <span className="tabular">{t("on.from")}{lang === "he" ? "" : " "}₪{Math.round(e.priceFrom)}</span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
};

// Google Calendar link for an event (opens a prefilled "new event").
export const gcal = (e: FeedEvent) => {
  const z = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = e.end ?? new Date(new Date(e.start).getTime() + 2 * 3600_000).toISOString();
  const u = new URL("https://calendar.google.com/calendar/render");
  u.searchParams.set("action", "TEMPLATE");
  u.searchParams.set("text", e.title);
  u.searchParams.set("dates", `${z(e.start)}/${z(end)}`);
  u.searchParams.set("location", [e.venue, e.address].filter(Boolean).join(", "));
  u.searchParams.set("details", e.url);
  return u.toString();
};

// Month view: each day shows how much is on, coloured by the biggest category.
const MonthCalendar = ({ events, selected, onSelect }: { events: FeedEvent[]; selected: string | null; onSelect: (d: string) => void }) => {
  const { lang } = useI18n();
  const [offset, setOffset] = useState(0);
  const today = nightKey(new Date().toISOString());
  const base = new Date(`${today}T12:00:00Z`);
  const first = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1, 12));
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
  const lead = first.getUTCDay();
  const byDay = new Map<string, FeedEvent[]>();
  for (const e of events) {
    const k = nightKey(e.start);
    const l = byDay.get(k);
    if (l) l.push(e); else byDay.set(k, [e]);
  }
  const cells = Array.from({ length: lead + daysInMonth }, (_, i) => {
    if (i < lead) return null;
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), i - lead + 1, 12));
    const key = d.toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    const counts = new Map<string, number>();
    for (const e of list) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
    return { key, day: d.getUTCDate(), n: list.length, top, past: key < today };
  });
  const wd = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 4 + i, 12))));
  const title = new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  return (
    <div className="mt-5 rounded-xl border border-border p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} aria-label="Previous month" className="h-9 w-9 rounded-md border border-border disabled:opacity-30">‹</button>
        <p className="font-display text-[22px]">{title}</p>
        <button onClick={() => setOffset((o) => Math.min(2, o + 1))} disabled={offset === 2} aria-label="Next month" className="h-9 w-9 rounded-md border border-border disabled:opacity-30">›</button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[12px] text-muted-foreground">{wd.map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => c ? (
          <button key={c.key} onClick={() => onSelect(c.key)} disabled={c.past || !c.n} aria-pressed={selected === c.key}
            className={`relative h-16 sm:h-20 rounded-md p-1.5 text-start transition-colors ${selected === c.key ? "bg-foreground text-background" : c.n && !c.past ? "bg-secondary hover:bg-secondary/70" : "opacity-40"} ${c.key === today ? "ring-2 ring-accent" : ""}`}>
            <span className="block text-[13px] font-semibold tabular">{c.day}</span>
            {c.n > 0 && !c.past && <span className="block text-[11px] tabular opacity-80">{c.n}</span>}
            <span className="absolute bottom-1.5 start-1.5 flex gap-0.5">{c.top.map((cat) => <span key={cat} className={`h-1.5 w-1.5 rounded-full ${CAT_BG[cat] ?? CAT_BG.other}`} />)}</span>
          </button>
        ) : <span key={i} />)}
      </div>
    </div>
  );
};

const WhatsOn = () => {
  const { t, lang } = useI18n();
  const { pathname: path, search } = useLocation();
  const params = new URLSearchParams(search);
  const qRange = params.get("range") as Range | null;
  const [range, setRange] = useState<Range>(path === "/weekend" ? "weekend" : qRange && ["tonight", "tomorrow", "weekend", "week", "all"].includes(qRange) ? qRange : "tonight");
  const [freeOnly, setFreeOnly] = useState(path === "/free");
  const [cats, setCats] = useState<Set<string>>(() => new Set(params.getAll("cat")));
  const [view, setView] = useState<"list" | "calendar">("list");
  const [day, setDay] = useState<string | null>(null);
  const { data, isLoading, isError } = useEventsFeed();

  useEffect(() => {
    document.title = lang === "he" ? "מה קורה · Discover Tel Aviv" : "What's on · Discover Tel Aviv";
  }, [lang]);

  // A quiet night: open on the next 7 days instead of an empty list (unless a range was asked for).
  const [autoRanged, setAutoRanged] = useState(false);
  useEffect(() => {
    if (autoRanged || !data || qRange || path !== "/events") return;
    setAutoRanged(true);
    if (!data.events.some((e) => e.category !== "community" && inRange(e.start, e.end, "tonight"))) setRange("week");
  }, [data, autoRanged, qRange, path]);

  const inWindow = useMemo(() => (data?.events ?? []).filter((e) => (view === "calendar" ? (day ? nightKey(e.start) === day : inRange(e.start, e.end, "all")) : inRange(e.start, e.end, range))), [data, range, view, day]);
  const present = useMemo(() => new Set(inWindow.map((e) => e.category)), [inWindow]);
  const shown = inWindow.filter((e) => (!freeOnly || e.free) && (cats.size === 0 ? e.category !== "community" : cats.has(e.category)));

  const groups = useMemo(() => {
    const m = new Map<string, FeedEvent[]>();
    for (const e of shown) {
      const k = nightKey(e.start);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [shown]);

  const chip = (active: boolean) =>
    `shrink-0 h-9 rounded-full px-4 text-[14px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${
      active ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"
    }`;

  return (
    <SiteLayout zone="night">
      <NightHero title={path === "/free" ? (lang === "he" ? ["בחינם", "השבוע"] : ["Free", "this week"]) : undefined} />
      <NightMarquee />
      {path !== "/free" && <WhosOn />}
      <div id="list" className="container-page pt-14 max-w-5xl scroll-mt-20">
        <h2 className="font-display text-[60px] sm:text-[84px] leading-[0.9]">{path === "/free" ? t("on.free") : t("on.title")}</h2>

        <div className="mt-5 flex gap-2">
          <button aria-pressed={view === "list"} onClick={() => setView("list")} className={chip(view === "list")}>{t("on.viewList")}</button>
          <button aria-pressed={view === "calendar"} onClick={() => setView("calendar")} className={chip(view === "calendar")}>{t("on.viewCalendar")}</button>
        </div>
        {view === "calendar" && (
          <MonthCalendar events={(data?.events ?? []).filter((e) => (!freeOnly || e.free) && (cats.size === 0 ? e.category !== "community" : cats.has(e.category)))} selected={day} onSelect={(d) => setDay((x) => (x === d ? null : d))} />
        )}
        <div className={`mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] ${view === "calendar" ? "hidden" : ""}`} role="tablist">
          {RANGES.map((r) => (
            <button key={r.id} role="tab" aria-selected={range === r.id} onClick={() => setRange(r.id)} className={chip(range === r.id)}>
              {t(r.key)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button aria-pressed={freeOnly} onClick={() => setFreeOnly((v) => !v)} className={chip(freeOnly)}>{t("on.free")}</button>
          {CATS.filter((c) => present.has(c)).map((c) => {
            const on = cats.has(c);
            return (
              <button
                key={c}
                aria-pressed={on}
                onClick={() => setCats((prev) => {
                  const next = new Set(prev);
                  if (on) next.delete(c); else next.add(c);
                  return next;
                })}
                className={chip(on)}
              >
                {t(`cat.${c}` as StringKey)}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[13px] text-muted-foreground tabular">{shown.length} {t("on.count")}</p>

        {isError && <p className="mt-4 text-[14px] text-muted-foreground">{t("common.error")}</p>}
        {!isLoading && !isError && shown.length === 0 && <p className="mt-4 text-[15px] text-muted-foreground">{t("on.empty")}</p>}

        {groups.map(([key, list]) => (
          <section key={key} className="mt-6" aria-label={dayHeading(key, lang)}>
            <h2 className="font-display text-[36px] leading-none">{dayHeading(key, lang)}</h2>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {list.map((e) => (
                <div key={e.id}>
                  <PosterCard e={e} />
                  <a href={gcal(e)} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-[12px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">{t("on.addCal")}</a>
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="mt-10 text-[12px] text-muted-foreground">{t("on.sources")}</p>
      </div>
      <WhereTheNightGoes />
    </SiteLayout>
  );
};

export default WhatsOn;
