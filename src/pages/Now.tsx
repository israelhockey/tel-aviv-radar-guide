import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ConditionsStrip } from "@/components/radar/ConditionsStrip";
import { TonightHero } from "@/components/radar/TonightHero";
import { BeachList } from "@/components/radar/BeachList";
import { ShabbatCard } from "@/components/radar/ShabbatCard";
import { OpenNearby } from "@/components/radar/OpenNearby";
import { useI18n } from "@/lib/i18n";
import { useEventsFeed, useNewsFeed } from "@/lib/live/hooks";
import { inRange } from "@/lib/live/when";
import { isEveningOut } from "@/lib/live/sources";
import { PosterCard } from "@/components/radar/PosterCard";
import { NewsCard } from "@/components/radar/NewsCard";
import { fmtClock } from "@/lib/live/format";

type Item = Database["public"]["Tables"]["content_items"]["Row"];

const useTonight = () =>
  useQuery({
    queryKey: ["tonight"],
    queryFn: async () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(29, 0, 0, 0); // tonight runs until 05:00
      const { data, error } = await supabase
        .from("content_items").select("*")
        .eq("status", "published").in("type", ["event", "nightlife"])
        .gte("ends_at", now.toISOString()).lt("starts_at", end.toISOString())
        .order("starts_at", { ascending: true }).limit(6);
      if (error) throw error;
      // Events with no end time: also include those starting later tonight.
      const { data: open } = await supabase
        .from("content_items").select("*")
        .eq("status", "published").in("type", ["event", "nightlife"]).is("ends_at", null)
        .gte("starts_at", new Date(now.getTime() - 2 * 3600_000).toISOString()).lt("starts_at", end.toISOString())
        .order("starts_at", { ascending: true }).limit(6);
      const merged = [...(data ?? []), ...(open ?? [])];
      const seen = new Set<string>();
      return merged
        .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
        .sort((a, b) => new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime())
        .slice(0, 6);
    },
    staleTime: 5 * 60_000,
  });

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
  const tonight = useTonight();
  const briefs = useBriefs();
  const eventsFeed = useEventsFeed();
  const newsFeed = useNewsFeed();
  // Tonight first; on a quiet night, fill the row with what's coming up this week.
  const allEvents = (eventsFeed.data?.events ?? []).filter(isEveningOut);
  const tonightOnly = allEvents.filter((e) => inRange(e.start, e.end, "tonight"));
  const feedTonight = (tonightOnly.length >= 3 ? tonightOnly : [...tonightOnly, ...allEvents.filter((e) => !tonightOnly.includes(e) && inRange(e.start, e.end, "week"))]).slice(0, 10);
  const feedNews = (newsFeed.data?.news ?? []).slice(0, 8);
  const tonightCount = feedTonight.length + (tonight.data?.length ?? 0);
  const newsCount = feedNews.length + (briefs.data?.length ?? 0);

  useEffect(() => {
    document.title = lang === "he" ? "TLV Radar · מה קורה בתל אביב עכשיו" : "TLV Radar · Tel Aviv right now";
  }, [lang]);

  return (
    <SiteLayout>
      <TonightHero />
      <div className="container-page">
        <div className="mt-2">
          <ConditionsStrip />
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr,360px]">
          <div className="space-y-10 min-w-0">
            <section aria-labelledby="tonight-h">
              <div className="flex items-baseline justify-between">
                <h2 id="tonight-h" className="font-display text-[26px] leading-none">{t("now.tonight")}</h2>
                <Link to="/events" className="text-[14px] text-sea hover:underline underline-offset-4">{t("now.seeWeek")}</Link>
              </div>
              {tonightCount > 0 ? (
                <>
                  {feedTonight.length > 0 && (
                    <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:thin]">
                      {feedTonight.map((e) => (
                        <PosterCard key={e.id} e={e} showDay={!tonightOnly.includes(e)} className="snap-start shrink-0 w-[46%] sm:w-[220px]" />
                      ))}
                    </div>
                  )}
                  {(tonight.data ?? []).length > 0 && (
                    <ul className="mt-2 divide-y divide-border">
                      {(tonight.data ?? []).map((i) => <ItemRow key={i.id} item={i} lead={i.starts_at ? fmtClock(i.starts_at, lang) : ""} />)}
                    </ul>
                  )}
                </>
              ) : (
                !tonight.isLoading && !eventsFeed.isLoading && <p className="mt-3 text-[14px] text-muted-foreground">{t("now.tonightEmpty")}</p>
              )}
            </section>

            <section aria-labelledby="news-h">
              <div className="flex items-baseline justify-between">
                <h2 id="news-h" className="font-display text-[26px] leading-none">{t("now.news")}</h2>
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

            <OpenNearby />
          </div>

          <aside className="space-y-8">
            <ShabbatCard />
            <BeachList />
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
};

export default Now;
