import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["content_items"]["Row"];

const TYPE_LABEL: Record<string, string> = {
  news: "News", event: "Event", opening: "Opening",
  food: "Food", nightlife: "Nightlife", business: "Business", guide: "Guide",
};

export const ContentCard = ({ item, size = "md" }: { item: Item; size?: "sm" | "md" | "lg" }) => {
  const date = item.starts_at || item.published_at;
  return (
    <Link to={`/post/${item.slug}`} className="group block">
      {item.hero_image_url && (
        <div className={`relative overflow-hidden bg-muted ${size === "lg" ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
          <img
            src={item.hero_image_url}
            alt={item.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="pt-3">
        <div className="kicker text-accent">
          {TYPE_LABEL[item.type] ?? item.type}
          {item.neighborhood && <span className="text-muted-foreground"> · {item.neighborhood}</span>}
        </div>
        <h3 className={`font-display font-black leading-[1.05] mt-2 group-hover:text-accent transition-colors ${
          size === "lg" ? "text-3xl sm:text-4xl" : size === "sm" ? "text-lg" : "text-2xl"
        }`}>
          {item.title}
        </h3>
        {item.summary && size !== "sm" && (
          <p className="mt-2 text-muted-foreground text-sm line-clamp-2">{item.summary}</p>
        )}
        {date && (
          <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            {new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </Link>
  );
};
