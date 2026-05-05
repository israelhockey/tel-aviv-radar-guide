import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { EventCard } from "@/components/site/EventCard";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["content_items"]["Row"];
type CT = Database["public"]["Enums"]["content_type"];

const TITLES: Record<string, { title: string; subtitle: string; types: CT[]; freeOnly?: boolean }> = {
  news: { title: "Local News", subtitle: "What's moving in the city", types: ["news"] },
  events: { title: "Tonight & this week", subtitle: "Concerts, parties, talks, markets", types: ["event"] },
  food: { title: "Food & Drink", subtitle: "Openings, restaurants, bakeries, markets", types: ["food", "opening"] },
  nightlife: { title: "Nightlife", subtitle: "Clubs, bars, late-night", types: ["nightlife"] },
  business: { title: "Business & Startups", subtitle: "Local economy & operators", types: ["business"] },
  weekend: { title: "The Weekend Guide", subtitle: "Friday to Sunday in Tel Aviv", types: ["guide", "event"] },
  free: { title: "Free things to do", subtitle: "All ₪0 — markets, talks, yoga, beach", types: ["event","guide"], freeOnly: true },
};

const Category = () => {
  const slug = useLocation().pathname.replace(/^\//, "");
  const meta = TITLES[slug];
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meta) return;
    document.title = `${meta.title} — TLV Radar`;
    (async () => {
      setLoading(true);
      let q = supabase.from("content_items").select("*").eq("status", "published")
        .in("type", meta.types).order("published_at", { ascending: false }).limit(60);
      const { data } = await q;
      let rows = data ?? [];
      if (meta.freeOnly) rows = rows.filter(r => /free|חינם|^0$|₪0/i.test(r.price ?? ""));
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
