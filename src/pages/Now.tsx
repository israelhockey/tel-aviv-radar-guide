import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ConditionsStrip } from "@/components/radar/ConditionsStrip";
import { SkyHero } from "@/components/radar/SkyHero";
import { HomeBoard } from "@/components/radar/HomeBoard";
import { BeachList } from "@/components/radar/BeachList";
import { OpenNearby } from "@/components/radar/OpenNearby";
import { useI18n } from "@/lib/i18n";
import { useNewsFeed } from "@/lib/live/hooks";
import { NewsCard } from "@/components/radar/NewsCard";
import { ARTICLES } from "@/lib/articles";
import { ArticleCard } from "./Magazine";
import { fmtClock } from "@/lib/live/format";

type Item = Database["public"]["Tables"]["content_items"]["Row"];

const useBriefs = () =>
  useQuery({
    queryKey: ["briefs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items").select("*")
        .eq("status", "published").in("type", ["news", "business", "opening"])
        .order("published_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

const ItemRow = ({ item, lead }: { item: Item; lead?: string }) => (
  <li>
    <Link to={`/post/${item.slug}`} className="group grid grid-cols-[3.5rem,1fr] gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea rounded">
      <span className="text-[14px] tabular text-muted-foreground pt-0.5">{lead}</span>
      <span className="min-w-0">
        <span className="block text-[15px] leading-snug group-hover:text-sea">{item.title}</span>
        {(item.venue || item.neighborhood || item.source_name) && (
          <span className="block mt-0.5 text-[12px] text-muted-foreground truncate">
            {[item.venue, item.neighborhood].filter(Boolean).join(", ") || item.source_name}
          </span>
        )}
      </span>
    </Link>
  </li>
);

const Now = () => {
  const { t, lang } = useI18n();
  const briefs = useBriefs();
  const newsFeed = useNewsFeed();
  const feedNews = (newsFeed.data?.news ?? []).slice(0, 8);
  const newsCount = feedNews.length + (briefs.data?.length ?? 0);

  useEffect(() => {
    document.title = lang === "he" ? "Discover Tel Aviv · מה קורה בתל אביב עכשיו" : "Discover Tel Aviv · Tel Aviv right now";
  }, [lang]);

  return (
    <SiteLayout>
      <SkyHero />
      <div className="container-page">
        <div className="mt-2">
          <ConditionsStrip />
        </div>

        <div className="mt-6">
          <HomeBoard />
        </div>

        <section aria-labelledby="news-h" className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 id="news-h" className="font-display text-[28px] leading-none">{t("now.news")}</h2>
            <Link to="/news" className="text-[14px] text-sea hover:underline underline-offset-4">{t("now.allNews")}</Link>
          </div>
          {newsCount > 0 ? (
            <>
              {feedNews.length > 0 && (
                <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:thin]">
                  {feedNews.map((n) => <NewsCard key={n.id} n={n} className="snap-start shrink-0 w-[78%] sm:w-[280px]" />)}
                </div>
              )}
              {(briefs.data ?? []).length > 0 && (
                <ul className="mt-1 divide-y divide-border">
                  {(briefs.data ?? []).map((i) => (
                    <ItemRow key={i.id} item={i} lead={i.published_at ? fmtClock(i.published_at, lang) : ""} />
                  ))}
                </ul>
              )}
            </>
          ) : (
            !briefs.isLoading && !newsFeed.isLoading && <p className="mt-3 text-[14px] text-muted-foreground">{t("now.newsEmpty")}</p>
          )}
        </section>

        <section aria-labelledby="mag-h" className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 id="mag-h" className="font-display text-[28px] leading-none">{t("mag.title")}</h2>
            <Link to="/magazine" className="text-[14px] text-sea hover:underline underline-offset-4">{t("now.allGuides")}</Link>
          </div>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ARTICLES.filter((a) => a.featured).slice(0, 4).map((a) => <ArticleCard key={a.slug} a={a} />)}
          </div>
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr,360px]">
          <OpenNearby />
          <BeachList />
        </div>
      </div>
    </SiteLayout>
  );
};

export default Now;
