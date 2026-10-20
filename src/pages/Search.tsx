import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useEventsFeed, useHotels, usePlaces } from "@/lib/live/hooks";
import { ARTICLES } from "@/lib/articles";
import { NEIGHBOURHOODS, neighbourhoodOf } from "@/lib/live/geo";
import { CRAVINGS } from "@/lib/live/dishes";
import { placeKindLabel } from "@/lib/live/places";
import { placeSlug } from "@/lib/placeMatch";
import { eventSlug, hoodSlug } from "@/lib/areas";
import { fmtDayTime } from "@/lib/live/format";
import { WALKS } from "@/content/walks";

// One search box for the whole site: guides, places, events, hotels, neighbourhoods and walks.
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[֑-ׇ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const hits = (q: string[], ...fields: (string | undefined | null)[]) => {
  const hay = norm(fields.filter(Boolean).join(" "));
  return q.every((w) => hay.includes(w));
};

const Search = () => {
  const { lang } = useI18n();
  const L = (en: string, he: string) => (lang === "he" ? he : en);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q0 = params.get("q") ?? "";
  const [q, setQ] = useState(q0);
  useEffect(() => setQ(q0), [q0]);
  const places = usePlaces();
  const events = useEventsFeed();
  const hotels = useHotels();

  useEffect(() => { document.title = `${q0 ? `${q0} · ` : ""}${L("Search", "חיפוש")} · Discover Tel Aviv`; }, [q0, lang]);

  const res = useMemo(() => {
    const words = norm(q0).split(" ").filter(Boolean);
    if (!words.length) return null;
    const now = Date.now();
    return {
      guides: ARTICLES.filter((a) => hits(words, a.title, a.dek, a.tags.join(" "))).slice(0, 8),
      areas: NEIGHBOURHOODS.filter((h) => hits(words, h.en, h.he)),
      cravings: CRAVINGS.filter((c) => hits(words, c.en, c.he, c.id, c.dishes.join(" "))),
      walks: WALKS.filter((w) => hits(words, w.title, w.titleHe, w.dek)),
      events: (events.data?.events ?? []).filter((e) => e.category !== "community" && Date.parse(e.end ?? e.start) > now && hits(words, e.title, e.venue, e.summary)).slice(0, 12),
      places: (places.data ?? []).filter((p) => p.kind !== "bicycle_rental" && p.name && hits(words, p.name, p.nameEn, p.cuisine?.replace(/_/g, " "), p.street, neighbourhoodOf(p)?.en)).slice(0, 24),
      hotels: (hotels.data ?? []).filter((h) => hits(words, h.name, h.nameEn, h.street)).slice(0, 8),
    };
  }, [q0, places.data, events.data, hotels.data]);

  const submit = (e: FormEvent) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(q.trim())}`); };
  const total = res ? Object.values(res).reduce((n, l) => n + l.length, 0) : 0;
  const H = ({ children }: { children: string }) => <h2 className="mt-10 font-display text-[26px] leading-none border-b-[3px] border-foreground pb-2">{children}</h2>;
  const chip = "h-10 inline-flex items-center rounded-md bg-secondary px-3.5 text-[15px] font-semibold hover:bg-secondary/70";

  return (
    <SiteLayout>
      <section className="bg-[#0057ff] text-white">
        <div className="container-page py-10 sm:py-14">
          <h1 className="font-display text-[40px] sm:text-[64px] leading-[0.95]">{L("Search Tel Aviv", "חיפוש בתל אביב")}</h1>
          <form onSubmit={submit} role="search" className="mt-5 flex max-w-2xl gap-2">
            <label htmlFor="s-q" className="sr-only">{L("Search", "חיפוש")}</label>
            <input id="s-q" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("A place, a show, a neighbourhood, a craving", "מקום, הופעה, שכונה, חשק")} className="min-w-0 flex-1 h-14 rounded-md px-4 text-[17px] text-[#0b1a33] outline-none focus-visible:ring-4 focus-visible:ring-[#ffcb05]" />
            <button type="submit" className="h-14 rounded-md bg-[#ffcb05] px-5 text-[#0b1a33] font-extrabold inline-flex items-center gap-2"><SearchIcon className="h-5 w-5" aria-hidden />{L("Search", "חיפוש")}</button>
          </form>
          {res && <p className="mt-3 text-white/85 tabular">{total} {L("results", "תוצאות")}</p>}
        </div>
      </section>
      <div className="container-page">
        {!res && (
          <div className="mt-8 flex flex-wrap gap-2">
            {["hummus", "Florentin", "jazz", "brunch", "Jaffa", "stand-up", "rooftop", "vegan"].map((s) => <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className={chip}>{s}</Link>)}
          </div>
        )}
        {res && total === 0 && <p className="mt-8 text-[17px]">{L("Nothing found. Try a shorter word, or browse ", "לא נמצא. נסו מילה קצרה יותר, או עיינו ב")}<Link to="/magazine" className="text-sea underline">{L("the magazine", "מגזין")}</Link>.</p>}
        {res && (res.areas.length > 0 || res.cravings.length > 0 || res.walks.length > 0) && (
          <div className="mt-8 flex flex-wrap gap-2">
            {res.areas.map((h) => <Link key={h.en} to={`/area/${hoodSlug(h)}`} className={chip}>{lang === "he" ? h.he : h.en}</Link>)}
            {res.cravings.map((c) => <Link key={c.id} to={`/eat/${c.id}`} className={chip}>{lang === "he" ? c.he : c.en} {L("in Tel Aviv", "בתל אביב")}</Link>)}
            {res.walks.map((w) => <Link key={w.slug} to={`/walks/${w.slug}`} className={chip}>{lang === "he" ? w.titleHe : w.title}</Link>)}
          </div>
        )}
        {res && res.guides.length > 0 && (<><H>{L("Guides", "מדריכים")}</H><ul className="mt-2">{res.guides.map((a) => <li key={a.slug} className="border-b border-border"><Link to={`/magazine/${a.slug}`} className="block py-3 hover:text-accent"><span className="block font-display text-[20px] leading-tight" dir="auto">{a.title}</span><span className="block text-[14px] text-muted-foreground" dir="auto">{a.dek}</span></Link></li>)}</ul></>)}
        {res && res.events.length > 0 && (<><H>{L("Events", "אירועים")}</H><ul className="mt-2">{res.events.map((e) => <li key={e.id} className="border-b border-border"><Link to={`/event/${eventSlug(e)}`} className="flex gap-4 py-3 hover:text-accent"><span className="w-40 shrink-0 text-[14px] text-muted-foreground tabular">{fmtDayTime(e.start, lang)}</span><span className="min-w-0"><span className="block font-semibold" dir="auto">{e.title}</span>{e.venue && <span className="block text-[13px] text-muted-foreground" dir="auto">{e.venue}</span>}</span></Link></li>)}</ul></>)}
        {res && res.places.length > 0 && (<><H>{L("Places", "מקומות")}</H><ul className="mt-2 grid sm:grid-cols-2 gap-x-8">{res.places.map((p) => <li key={p.id} className="border-b border-border"><Link to={`/place/${placeSlug(p)}`} className="block py-3 hover:text-accent"><span className="block font-semibold" dir="auto">{(lang === "en" && p.nameEn) || p.name}</span><span className="block text-[13px] text-muted-foreground">{placeKindLabel(p.kind, lang)}{neighbourhoodOf(p) ? `, ${lang === "he" ? neighbourhoodOf(p)!.he : neighbourhoodOf(p)!.en}` : ""}</span></Link></li>)}</ul></>)}
        {res && res.hotels.length > 0 && (<><H>{L("Hotels", "מלונות")}</H><ul className="mt-2">{res.hotels.map((h) => <li key={h.id} className="border-b border-border"><Link to={`/hotel/${h.id}`} className="block py-3 font-semibold hover:text-accent" dir="auto">{(lang === "en" && h.nameEn) || h.name}</Link></li>)}</ul></>)}
      </div>
    </SiteLayout>
  );
};

export default Search;
