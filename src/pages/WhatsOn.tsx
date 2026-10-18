import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useEventsFeed } from "@/lib/live/hooks";
import { fmtClock } from "@/lib/live/format";
import { dayHeading, inRange, nightKey, type Range } from "@/lib/live/when";
import type { FeedEvent } from "@/lib/live/sources";
import { PosterCard } from "@/components/radar/PosterCard";

const RANGES: { id: Range; key: StringKey }[] = [
  { id: "tonight", key: "on.tonight" },
  { id: "tomorrow", key: "on.tomorrow" },
  { id: "weekend", key: "on.weekend" },
  { id: "week", key: "on.week" },
  { id: "all", key: "on.all" },
];

const CATS = ["music", "comedy", "theatre", "party", "family", "talk", "festival", "sport", "meetup", "other"] as const;

export const EventRow = ({ e, showDay = false }: { e: FeedEvent; showDay?: boolean }) => {
  const { t, lang } = useI18n();
  return (
    <li>
      <a
        href={e.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid grid-cols-[3.5rem,1fr] gap-3 py-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
      >
        <span className="text-[14px] tabular text-muted-foreground pt-0.5">
          {fmtClock(e.start, lang)}
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
      </a>
    </li>
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
  const { data, isLoading, isError } = useEventsFeed();

  useEffect(() => {
    document.title = lang === "he" ? "מה קורה · TLV Radar" : "What's on · TLV Radar";
  }, [lang]);

  const inWindow = useMemo(() => (data?.events ?? []).filter((e) => inRange(e.start, e.end, range)), [data, range]);
  const present = useMemo(() => new Set(inWindow.map((e) => e.category)), [inWindow]);
  const shown = inWindow.filter((e) => (!freeOnly || e.free) && (cats.size === 0 || cats.has(e.category)));

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
    <SiteLayout>
      <div className="container-page pt-6 sm:pt-10 max-w-5xl">
        <h1 className="font-display text-[40px] sm:text-[60px] leading-[0.95]">{t("on.title")}</h1>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist">
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
            <h2 className="font-display text-[24px] leading-none">{dayHeading(key, lang)}</h2>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {list.map((e) => <PosterCard key={e.id} e={e} />)}
            </div>
          </section>
        ))}

        <p className="mt-10 text-[12px] text-muted-foreground">{t("on.sources")}</p>
      </div>
    </SiteLayout>
  );
};

export default WhatsOn;
