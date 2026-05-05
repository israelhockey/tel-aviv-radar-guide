import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ContentCard } from "@/components/site/ContentCard";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import type { Database } from "@/integrations/supabase/types";
import { Link } from "react-router-dom";

type Item = Database["public"]["Tables"]["content_items"]["Row"];

const Home = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "TLV Radar — What's happening in Tel Aviv today";
    (async () => {
      const { data } = await supabase
        .from("content_items")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(40);
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  const featured = items.find((i) => i.is_featured) ?? items[0];
  const rest = items.filter((i) => i.id !== featured?.id);
  const events = rest.filter((i) => i.type === "event").slice(0, 4);
  const food = rest.filter((i) => i.type === "food" || i.type === "opening").slice(0, 4);
  const night = rest.filter((i) => i.type === "nightlife").slice(0, 3);
  const news = rest.filter((i) => i.type === "news" || i.type === "business").slice(0, 5);

  return (
    <SiteLayout>
      {/* ticker */}
      <div className="bg-foreground text-background overflow-hidden">
        <div className="container-page py-2 text-xs uppercase tracking-widest flex gap-8 whitespace-nowrap overflow-hidden">
          <span className="font-bold text-highlight">LIVE</span>
          <span>Daily brief at 07:30 · Weekend guide drops Thursday · Submit your event for Friday roundup</span>
        </div>
      </div>

      {loading ? (
        <div className="container-page py-20 text-center text-muted-foreground">Loading today's radar…</div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Hero */}
          {featured && (
            <section className="container-page pt-8 pb-12 grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ContentCard item={featured} size="lg" />
              </div>
              <aside className="space-y-5 lg:border-l-2 lg:border-foreground lg:pl-8">
                <h2 className="font-display text-2xl font-black">Also today</h2>
                {rest.slice(0, 4).map((i) => (
                  <div key={i.id} className="border-b border-border pb-4 last:border-0">
                    <ContentCard item={i} size="sm" />
                  </div>
                ))}
              </aside>
            </section>
          )}

          <Section title="Events tonight" link="/events" items={events} />
          <Section title="Eat & drink" link="/food" items={food} />
          <FullBleedNewsletter />
          <Section title="Nightlife" link="/nightlife" items={night} />
          <Section title="City news" link="/news" items={news} />
        </>
      )}
    </SiteLayout>
  );
};

const Section = ({ title, link, items }: { title: string; link: string; items: Item[] }) => {
  if (items.length === 0) return null;
  return (
    <section className="container-page py-10 border-t-2 border-foreground">
      <div className="flex items-end justify-between mb-6">
        <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight">{title}</h2>
        <Link to={link} className="text-xs uppercase tracking-widest hover:text-accent">See all →</Link>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => <ContentCard key={i.id} item={i} />)}
      </div>
    </section>
  );
};

const FullBleedNewsletter = () => (
  <section className="bg-highlight text-highlight-foreground border-y-2 border-foreground my-10">
    <div className="container-page py-12 grid gap-6 md:grid-cols-2 items-center">
      <div>
        <p className="kicker">The Morning Brief</p>
        <h2 className="font-display text-4xl sm:text-5xl font-black mt-2 leading-[1]">
          Tel Aviv, in your inbox at 07:30.
        </h2>
        <p className="mt-3 max-w-md">One short email. What's open today, what's on tonight, what changed in the city.</p>
      </div>
      <NewsletterForm />
    </div>
  </section>
);

const EmptyState = () => (
  <div className="container-page py-16">
    <div className="border-2 border-foreground p-8 poster-shadow-accent bg-card">
      <p className="kicker text-accent">Setup</p>
      <h2 className="font-display text-4xl font-black mt-2">Your radar is empty.</h2>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Sign in as an admin and head to the Import Center to add RSS feeds, paste an Apify run, or write your first post.
        Once items are published they appear here automatically.
      </p>
      <div className="mt-5 flex gap-3">
        <Link to="/auth" className="inline-flex h-10 items-center px-4 bg-foreground text-background font-bold uppercase tracking-wider text-xs">
          Sign in
        </Link>
        <Link to="/admin" className="inline-flex h-10 items-center px-4 border-2 border-foreground font-bold uppercase tracking-wider text-xs">
          Open admin
        </Link>
      </div>
    </div>
  </div>
);

export default Home;
