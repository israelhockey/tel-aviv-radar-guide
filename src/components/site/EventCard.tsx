import { Link } from "react-router-dom";
import { MapPin, Clock } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["content_items"]["Row"];

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  news: { label: "NEWS", cls: "bg-cat-news" },
  event: { label: "EVENT", cls: "bg-cat-music" },
  opening: { label: "NEW", cls: "bg-cat-food" },
  food: { label: "FOOD", cls: "bg-cat-food" },
  nightlife: { label: "NIGHTLIFE", cls: "bg-cat-dj" },
  business: { label: "BUSINESS", cls: "bg-cat-business" },
  guide: { label: "GUIDE", cls: "bg-cat-art" },
};

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export const EventCard = ({ item, badge }: { item: Item; badge?: { label: string; cls: string } }) => {
  const b = badge ?? TYPE_BADGE[item.type] ?? TYPE_BADGE.event;
  return (
    <Link to={`/post/${item.slug}`} className="group block card-soft overflow-hidden hover:shadow-md transition">
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {item.hero_image_url && (
          <img
            src={item.hero_image_url}
            alt={item.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <span className={`badge-cat absolute top-3 left-3 ${b.cls}`}>{b.label}</span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[15px] leading-snug text-foreground line-clamp-2 group-hover:text-accent transition-colors">
          {item.title}
        </h3>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {item.neighborhood && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.neighborhood}</span>
          )}
          {item.starts_at && (
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtTime(item.starts_at)}</span>
          )}
          {item.price && <span className="ml-auto font-semibold text-foreground">{item.price}</span>}
        </div>
      </div>
    </Link>
  );
};

export const SmallRow = ({ item, badge }: { item: Item; badge?: { label: string; cls: string } }) => {
  const b = badge ?? TYPE_BADGE[item.type] ?? TYPE_BADGE.event;
  return (
    <Link to={`/post/${item.slug}`} className="flex gap-3 group">
      <div className="relative h-14 w-14 flex-shrink-0 rounded-md overflow-hidden bg-muted">
        {item.hero_image_url && <img src={item.hero_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-accent leading-snug">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.venue || item.neighborhood}{item.starts_at ? ` · ${fmtTime(item.starts_at)}` : ""}
        </p>
      </div>
    </Link>
  );
};

export const BriefRow = ({ item }: { item: Item }) => {
  const b = TYPE_BADGE[item.type] ?? TYPE_BADGE.news;
  return (
    <Link to={`/post/${item.slug}`} className="block card-soft p-4 hover:shadow-md transition group">
      <span className={`badge-cat ${b.cls}`}>{b.label}</span>
      <h4 className="font-bold text-[14px] leading-snug mt-2 line-clamp-2 group-hover:text-accent">{item.title}</h4>
      {item.summary && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.summary}</p>}
      <p className="text-[11px] text-muted-foreground mt-3">
        {item.source_name || "TLV Radar"}
        {item.published_at && ` · ${timeAgo(item.published_at)}`}
      </p>
    </Link>
  );
};

const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

export { TYPE_BADGE };
