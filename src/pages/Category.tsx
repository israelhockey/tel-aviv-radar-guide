import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ContentCard } from "@/components/site/ContentCard";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["content_items"]["Row"];
type CT = Database["public"]["Enums"]["content_type"];

const TITLES: Record<string, { title: string; subtitle: string; types: CT[] }> = {
  news: { title: "News", subtitle: "What's moving in the city", types: ["news"] },
  events: { title: "Events", subtitle: "Tonight, this week, this weekend", types: ["event"] },
  food: { title: "Food", subtitle: "Openings, restaurants, bakeries, markets", types: ["food", "opening"] },
  nightlife: { title: "Nightlife", subtitle: "Clubs, bars, late-night", types: ["nightlife"] },
  business: { title: "Business", subtitle: "Local economy & operators", types: ["business"] },
  weekend: { title: "Weekend", subtitle: "Your Thursday-to-Saturday guide", types: ["guide", "event"] },
};

const Category = () => {
  const { slug = "" } = useParams();
  const meta = TITLES[slug];
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meta) return;
    document.title = `${meta.title} — TLV Radar`;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("content_items")
        .select("*")
        .eq("status", "published")
        .in("type", meta.types)
        .order("published_at", { ascending: false })
        .limit(60);
      setItems(data ?? []);
      setLoading(false);
    })();
  }, [slug, meta]);

  if (!meta) {
    return (
      <SiteLayout>
        <div className="container-page py-20">
          <h1 className="font-display text-5xl font-black">Not found</h1>
          <Link to="/" className="text-accent">Back home</Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <header className="container-page py-10 border-b-2 border-foreground">
        <p className="kicker text-accent">Section</p>
        <h1 className="font-display text-6xl sm:text-7xl font-black tracking-tighter mt-2">{meta.title}</h1>
        <p className="mt-2 text-muted-foreground">{meta.subtitle}</p>
      </header>
      <section className="container-page py-10">
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">Nothing published in this section yet. Check back soon.</p>
        ) : (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => <ContentCard key={i.id} item={i} />)}
          </div>
        )}
      </section>
    </SiteLayout>
  );
};

export default Category;
