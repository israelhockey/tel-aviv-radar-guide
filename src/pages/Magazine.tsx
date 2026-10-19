import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { ARTICLES, CATEGORY_LABEL, type Article, type ArticleCategory } from "@/lib/articles";
import { usePhoto } from "@/components/article/Blocks";

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
      <span className="relative block overflow-hidden rounded-lg group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-sea">
        <Cover a={a} className={`w-full ${big ? "aspect-[16/10]" : "aspect-[4/3]"} transition-transform duration-500 group-hover:scale-[1.03]`} />
        <span className="absolute top-3 start-3 rounded-md px-2 py-0.5 text-[12px] font-semibold text-white" style={{ background: cat.color }}>{lang === "he" ? cat.he : cat.en}</span>
      </span>
      <span className={`mt-3 block font-display leading-tight group-hover:text-[#d6336c] ${big ? "text-[32px] sm:text-[40px]" : "text-[22px]"}`} dir="auto">{a.title}</span>
      {a.dek && <span className={`mt-1 block text-muted-foreground ${big ? "text-[17px]" : "text-[14px]"} line-clamp-2`} dir="auto">{a.dek}</span>}
    </Link>
  );
};

const Magazine = () => {
  const { t, lang } = useI18n();
  const [cat, setCat] = useState<ArticleCategory | "all">("all");

  useEffect(() => {
    document.title = lang === "he" ? "מגזין · Discover Tel Aviv" : "Magazine · Discover Tel Aviv";
  }, [lang]);

  const cats = (Object.keys(CATEGORY_LABEL) as ArticleCategory[]).filter((c) => ARTICLES.some((a) => a.category === c));
  const list = ARTICLES.filter((a) => cat === "all" || a.category === cat);
  const [lead, ...rest] = cat === "all" ? [ARTICLES.find((a) => a.featured) ?? ARTICLES[0], ...ARTICLES.filter((a) => a !== (ARTICLES.find((x) => x.featured) ?? ARTICLES[0]))] : list;

  const chip = (active: boolean) =>
    `h-9 rounded-md px-3.5 text-[14px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${active ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`;

  return (
    <SiteLayout>
      <div className="container-page pt-8 sm:pt-12">
        <h1 className="font-display text-[48px] sm:text-[72px] leading-[0.95]">{t("mag.title")}</h1>
        <p className="mt-2 text-[17px] text-muted-foreground max-w-xl">{t("mag.body")}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => setCat("all")} aria-pressed={cat === "all"} className={chip(cat === "all")}>{t("food.all")}</button>
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={chip(cat === c)}>{lang === "he" ? CATEGORY_LABEL[c].he : CATEGORY_LABEL[c].en}</button>)}
        </div>

        {lead && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr,1fr]">
            <ArticleCard a={lead} big />
            <div className="grid gap-6">
              {rest.slice(0, 2).map((a) => <ArticleCard key={a.slug} a={a} />)}
            </div>
          </div>
        )}
        <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {rest.slice(2).map((a) => <ArticleCard key={a.slug} a={a} />)}
        </div>
      </div>
    </SiteLayout>
  );
};

export default Magazine;
