import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { CATEGORY_LABEL, type Article, type ArticleCategory, articlesFor } from "@/lib/articles";
import { usePhoto } from "@/components/article/Blocks";
import { BandHero } from "@/components/postcard/ui";

const Cover = ({ a, className = "" }: { a: Article; className?: string }) => {
  const p = usePhoto(a.cover, a.slug);
  const cat = CATEGORY_LABEL[a.category];
  return p ? (
    <img src={p.src} alt="" loading="lazy" referrerPolicy="no-referrer" className={`object-cover ${className}`} />
  ) : <span className={`block ${className}`} style={{ background: cat.color }} />;
};

export const ArticleCard = ({ a, big = false }: { a: Article; big?: boolean }) => {
  const { lang } = useI18n();
  const cat = CATEGORY_LABEL[a.category];
  return (
    <Link to={`/magazine/${a.slug}`} className="group block focus-visible:outline-none">
      <span className="relative block overflow-hidden rounded-[10px] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-sea">
        <Cover a={a} className={`w-full ${big ? "aspect-[16/10]" : "aspect-[4/3]"} transition-transform duration-500 group-hover:scale-[1.03]`} />
        <span className="absolute top-3 start-3 rounded-[4px] px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: cat.color }}>{lang === "he" ? cat.he : cat.en}</span>
      </span>
      <span className={`mt-3 block font-display leading-tight group-hover:text-[#ff5a4e] ${big ? "text-[32px] sm:text-[40px]" : "text-[22px]"}`} dir="auto">{a.title}</span>
      {a.dek && <span className={`mt-1 block text-muted-foreground ${big ? "text-[17px]" : "text-[14px]"} line-clamp-2`} dir="auto">{a.dek}</span>}
    </Link>
  );
};

// A compact row: thumbnail, category, title. Used on the magazine and home fronts.
export const ArticleRow = ({ a }: { a: Article }) => {
  const { lang } = useI18n();
  const cat = CATEGORY_LABEL[a.category];
  return (
    <Link to={`/magazine/${a.slug}`} className="group flex gap-4 py-4 border-t border-border first:border-t-0">
      <Cover a={a} className="h-20 w-24 shrink-0 rounded-md" />
      <span className="min-w-0">
        <span className="block text-[12px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>{lang === "he" ? cat.he : cat.en}</span>
        <span className="mt-0.5 block font-display text-[19px] leading-tight group-hover:text-accent" dir="auto">{a.title}</span>
      </span>
    </Link>
  );
};

const Magazine = () => {
  const { t, lang } = useI18n();
  const [cat, setCat] = useState<ArticleCategory | "all">(() => (new URLSearchParams(window.location.search).get("cat") as ArticleCategory) || "all");

  useEffect(() => {
    document.title = lang === "he" ? "מגזין · Discover Tel Aviv" : "Magazine · Discover Tel Aviv";
  }, [lang]);

  const ALL = articlesFor(lang);
  const cats = (Object.keys(CATEGORY_LABEL) as ArticleCategory[]).filter((c) => ALL.some((a) => a.category === c));
  const list = ALL.filter((a) => cat === "all" || a.category === cat);
  const lead = list.find((a) => a.featured) ?? list[0];
  const side = list.filter((a) => a !== lead).slice(0, 5);
  const used = new Set([lead, ...side].map((a) => a?.slug));

  return (
    <SiteLayout>
      <BandHero title={t("mag.title")} dek={t("mag.body")}>
        <div className="mt-8 flex flex-wrap gap-2">
          <button onClick={() => setCat("all")} aria-pressed={cat === "all"} className={`h-10 rounded-md px-4 text-[15px] font-bold transition-colors ${cat === "all" ? "bg-[#ffcb05] text-[#0b1a33]" : "bg-white/15 hover:bg-white/25"}`}>{t("food.all")}</button>
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`h-10 rounded-md px-4 text-[15px] font-bold transition-colors ${cat === c ? "bg-[#ffcb05] text-[#0b1a33]" : "bg-white/15 hover:bg-white/25"}`}>
              {lang === "he" ? CATEGORY_LABEL[c].he : CATEGORY_LABEL[c].en}
            </button>
          ))}
        </div>
      </BandHero>

      <div className="container-page">
        {lead && (
          <div className="mt-12 grid gap-8 lg:grid-cols-[1.5fr,1fr]">
            <ArticleCard a={lead} big />
            <div>{side.map((a) => <ArticleRow key={a.slug} a={a} />)}</div>
          </div>
        )}

        {cat === "all" ? (
          cats.map((c) => {
            const shelf = ALL.filter((a) => a.category === c && !used.has(a.slug));
            if (!shelf.length) return null;
            return (
              <section key={c} className="mt-16">
                <div className="flex items-baseline justify-between gap-3 border-b-[3px] pb-2" style={{ borderColor: CATEGORY_LABEL[c].color }}>
                  <h2 className="font-display text-[30px] sm:text-[40px] leading-none">{lang === "he" ? CATEGORY_LABEL[c].he : CATEGORY_LABEL[c].en}</h2>
                  <button onClick={() => { setCat(c); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-[15px] font-bold text-sea hover:underline underline-offset-4">{t("area.seeAll")} ({ALL.filter((a) => a.category === c).length})</button>
                </div>
                <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                  {shelf.slice(0, 4).map((a) => <ArticleCard key={a.slug} a={a} />)}
                </div>
              </section>
            );
          })
        ) : (
          <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {list.filter((a) => !used.has(a.slug)).map((a) => <ArticleCard key={a.slug} a={a} />)}
          </div>
        )}
      </div>
    </SiteLayout>
  );
};

export default Magazine;
