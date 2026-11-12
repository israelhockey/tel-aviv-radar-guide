import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { articlesFor, type Article } from "@/lib/articles";
import { ArticleCard } from "./Magazine";
import { NeighbourhoodPostcards, TonightTickets } from "@/components/home/Postcard";
import { BuildHero } from "@/components/build/BuildHero";
import { DailyChanges } from "@/components/build/DailyChanges";

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
  const { lang } = useI18n();
  const L = (en: string, he: string) => (lang === "he" ? he : en);
  const all = articlesFor(lang);
  const living = ["renting-an-apartment-tel-aviv", "best-neighbourhoods-to-live-tel-aviv", "tama-38-explained", "arnona-tel-aviv-explained"]
    .map((slug) => all.find((a) => a.slug === slug || a.pair === slug)).filter(Boolean) as Article[];
  const used = new Set(living.map((a) => a.slug));
  const pick = (cats: string[]) => all.filter((a) => cats.includes(a.category) && !used.has(a.slug));

  useEffect(() => {
    document.title = lang === "he" ? "מה בונים לידך? היתרי בניה ואתרי בניה לפי כתובת · Discover Tel Aviv" : "What's being built near you? Tel Aviv building permits and construction by address · Discover Tel Aviv";
  }, [lang]);

  return (
    <SiteLayout>
      <BuildHero />
      <DailyChanges />

      <div className="container-page">
        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { to: "/compare", bg: "#0057ff", fg: "#fff", t: L("Compare apartments", "השוואת דירות"), s: L("Up to three addresses side by side, with a noise score for each.", "עד שלוש כתובות זו לצד זו, עם ציון רעש לכל אחת.") },
            { to: "/construction-noise-rules", bg: "#ffcb05", fg: "#0b1a33", t: L("Noise rules and your rights", "כללי רעש והזכויות שלך"), s: L("When building work is allowed, and how to complain.", "מתי מותר לבנות, ואיך מתלוננים.") },
            { to: "/area", bg: "#ff5a4e", fg: "#fff", t: L("Neighbourhood guides", "מדריכי שכונות"), s: L("What each area is like to live in, with live construction data.", "איך זה לגור בכל שכונה, עם נתוני בניה חיים.") },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="rounded-[10px] p-6 transition-transform hover:-translate-y-1" style={{ background: c.bg, color: c.fg }}>
              <span className="block font-display text-[28px] leading-tight">{c.t}</span>
              <span className="mt-1 block text-[15px] opacity-90">{c.s}</span>
            </Link>
          ))}
        </section>

        <Shelf title={L("Living in Tel Aviv", "לגור בתל אביב")} to="/magazine?cat=newcomers" list={living} />
      </div>

      <NeighbourhoodPostcards />

      <div className="container-page pt-6">
        <p className="text-[15px] font-bold text-accent">{L("And when you're not apartment hunting", "וכשלא מחפשים דירה")}</p>
      </div>
      <TonightTickets />

      <div className="container-page">
        <Shelf title={L("Eat & drink: the best of", "אוכל ושתייה: הכי טובים")} to="/magazine?cat=food" list={pick(["food", "drink"])} />
      </div>
    </SiteLayout>
  );
};

export default Now;
