import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Share2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { articleBySlug, CATEGORY_LABEL, articlesFor, translationOf } from "@/lib/articles";
import { Markdown } from "@/components/article/Markdown";
import { Credit, usePhoto } from "@/components/article/Blocks";
import { ArticleCard } from "./Magazine";
import { SectionHead } from "@/components/postcard/ui";

const fmtDate = (ymd: string, lang: "en" | "he") =>
  new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ymd}T12:00:00Z`));

const ArticlePage = () => {
  const { slug = "" } = useParams();
  const { t, lang } = useI18n();
  const a = articleBySlug(slug);
  const cover = usePhoto(a?.cover, a?.slug);

  useEffect(() => {
    if (a) document.title = `${a.title} · Discover Tel Aviv`;
    window.scrollTo(0, 0);
  }, [a]);

  if (!a) {
    return (
      <SiteLayout>
        <div className="container-page py-20">
          <h1 className="font-display text-[40px]">{t("art.notFound")}</h1>
          <Link to="/magazine" className="mt-4 inline-block text-sea underline">{t("mag.title")}</Link>
        </div>
      </SiteLayout>
    );
  }

  const cat = CATEGORY_LABEL[a.category];
  const other = translationOf(a, lang === "he" ? "he" : "en");
  const related = articlesFor(a.lang).filter((x) => x.slug !== a.slug && x.slug !== a.pair && (x.category === a.category || x.tags.some((tg) => a.tags.includes(tg)))).slice(0, 3);
  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: a.title, url }).catch(() => undefined);
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${a.title} ${url}`)}`, "_blank", "noopener");
  };

  return (
    <SiteLayout>
      <article dir={a.lang === "he" ? "rtl" : "ltr"}>
        <div className="relative h-[300px] sm:h-[460px] overflow-hidden" style={{ background: cat.color }}>
          {cover && <img src={cover.src} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />}
        </div>
        <header className="container-page max-w-4xl relative -mt-24 sm:-mt-32">
          <div className="bg-card px-5 py-6 sm:px-10 sm:py-9 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/magazine" className="inline-block rounded-[4px] px-2.5 py-1 text-[13px] font-bold text-white" style={{ background: cat.color }}>{lang === "he" ? cat.he : cat.en}</Link>
              {other && other.slug !== a.slug && (
                <Link to={`/magazine/${other.slug}`} className="inline-block rounded-[4px] bg-[#ffcb05] text-[#0b1a33] px-2.5 py-1 text-[13px] font-bold">{other.lang === "he" ? "לקריאה בעברית" : "Read in English"}</Link>
              )}
            </div>
            <h1 className="mt-4 font-display text-[38px] sm:text-[64px] leading-[0.98] [text-wrap:balance]" dir="auto">{a.title}</h1>
            {a.dek && <p className="mt-4 text-[19px] sm:text-[22px] leading-snug text-muted-foreground" dir="auto">{a.dek}</p>}
            <div className="mt-6 pt-4 border-t-2 border-dashed border-border flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-muted-foreground">
              <span className="font-semibold text-foreground">{a.author}</span>
              <span>{t("art.updated")} {fmtDate(a.updated ?? a.date, lang)}</span>
              <span>{a.readMinutes} {t("art.minRead")}</span>
              <button onClick={share} className="ms-auto inline-flex items-center gap-1.5 h-10 rounded-md bg-sea text-sea-foreground px-4 font-bold hover:opacity-90">
                <Share2 className="h-4 w-4" aria-hidden />{t("art.share")}
              </button>
            </div>
          </div>
          {cover && <p className="mt-2 text-end"><Credit p={cover} /></p>}
        </header>
        <div className="container-page max-w-3xl pb-6 text-[18px] leading-relaxed" dir={a.lang === "he" ? "rtl" : "ltr"} lang={a.lang}>
          <Markdown source={a.body} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="container-page mt-14">
          <SectionHead title={t("art.more")} to="/magazine" link={t("now.allGuides")} />
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {related.map((r) => <ArticleCard key={r.slug} a={r} />)}
          </div>
        </section>
      )}
    </SiteLayout>
  );
};

export default ArticlePage;
