import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Share2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { ARTICLES, articleBySlug, CATEGORY_LABEL } from "@/lib/articles";
import { Markdown } from "@/components/article/Markdown";
import { Credit, usePhoto } from "@/components/article/Blocks";
import { ArticleCard } from "./Magazine";

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
  const related = ARTICLES.filter((x) => x.slug !== a.slug && (x.category === a.category || x.tags.some((tg) => a.tags.includes(tg)))).slice(0, 3);
  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: a.title, url }).catch(() => undefined);
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${a.title} ${url}`)}`, "_blank", "noopener");
  };

  return (
    <SiteLayout>
      <article>
        <header className="container-page pt-8 sm:pt-12 max-w-3xl">
          <Link to="/magazine" className="inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold text-white" style={{ background: cat.color }}>{lang === "he" ? cat.he : cat.en}</Link>
          <h1 className="mt-3 font-display text-[40px] sm:text-[60px] leading-[1.02]" dir="auto">{a.title}</h1>
          {a.dek && <p className="mt-3 text-[20px] leading-relaxed text-muted-foreground" dir="auto">{a.dek}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-muted-foreground">
            <span>{a.author}</span>
            <span>{t("art.updated")} {fmtDate(a.updated ?? a.date, lang)}</span>
            <span>{a.readMinutes} {t("art.minRead")}</span>
            <button onClick={share} className="ms-auto inline-flex items-center gap-1.5 h-9 rounded-md border border-border px-3 text-foreground hover:bg-secondary">
              <Share2 className="h-4 w-4" aria-hidden />{t("art.share")}
            </button>
          </div>
        </header>
        {cover && (
          <figure className="container-page mt-8 max-w-5xl">
            <img src={cover.src} alt="" referrerPolicy="no-referrer" className="w-full aspect-[16/8] object-cover rounded-xl" />
            <figcaption className="mt-2 text-end"><Credit p={cover} /></figcaption>
          </figure>
        )}
        <div className="container-page max-w-3xl pb-6" dir={a.lang === "he" ? "rtl" : "ltr"} lang={a.lang}>
          <Markdown source={a.body} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="container-page mt-12 border-t border-border pt-10">
          <h2 className="font-display text-[28px]">{t("art.more")}</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            {related.map((r) => <ArticleCard key={r.slug} a={r} />)}
          </div>
        </section>
      )}
    </SiteLayout>
  );
};

export default ArticlePage;
