import { useState } from "react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { fmtClock } from "@/lib/live/format";
import { dayHeading, nightKey } from "@/lib/live/when";
import type { FeedEvent } from "@/lib/live/sources";

// One colour per kind of event; the same colours mark events on the map.
export const CAT_BG: Record<string, string> = {
  music: "bg-cat-music", comedy: "bg-cat-comedy", theatre: "bg-cat-theatre", party: "bg-cat-party",
  family: "bg-cat-family", talk: "bg-cat-talk", festival: "bg-cat-festival", sport: "bg-cat-sport",
  meetup: "bg-cat-meetup", art: "bg-cat-art", market: "bg-cat-food", community: "bg-cat-community", other: "bg-cat-other",
};

export const PosterCard = ({ e, showDay = false, className = "" }: { e: FeedEvent; showDay?: boolean; className?: string }) => {
  const { t, lang } = useI18n();
  const [broken, setBroken] = useState(false);
  const cat = CAT_BG[e.category] ?? CAT_BG.other;
  return (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-[var(--radius)] overflow-hidden bg-card shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${className}`}
    >
      <div className={`relative aspect-[4/5] overflow-hidden ${e.image && !broken ? "bg-muted" : cat}`}>
        {e.image && !broken ? (
          <img
            src={e.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          // No poster: the title set large on the category colour.
          <span className="absolute inset-0 p-4 flex items-end font-display text-[22px] leading-tight text-white" dir="auto">{e.title}</span>
        )}
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" aria-hidden />
        <span className="absolute bottom-3 start-3 flex items-baseline gap-2 text-white">
          {!e.allDay && <span className="text-[22px] font-medium tabular leading-none">{fmtClock(e.start, lang)}</span>}
          {showDay && <span className="text-[12px] opacity-85">{dayHeading(nightKey(e.start), lang)}</span>}
        </span>
        <span className={`absolute top-3 start-3 rounded-full px-2.5 py-1 text-[11px] font-medium text-white ${cat}`}>
          {t(`cat.${e.category}` as StringKey)}
        </span>
      </div>
      <div className="p-3">
        <p className="text-[15px] leading-snug line-clamp-2 group-hover:text-sea" dir="auto">{e.title}</p>
        <p className="mt-1 flex flex-wrap gap-x-2 text-[12px] text-muted-foreground">
          {e.venue && <span dir="auto" className="truncate max-w-full">{e.venue}</span>}
          {e.free ? (
            <span className="text-surf font-medium">{t("on.free")}</span>
          ) : e.priceFrom != null ? (
            <span className="tabular">{t("on.from")}{lang === "he" ? "" : " "}₪{Math.round(e.priceFrom)}</span>
          ) : null}
        </p>
      </div>
    </a>
  );
};
