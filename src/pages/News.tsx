import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useNewsFeed } from "@/lib/live/hooks";
import { fmtClock } from "@/lib/live/format";
import { dayHeading, nightKey } from "@/lib/live/when";
import type { FeedNews } from "@/lib/live/sources";

export const NewsRow = ({ n }: { n: FeedNews }) => {
  const { lang } = useI18n();
  return (
    <li>
      <a
        href={n.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid grid-cols-[3.5rem,1fr] gap-3 py-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
      >
        <span className="text-[14px] tabular text-muted-foreground pt-0.5">{n.published ? fmtClock(n.published, lang) : ""}</span>
        <span className="min-w-0">
          <span className="block text-[15px] leading-snug group-hover:text-sea" lang={n.lang} dir={n.lang === "he" ? "rtl" : "ltr"}>{n.title}</span>
          <span className="block mt-0.5 text-[12px] text-muted-foreground" dir="auto">{n.source}</span>
        </span>
      </a>
    </li>
  );
};

const News = () => {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<"all" | "he" | "en">("all");
  const { data, isLoading, isError } = useNewsFeed();

  useEffect(() => {
    document.title = lang === "he" ? "חדשות · TLV Radar" : "News · TLV Radar";
  }, [lang]);

  const groups = useMemo(() => {
    const m = new Map<string, FeedNews[]>();
    for (const n of data?.news ?? []) {
      if (filter !== "all" && n.lang !== filter) continue;
      const k = n.published ? nightKey(n.published) : "";
      m.set(k, [...(m.get(k) ?? []), n]);
    }
    return [...m.entries()];
  }, [data, filter]);

  const chip = (active: boolean) =>
    `h-9 rounded-full px-4 text-[14px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${
      active ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"
    }`;

  return (
    <SiteLayout>
      <div className="container-page pt-6 sm:pt-8 max-w-3xl">
        <h1 className="text-[28px] sm:text-[40px] font-medium leading-tight">{t("news.title")}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground max-w-xl">{t("news.body")}</p>
        <div className="mt-5 flex gap-2">
          {(["all", "he", "en"] as const).map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={chip(filter === f)}>
              {t(`news.${f}` as const)}
            </button>
          ))}
        </div>

        {isError && <p className="mt-6 text-[14px] text-muted-foreground">{t("common.error")}</p>}
        {!isLoading && !isError && groups.length === 0 && <p className="mt-6 text-[15px] text-muted-foreground">{t("news.empty")}</p>}

        {groups.map(([key, list]) => (
          <section key={key || "undated"} className="mt-6">
            {key && <h2 className="text-[13px] font-medium text-muted-foreground border-b border-border pb-2">{dayHeading(key, lang)}</h2>}
            <ul className="divide-y divide-border">
              {list.map((n) => <NewsRow key={n.id} n={n} />)}
            </ul>
          </section>
        ))}
      </div>
    </SiteLayout>
  );
};

export default News;
