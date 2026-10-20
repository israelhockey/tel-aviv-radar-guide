import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useEventsFeed, useFoodPhotos, usePlaces } from "@/lib/live/hooks";
import { openStateAt } from "@/lib/live/openingHours";
import { inRange } from "@/lib/live/when";
import { neighbourhoodOf } from "@/lib/live/geo";
import { dishOf, pickPhoto } from "@/lib/live/dishes";
import { placeSlug } from "@/lib/placeMatch";
import { articlesFor } from "@/lib/articles";
import { NightHero, NightMarquee, WhereTheNightGoes } from "@/components/night/Night";
import { PosterCard } from "@/components/radar/PosterCard";
import { ArticleCard } from "./Magazine";

// Nightlife: bars open now and late, parties and the guides, in the After Dark look.
const lateTonight = () => {
  const d = new Date();
  d.setHours(d.getHours() < 6 ? d.getHours() : 23, 30, 0, 0);
  return d;
};

const Nightlife = () => {
  const { t, lang } = useI18n();
  const he = lang === "he";
  const places = usePlaces();
  const photos = useFoodPhotos();
  const events = useEventsFeed();
  useEffect(() => { document.title = `${he ? "חיי לילה" : "Nightlife"} · Discover Tel Aviv`; }, [he]);

  const bars = useMemo(() => {
    const all = (places.data ?? []).filter((p) => ["bar", "pub", "biergarten"].includes(p.kind) && p.name);
    const open = all.filter((p) => openStateAt(p.hours).status === "open");
    const late = all.filter((p) => openStateAt(p.hours, lateTonight()).status === "open");
    return { all, list: (open.length >= 8 ? open : late.length ? late : all).slice(0, 24), open: open.length };
  }, [places.data]);
  const parties = (events.data?.events ?? []).filter((e) => ["party", "music"].includes(e.category) && inRange(e.start, e.end, "week")).slice(0, 12);
  const reads = articlesFor(lang).filter((a) => ["nightlife", "drink"].includes(a.category)).slice(0, 4);

  return (
    <SiteLayout zone="night">
      <NightHero title={he ? ["אחרי", "החשיכה"] : ["After", "dark"]} onList={false} />
      <NightMarquee />

      <section className="container-page pt-16">
        <h2 className="font-display text-[60px] sm:text-[84px] leading-[0.9]">{bars.open >= 8 ? (he ? "פתוח עכשיו" : "Pouring now") : (he ? "פתוח הלילה" : "Open tonight")}</h2>
        <ul className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
          {bars.list.map((p) => {
            const ph = pickPhoto(photos.data?.[dishOf(p)], p.id);
            const s = openStateAt(p.hours);
            const hood = neighbourhoodOf(p);
            return (
              <li key={p.id}>
                <Link to={`/place/${placeSlug(p)}`} className="group block">
                  {ph ? <img src={ph.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full aspect-[4/3] object-cover rounded-[4px]" /> : <span className="block w-full aspect-[4/3] rounded-[4px] bg-secondary" />}
                  <span className="mt-2 block text-[17px] font-extrabold truncate group-hover:text-accent" dir="auto">{(lang === "en" && p.nameEn) || p.name}</span>
                  <span className="block text-[13px] text-muted-foreground truncate">{hood ? (he ? hood.he : hood.en) : ""}{p.happy ? ` · ${he ? "הפי האוור" : "happy hour"}` : ""}</span>
                  {s.status === "open" && <span className="block text-[13px] font-bold text-accent">{t("food.openTill")} {s.until ?? ""}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link to="/eat/cocktail" className="mt-6 inline-block font-extrabold text-accent underline-offset-4 hover:underline">{he ? `כל ${bars.all.length} הברים` : `All ${bars.all.length} bars`}</Link>
      </section>

      {parties.length > 0 && (
        <section className="container-page pt-16">
          <h2 className="font-display text-[60px] sm:text-[84px] leading-[0.9]">{he ? "מסיבות והופעות" : "Parties & gigs"}</h2>
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {parties.map((e) => <PosterCard key={e.id} e={e} showDay />)}
          </div>
        </section>
      )}

      <WhereTheNightGoes />

      {reads.length > 0 && (
        <section className="container-page pt-16">
          <h2 className="font-display text-[48px] sm:text-[64px] leading-[0.9]">{he ? "המדריכים" : "The guides"}</h2>
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{reads.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
        </section>
      )}
    </SiteLayout>
  );
};

export default Nightlife;
