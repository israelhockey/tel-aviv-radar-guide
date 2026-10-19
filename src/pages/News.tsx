import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useNewsFeed } from "@/lib/live/hooks";
import { dayHeading, nightKey } from "@/lib/live/when";
import type { FeedNews } from "@/lib/live/sources";
import { NewsCard, NewsLead } from "@/components/radar/NewsCard";

const News = () => {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<"all" | "he" | "en">("all");
  const { data, isLoading, isError } = useNewsFeed();

  useEffect(() => {
    document.title = lang === "he" ? "חדשות · Discover Tel Aviv" : "News · Discover Tel Aviv";
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
      <div className="container-page pt-6 sm:pt-8 max-w-6xl">
        <h1 className="font-display text-[40px] sm:text-[60px] leading-[0.95]">{t("news.title")}</h1>
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

        {groups.map(([key, list], gi) => {
          // The newest story with a picture leads the page.
          const leadIdx = gi === 0 ? Math.max(0, list.findIndex((n) => n.image)) : -1;
          const rest = list.filter((_, i) => i !== leadIdx);
          return (
            <section key={key || "undated"} className="mt-8">
              {key && <h2 className="font-display text-[24px] leading-none mb-3">{dayHeading(key, lang)}</h2>}
              {leadIdx >= 0 && <NewsLead n={list[leadIdx]} />}
              <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${leadIdx >= 0 ? "mt-4" : ""}`}>
                {rest.map((n) => <NewsCard key={n.id} n={n} />)}
              </div>
            </section>
          );
        })}
      </div>
    </SiteLayout>
  );
};

export default News;
