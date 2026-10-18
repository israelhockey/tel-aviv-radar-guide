import { useState } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import type { FeedNews } from "@/lib/live/sources";

// One colour per outlet, so the same source is recognisable at a glance.
const SOURCE_BG: Record<string, string> = {
  "Secret Tel Aviv": "bg-cat-party",
  ynet: "bg-cat-theatre",
  Ynetnews: "bg-cat-theatre",
  Haaretz: "bg-cat-talk",
  "The Jerusalem Post": "bg-cat-sport",
  "מעריב": "bg-cat-festival",
  "גלובס": "bg-cat-meetup",
};
const sourceBg = (s: string) => SOURCE_BG[s] ?? "bg-cat-news";

export const relTime = (iso: string | null, lang: Lang) => {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(lang === "he" ? "he" : "en", { numeric: "auto", style: "short" });
  if (min < 60) return rtf.format(-Math.max(1, min), "minute");
  if (min < 24 * 60) return rtf.format(-Math.round(min / 60), "hour");
  return rtf.format(-Math.round(min / 1440), "day");
};

const Picture = ({ n, className = "", big = false }: { n: FeedNews; className?: string; big?: boolean }) => {
  const [broken, setBroken] = useState(false);
  const has = n.image && !broken;
  return (
    <div className={`relative overflow-hidden ${has ? "bg-muted" : sourceBg(n.source)} ${className}`}>
      {has ? (
        <img
          src={n.image!}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        // No picture: the outlet's name set large on its colour, like a front page masthead.
        <span className={`absolute inset-0 flex items-center justify-center p-4 font-display text-white/90 ${big ? "text-[44px]" : "text-[26px]"}`} dir="auto">
          {n.source}
        </span>
      )}
    </div>
  );
};

const Meta = ({ n, light = false }: { n: FeedNews; light?: boolean }) => {
  const { lang } = useI18n();
  return (
    <span className={`flex items-center gap-2 text-[12px] ${light ? "text-white/85" : "text-muted-foreground"}`}>
      <span className={`h-2 w-2 rounded-full ${sourceBg(n.source)}`} aria-hidden />
      <span dir="auto" className="font-medium">{n.source}</span>
      <span aria-hidden>·</span>
      <span className="tabular">{relTime(n.published, lang)}</span>
    </span>
  );
};

/** The day's top story: full-width picture with the headline over it. */
export const NewsLead = ({ n }: { n: FeedNews }) => (
  <a href={n.url} target="_blank" rel="noopener noreferrer" className="group relative block rounded-[var(--radius)] overflow-hidden shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea">
    <Picture n={n} big className="aspect-[4/3] sm:aspect-[16/8]" />
    <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" aria-hidden />
    <span className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
      <Meta n={n} light />
      <span className="mt-2 block font-display text-[26px] sm:text-[38px] leading-[1.05] text-white" lang={n.lang} dir={n.lang === "he" ? "rtl" : "ltr"}>{n.title}</span>
      {n.summary && <span className="mt-2 hidden sm:block max-w-2xl text-[15px] text-white/85 line-clamp-2" dir="auto">{n.summary}</span>}
    </span>
  </a>
);

/** Picture on top, headline and a line of summary below. */
export const NewsCard = ({ n, className = "" }: { n: FeedNews; className?: string }) => (
  <a href={n.url} target="_blank" rel="noopener noreferrer" className={`group flex flex-col rounded-[var(--radius)] overflow-hidden bg-card shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${className}`}>
    <Picture n={n} className="aspect-[16/10]" />
    <span className="flex-1 p-3.5">
      <Meta n={n} />
      <span className="mt-1.5 block text-[16px] font-medium leading-snug line-clamp-3 group-hover:text-sea" lang={n.lang} dir={n.lang === "he" ? "rtl" : "ltr"}>{n.title}</span>
      {n.summary && <span className="mt-1 block text-[13px] text-muted-foreground line-clamp-2" dir="auto">{n.summary}</span>}
    </span>
  </a>
);

/** Compact: small square picture beside the headline. */
export const NewsRowCard = ({ n }: { n: FeedNews }) => (
  <li>
    <a href={n.url} target="_blank" rel="noopener noreferrer" className="group grid grid-cols-[88px,1fr] gap-3 py-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea">
      <Picture n={n} className="aspect-square rounded-lg [&_span]:text-[13px]" />
      <span className="min-w-0">
        <Meta n={n} />
        <span className="mt-1 block text-[15px] leading-snug line-clamp-3 group-hover:text-sea" lang={n.lang} dir={n.lang === "he" ? "rtl" : "ltr"}>{n.title}</span>
      </span>
    </a>
  </li>
);
