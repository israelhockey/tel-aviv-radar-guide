import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { EventCard } from "@/components/site/EventCard";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["content_items"]["Row"];
type CT = Database["public"]["Enums"]["content_type"];

type Window = "today" | "week" | "weekend" | "all";

const TITLES: Record<string, { title: string; subtitle: string; types: CT[]; freeOnly?: boolean; window?: Window }> = {
  news: { title: "Local News", subtitle: "What's moving in the city", types: ["news"] },
  events: { title: "Tonight & this week", subtitle: "Concerts, parties, talks, markets", types: ["event", "nightlife"], window: "week" },
  food: { title: "Food & Drink", subtitle: "Openings, restaurants, bakeries, markets", types: ["food", "opening"] },
  nightlife: { title: "Nightlife", subtitle: "Clubs, bars, late-night", types: ["nightlife"], window: "week" },
  business: { title: "Business & Startups", subtitle: "Local economy & operators", types: ["business"] },
  weekend: { title: "The Weekend Guide", subtitle: "Friday to Sunday in Tel Aviv", types: ["guide", "event"], window: "weekend" },
  free: { title: "Free things to do", subtitle: "All ₪0 — markets, talks, yoga, beach", types: ["event","guide"], freeOnly: true, window: "week" },
};

const getWindow = (w: Window): [Date, Date] => {
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  if (w === "today") {
    const end = new Date(startOfToday); end.setDate(end.getDate() + 1);
    return [now, end];
  }
  if (w === "week") {
    const end = new Date(startOfToday); end.setDate(end.getDate() + 7);
    return [now, end];
  }
  const dow = now.getDay();
  const fri = new Date(startOfToday);
  if (dow === 5 || dow === 6 || dow === 0) {
    const back = dow === 0 ? 2 : dow - 5;
    fri.setDate(startOfToday.getDate() - back);
  } else {
    fri.setDate(startOfToday.getDate() + ((5 - dow + 7) % 7));
  }
  const mon = new Date(fri); mon.setDate(mon.getDate() + 3);
  return [fri, mon];
};

const Category = () => {
  const slug = useLocation().pathname.replace(/^\//, "");
  const meta = TITLES[slug];
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meta) return;
    document.title = `${meta.title} — Discover Tel Aviv`;
    (async () => {
      setLoading(true);
      const q = supabase.from("content_items").select("*").eq("status", "published")
        .in("type", meta.types).limit(120);
      const { data } = await q;
      let rows = data ?? [];
      if (meta.freeOnly) rows = rows.filter(r => /free|חינם|^0$|₪0/i.test(r.price ?? ""));
      if (meta.window && meta.window !== "all") {
        const [from, to] = getWindow(meta.window);
        rows = rows.filter(r => {
          if (!r.starts_at) return r.type === "guide";
          const t = new Date(r.starts_at).getTime();
          return t >= from.getTime() && t < to.getTime();
        });
        rows.sort((a, b) => new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime());
      } else {
        rows.sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime());
      }
      setItems(rows);
      setLoading(false);
    })();
  }, [slug, meta]);

  if (!meta) {
    return (
      <SiteLayout>
        <div className="container-page py-20">
          <h1 className="text-5xl font-extrabold">Not found</h1>
          <Link to="/" className="text-accent">Back home</Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <header className="container-page py-10">
        <p className="text-xs uppercase tracking-widest font-bold text-accent">Section</p>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mt-2">{meta.title}</h1>
        <p className="mt-2 text-muted-foreground text-lg">{meta.subtitle}</p>
      </header>
      <section className="container-page pb-16">
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">Nothing published in this section yet. Check back soon.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => <EventCard key={i.id} item={i} />)}
          </div>
        )}
      </section>
    </SiteLayout>
  );
};

export default Category;
