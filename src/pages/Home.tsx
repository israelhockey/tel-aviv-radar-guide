import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { EventCard, SmallRow, BriefRow, TYPE_BADGE } from "@/components/site/EventCard";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import heroImg from "@/assets/hero-tlv.jpg";
import { Moon, CalendarDays, UtensilsCrossed, Newspaper, Gift, TrendingUp, ArrowRight } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["content_items"]["Row"];

const QUICK = [
  { to: "/events", label: "Tonight", icon: Moon, color: "text-cat-music" },
  { to: "/weekend", label: "Weekend", icon: CalendarDays, color: "text-cat-art" },
  { to: "/food", label: "Food", icon: UtensilsCrossed, color: "text-cat-food" },
  { to: "/news", label: "News", icon: Newspaper, color: "text-cat-news" },
  { to: "/free", label: "Free Things", icon: Gift, color: "text-cat-dj" },
];

const Home = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "TLV Radar — What's happening in Tel Aviv today";
    (async () => {
      const { data } = await supabase
        .from("content_items").select("*").eq("status", "published")
        .order("published_at", { ascending: false }).limit(60);
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  // Date helpers (local time)
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);
  // Weekend in Israel = Fri (5) → Sun (0). Find next Fri 00:00 → following Mon 00:00.
  const dow = now.getDay();
  const daysToFri = (5 - dow + 7) % 7; // 0 if today is Fri
  const friStart = new Date(startOfToday); friStart.setDate(friStart.getDate() + daysToFri);
  const monStart = new Date(friStart); monStart.setDate(monStart.getDate() + 3);
  // If we're already in the weekend window, anchor it to the current Fri.
  if (dow === 5 || dow === 6 || dow === 0) {
    const back = dow === 0 ? 2 : dow - 5;
    friStart.setDate(startOfToday.getDate() - back);
    monStart.setTime(friStart.getTime()); monStart.setDate(monStart.getDate() + 3);
  }
  const inRange = (i: Item, from: Date, to: Date) => {
    if (!i.starts_at) return false;
    const t = new Date(i.starts_at).getTime();
    return t >= from.getTime() && t < to.getTime();
  };
  const byStart = (a: Item, b: Item) =>
    new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime();

  const eventish = items.filter(i => i.type === "event" || i.type === "nightlife");
  const tonight = eventish.filter(i => inRange(i, now, endOfToday)).sort(byStart).slice(0, 3);
  const weekend = items
    .filter(i => i.type === "event" || i.type === "guide")
    .filter(i => i.type === "guide" || inRange(i, friStart, monStart))
    .sort(byStart).slice(0, 6);
  const briefs = items.filter(i => ["news","business","food"].includes(i.type)).slice(0, 4);
  const food = items.filter(i => i.type === "food" || i.type === "opening").slice(0, 4);
  const business = items.filter(i => i.type === "business").slice(0, 3);
  const trending = items.slice(0, 5);
  const free = items.filter(i => /free|חינם/i.test(i.price ?? "") || /yoga|market/i.test(i.title)).slice(0, 3);
  const openings = items.filter(i => i.type === "opening" || /opens|new/i.test(i.title)).slice(0, 3);


  return (
    <SiteLayout>
      {/* HERO */}
      <section className="container-page mt-4">
        <div className="relative overflow-hidden rounded-[28px] border border-border">
          <img src={heroImg} alt="Tel Aviv skyline at golden hour" className="absolute inset-0 h-full w-full object-cover" width={1920} height={960} />
          <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent" />
          <div className="relative grid lg:grid-cols-[1.4fr,1fr] gap-6 p-6 sm:p-10 lg:p-14 min-h-[480px]">
            <div className="max-w-2xl">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-foreground">
                What's happening<br />in Tel Aviv today
              </h1>
              <p className="mt-5 text-lg text-foreground/80 max-w-md">
                Events, food, nightlife, local news, openings, and weekend plans — updated daily.
              </p>
              <div className="mt-6 max-w-lg">
                <NewsletterForm cta="Get the Weekend Guide" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {QUICK.map(q => (
                  <Link key={q.to} to={q.to} className="pill bg-white border border-border hover:border-foreground">
                    <q.icon className={`h-4 w-4 ${q.color}`} />
                    {q.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Trending side card */}
            <aside className="lg:self-start lg:justify-self-end w-full max-w-sm">
              <div className="card-soft p-5 bg-white">
                <div className="flex items-center gap-2 font-bold">
                  <TrendingUp className="h-4 w-4 text-cat-news" /> Trending Now in TLV
                </div>
                <ol className="mt-4 space-y-3">
                  {(trending.length ? trending : Array(5).fill(null)).map((it, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                      {it ? (
                        <Link to={`/post/${it.slug}`} className="font-semibold hover:text-accent line-clamp-2">{it.title}</Link>
                      ) : (
                        <span className="text-muted-foreground">Awaiting today's stories…</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {loading && <div className="container-page py-16 text-center text-muted-foreground">Loading today's radar…</div>}

      {!loading && items.length === 0 && (
        <section className="container-page py-12">
          <div className="card-soft p-8">
            <p className="text-xs uppercase tracking-widest text-accent font-bold">Setup</p>
            <h2 className="text-3xl font-extrabold mt-2">Your radar is empty.</h2>
            <p className="mt-2 text-muted-foreground max-w-xl">
              Sign in as admin and head to the Import Center to add RSS feeds, paste an Apify run, or write your first post.
            </p>
            <div className="mt-5 flex gap-3">
              <Link to="/auth" className="pill bg-foreground text-background">Sign in</Link>
              <Link to="/admin" className="pill border border-border">Open admin</Link>
            </div>
          </div>
        </section>
      )}

      {/* MAIN GRID */}
      {!loading && items.length > 0 && (
        <div className="container-page mt-12 grid gap-10 lg:grid-cols-[1fr,320px]">
          <div className="space-y-12">
            {/* Tonight */}
            {tonight.length > 0 && (
              <section>
                <SectionHeader title="Tonight in Tel Aviv" link="/events" />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {tonight.map((i) => <EventCard key={i.id} item={i} />)}
                </div>
              </section>
            )}

            {/* Weekend */}
            {weekend.length > 0 && (
              <section>
                <SectionHeader title="This Weekend" link="/weekend" />
                <div className="grid gap-4 md:grid-cols-3">
                  {(["Friday","Saturday","Sunday"] as const).map((day, idx) => (
                    <div key={day} className="card-soft p-4">
                      <div className="flex items-center justify-between text-[hsl(var(--cat-news))]">
                        <p className="font-extrabold text-lg">{day}</p>
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <div className="mt-4 space-y-4">
                        {weekend.slice(idx * 2, idx * 2 + 2).map(i => <SmallRow key={i.id} item={i} />)}
                        {weekend.slice(idx * 2, idx * 2 + 2).length === 0 && (
                          <p className="text-xs text-muted-foreground">Nothing scheduled.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Latest local briefs */}
            {briefs.length > 0 && (
              <section>
                <SectionHeader title="Latest Local Briefs" link="/news" smallLink="See all news" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {briefs.map(i => <BriefRow key={i.id} item={i} />)}
                </div>
              </section>
            )}

            {/* Food + Business row */}
            <section className="grid gap-10 lg:grid-cols-[2fr,1.4fr]">
              {food.length > 0 && (
                <div>
                  <SectionHeader title="Food & Drink" link="/food" smallLink="See all" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {food.map(i => (
                      <EventCard
                        key={i.id}
                        item={i}
                        badge={badgeFor(i)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {business.length > 0 && (
                <div>
                  <SectionHeader title="Business & Startups" link="/business" smallLink="See all" />
                  <div className="space-y-3">
                    {business.map(i => <BriefRow key={i.id} item={i} />)}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right rail */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <RailCard
              title="Free Things Today"
              icon={<Gift className="h-4 w-4 text-cat-food" />}
              items={free}
              link="/free"
              linkLabel="See more free events"
            />
            <RailCard
              title="New Openings"
              icon={<span className="badge-cat bg-cat-dj">NEW</span>}
              items={openings}
              link="/food"
              linkLabel="See all new openings"
            />
          </aside>
        </div>
      )}
    </SiteLayout>
  );
};

const badgeFor = (i: Item): { label: string; cls: string } => {
  const t = (i.title + " " + (i.tags?.join(" ") ?? "")).toLowerCase();
  if (/cafe|coffee|café/.test(t)) return { label: "NEW CAFÉS", cls: "bg-cat-cafe" };
  if (/bar|cocktail/.test(t)) return { label: "BARS", cls: "bg-cat-bars" };
  if (/restaurant|kitchen/.test(t)) return { label: "RESTAURANTS", cls: "bg-cat-restaurants" };
  if (/pop[- ]?up/.test(t)) return { label: "POP-UPS", cls: "bg-cat-popups" };
  return TYPE_BADGE[i.type] ?? TYPE_BADGE.food;
};

const SectionHeader = ({ title, link, smallLink }: { title: string; link: string; smallLink?: string }) => (
  <div className="flex items-end justify-between mb-5">
    <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">{title}</h2>
    <Link to={link} className="text-sm font-semibold text-cat-news hover:underline inline-flex items-center gap-1">
      {smallLink ?? "See all"} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  </div>
);

const RailCard = ({ title, icon, items, link, linkLabel }: { title: string; icon: React.ReactNode; items: Item[]; link: string; linkLabel: string }) => (
  <div className="card-soft p-5">
    <div className="flex items-center gap-2 font-bold">{icon}{title}</div>
    <div className="mt-4 space-y-4">
      {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
      {items.map(i => <SmallRow key={i.id} item={i} />)}
    </div>
    <Link to={link} className="text-sm font-semibold text-accent inline-flex items-center gap-1 mt-4">
      {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  </div>
);

export default Home;
