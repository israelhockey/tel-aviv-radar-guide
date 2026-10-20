import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useNewsFeed } from "@/lib/live/hooks";
import { NewsCard } from "@/components/radar/NewsCard";
import { articlesFor, CATEGORY_LABEL, type Article } from "@/lib/articles";
import { usePhoto } from "@/components/article/Blocks";
import { ArticleCard } from "./Magazine";
import { Hungry, LiveStrip, NeighbourhoodPostcards, NumbersBand, PostcardHero, TonightTickets } from "@/components/home/Postcard";

// A small list row for the magazine front: thumbnail, category, title.
const ArticleRow = ({ a }: { a: Article }) => {
  const { lang } = useI18n();
  const p = usePhoto(a.cover, a.slug);
  const cat = CATEGORY_LABEL[a.category];
  return (
    <Link to={`/magazine/${a.slug}`} className="group flex gap-4 py-4 border-t border-border first:border-t-0">
      {p ? <img src={p.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-20 w-24 shrink-0 rounded-md object-cover" /> : <span className="h-20 w-24 shrink-0 rounded-md" style={{ background: cat.color }} />}
      <span className="min-w-0">
        <span className="block text-[12px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>{lang === "he" ? cat.he : cat.en}</span>
        <span className="mt-0.5 block font-display text-[19px] leading-tight group-hover:text-accent" dir="auto">{a.title}</span>
      </span>
    </Link>
  );
};

const Shelf = ({ title, to, list }: { title: string; to: string; list: Article[] }) => {
  const { t } = useI18n();
  if (!list.length) return null;
  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between gap-3 border-b-[3px] border-foreground pb-2">
        <h2 className="font-display text-[28px] sm:text-[34px] leading-none">{title}</h2>
        <Link to={to} className="text-[15px] font-bold text-sea hover:underline underline-offset-4">{t("now.allGuides")}</Link>
      </div>
      <div className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {list.slice(0, 4).map((a) => <ArticleCard key={a.slug} a={a} />)}
      </div>
    </section>
  );
};

const Now = () => {
  const { t, lang } = useI18n();
  const news = useNewsFeed();
  const L = (en: string, he: string) => (lang === "he" ? he : en);
  const all = articlesFor(lang);
  const lead = all.find((a) => a.featured) ?? all[0];
  const side = all.filter((a) => a !== lead).slice(0, 5);
  const used = new Set([lead, ...side].map((a) => a?.slug));
  const pick = (cats: string[]) => all.filter((a) => cats.includes(a.category) && !used.has(a.slug));

  useEffect(() => {
    document.title = lang === "he" ? "Discover Tel Aviv · מה קורה בתל אביב עכשיו" : "Discover Tel Aviv · Events, food, beaches and the city right now";
  }, [lang]);

  return (
    <SiteLayout>
      <PostcardHero />
      <LiveStrip />
      <TonightTickets />
      <NumbersBand />

      <div className="container-page">
        {lead && (
          <section className="pt-16">
            <div className="flex items-baseline justify-between gap-3 border-b-[3px] border-foreground pb-2">
              <h2 className="font-display text-[38px] sm:text-[56px] leading-[1]">{L("The latest", "החדשים במגזין")}</h2>
              <Link to="/magazine" className="text-[17px] font-bold text-sea hover:underline underline-offset-4">{L("The magazine", "למגזין")}</Link>
            </div>
            <div className="mt-7 grid gap-8 lg:grid-cols-[1.5fr,1fr]">
              <ArticleCard a={lead} big />
              <div>{side.map((a) => <ArticleRow key={a.slug} a={a} />)}</div>
            </div>
          </section>
        )}
      </div>

      <NeighbourhoodPostcards />

      <div className="container-page">
        <Shelf title={L("Eat & drink: the best of", "אוכל ושתייה: הכי טובים")} to="/magazine" list={pick(["food", "drink"])} />
        <Shelf title={L("Visiting Tel Aviv", "מבקרים בתל אביב")} to="/magazine" list={pick(["tourists", "outdoors"])} />
      </div>

      <Hungry />

      <div className="container-page">
        <Shelf title={L("Living here", "לגור כאן")} to="/magazine" list={pick(["newcomers", "neighbourhoods", "holidays", "family"])} />

        {(news.data?.news ?? []).length > 0 && (
          <section className="mt-14">
            <div className="flex items-baseline justify-between gap-3 border-b-[3px] border-foreground pb-2">
              <h2 className="font-display text-[28px] sm:text-[34px] leading-none">{t("now.news")}</h2>
              <Link to="/news" className="text-[15px] font-bold text-sea hover:underline underline-offset-4">{t("now.allNews")}</Link>
            </div>
            <div className="mt-5 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-4 overflow-x-auto snap-x pb-2 [scrollbar-width:thin]">
              {(news.data?.news ?? []).slice(0, 10).map((n) => <NewsCard key={n.id} n={n} className="snap-start shrink-0 w-[78%] sm:w-[280px]" />)}
            </div>
          </section>
        )}

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { to: "/weekend", bg: "#ff5a4e", fg: "#fff", t: L("This weekend", "סוף השבוע"), s: L("Our picks, the beach outlook and Shabbat times.", "הבחירות שלנו, תחזית חוף וזמני שבת.") },
            { to: "/hotels", bg: "#0057ff", fg: "#fff", t: L("Where to stay", "איפה לישון"), s: L("Every hotel and hostel on the map, by beach.", "כל המלונות וההוסטלים על המפה.") },
            { to: "/walks", bg: "#ffcb05", fg: "#0b1a33", t: L("Free walking tours", "סיורים חינם"), s: L("Bauhaus, Jaffa, Florentin and the market.", "באוהאוס, יפו, פלורנטין והשוק.") },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="rounded-[10px] p-6 transition-transform hover:-translate-y-1" style={{ background: c.bg, color: c.fg }}>
              <span className="block font-display text-[30px] leading-tight">{c.t}</span>
              <span className="mt-1 block text-[15px] opacity-90">{c.s}</span>
            </Link>
          ))}
        </section>
      </div>
    </SiteLayout>
  );
};

export default Now;
