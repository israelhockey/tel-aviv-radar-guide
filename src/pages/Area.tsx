import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useEventsFeed, useFoodPhotos, usePlaces } from "@/lib/live/hooks";
import { NEIGHBOURHOODS, neighbourhoodOf } from "@/lib/live/geo";
import { openStateAt } from "@/lib/live/openingHours";
import { CRAVINGS, CRAVING_PHOTO, dishOf, pickPhoto } from "@/lib/live/dishes";
import { placeKindLabel } from "@/lib/live/places";
import { isEveningOut, type Place } from "@/lib/live/sources";
import { placeSlug } from "@/lib/placeMatch";
import { ARTICLES } from "@/lib/articles";
import {
  AREA_KINDS, MIN_PER_PAGE, areaKindById, cravingBySlug, eventsNear, hoodBySlug, hoodSlug, placesForCraving, placesInHood, placesOfKind,
} from "@/lib/areas";
import { PosterCard } from "@/components/radar/PosterCard";
import { useQuery } from "@tanstack/react-query";
import { HOODS } from "@/content/hoods";
import { fetchActivity } from "@/lib/live/build";
import { summarize } from "@/lib/live/summary";
import { IMPACT_STYLE } from "@/lib/live/buildInsight";
import { checkUrl } from "@/components/build/AddressSearch";
import { articlesFor } from "@/lib/articles";
import { fetchData } from "@/lib/live/sources";
import { streetName, streetPath, type Street } from "@/lib/streets";

const COLORS = ["#ff5a4e", "#0057ff", "#2f9e44", "#e8590c", "#5f3dc4", "#0c8599", "#f08c00"];
const colorFor = (s: string) => COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

const PlaceGrid = ({ list, limit = 60 }: { list: Place[]; limit?: number }) => {
  const { t, lang } = useI18n();
  const photos = useFoodPhotos();
  const [n, setN] = useState(limit);
  return (
    <>
      <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
        {list.slice(0, n).map((p) => {
          const ph = pickPhoto(photos.data?.[dishOf(p)], p.id);
          const s = openStateAt(p.hours);
          const hood = neighbourhoodOf(p);
          return (
            <li key={p.id}>
              <Link to={`/place/${placeSlug(p)}`} className="group block">
                {ph ? <img src={ph.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full aspect-[4/3] object-cover rounded-lg" /> : <span className="block w-full aspect-[4/3] rounded-lg bg-[#ffcb05]" />}
                <span className="mt-1.5 block text-[16px] font-semibold leading-snug truncate group-hover:text-[#ff5a4e]" dir="auto">{(lang === "en" && p.nameEn) || p.name}</span>
                <span className="block text-[12px] text-muted-foreground truncate">{placeKindLabel(p.kind, lang)}{hood ? `, ${lang === "he" ? hood.he : hood.en}` : ""}</span>
                {s.status === "open" && <span className="block text-[12px] font-semibold text-[#2f9e44]">{t("food.openTill")} {s.until ?? ""}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      {list.length > n && <button onClick={() => setN(n + 60)} className="mt-6 h-11 rounded-lg border border-border px-5 text-[14px] font-medium hover:bg-secondary">{t("area.seeAll")} ({list.length})</button>}
    </>
  );
};

const Hero = ({ title, dek, color, crumb, photo, kicker }: { title: string; dek?: string; color: string; crumb?: { to: string; label: string }; photo?: string; kicker?: string }) => (
  <section style={{ background: color }} className="relative text-white">
    {photo && <><img src={photo} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" /></>}
    <div className={`relative container-page ${photo ? "pt-24 pb-10 sm:pt-40 sm:pb-14" : "py-10 sm:py-14"}`}>
      {crumb && <Link to={crumb.to} className="text-[14px] text-white/85 underline underline-offset-4">{crumb.label}</Link>}
      <h1 className="mt-1 font-display text-[44px] sm:text-[72px] leading-[0.95]" dir="auto">{title}</h1>
      {kicker && <p className="mt-2 text-[20px] sm:text-[24px] font-display leading-snug max-w-2xl">{kicker}</p>}
      {dek && <p className="mt-3 text-[17px] max-w-xl text-white/90">{dek}</p>}
    </div>
  </section>
);

// "/area": every neighbourhood.
const AreaIndex = ({ places }: { places: Place[] }) => {
  const { t, lang } = useI18n();
  const counts = useMemo(() => NEIGHBOURHOODS.map((h) => ({ h, n: placesInHood(places, h).length })).filter((x) => x.n > 0), [places]);
  return (
    <>
      <Hero title={t("area.title")} dek={t("area.dek")} color="#0057ff" />
      <div className="container-page mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {counts.map(({ h, n }) => (
          <Link key={h.en} to={`/area/${hoodSlug(h)}`} style={{ background: colorFor(h.en) }} className="rounded-lg p-4 text-white hover:opacity-90 flex flex-col">
            <span className="block font-display text-[24px] leading-tight">{lang === "he" ? h.he : h.en}</span>
            {HOODS[h.en] && <span className="mt-1 block text-[14px] leading-snug text-white/90">{lang === "he" ? HOODS[h.en].tagline.he : HOODS[h.en].tagline.en}</span>}
            <span className="mt-auto pt-2 block text-[13px] text-white/80 tabular">{n} {t("area.places")}</span>
          </Link>
        ))}
      </div>
    </>
  );
};

/** What it's like to live here, in a few lines. */
const HoodProfileBlock = ({ hood }: { hood: (typeof NEIGHBOURHOODS)[number] }) => {
  const { lang } = useI18n();
  const p = HOODS[hood.en];
  if (!p) return null;
  const T = (x: { en: string; he: string }) => (lang === "he" ? x.he : x.en);
  const L = (en: string, he: string) => (lang === "he" ? he : en);
  return (
    <section className="mt-8">
      <p className="text-[19px] sm:text-[21px] leading-relaxed max-w-[820px]">{T(p.vibe)}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { h: L("Good for", "מתאים ל"), b: p.goodFor, c: "#d3f9d8" },
          { h: L("Worth knowing", "כדאי לדעת"), b: p.watch, c: "#fff4c2" },
          { h: L("Getting around", "התניידות"), b: p.around, c: "#d6e4ff" },
        ].map((x) => (
          <div key={x.h} className="rounded-[10px] p-4 text-[#0b1a33]" style={{ background: x.c }}>
            <p className="text-[13px] font-extrabold uppercase tracking-wider">{x.h}</p>
            <p className="mt-1 text-[15px] leading-relaxed">{T(x.b)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[14px]">
        <span className="font-semibold text-muted-foreground">{L("Landmarks:", "נקודות ציון:")}</span>
        {p.landmarks.map((l) => <span key={l.en} className="rounded-md bg-secondary px-2.5 py-1 font-semibold">{T(l)}</span>)}
      </div>
    </section>
  );
};

/** The neighbourhood's main streets, each linking to its own construction page. */
const HoodStreets = ({ hood }: { hood: (typeof NEIGHBOURHOODS)[number] }) => {
  const { lang } = useI18n();
  const q = useQuery({ queryKey: ["streets"], staleTime: Infinity, queryFn: async () => ((await (await fetchData("streets.json")).json()).streets ?? []) as Street[] });
  const list = useMemo(() => {
    const seen = new Set<string>();
    return (q.data ?? []).filter((s) => {
      const n = streetName(s);
      if (!n || s.n < 15 || seen.has(n) || neighbourhoodOf(s)?.en !== hood.en) return false;
      seen.add(n);
      return true;
    }).slice(0, 14);
  }, [q.data, hood.en]);
  if (!list.length) return null;
  return (
    <div className="mt-5">
      <p className="text-[13px] font-extrabold uppercase tracking-wider text-white/80">{lang === "he" ? "בניה לפי רחוב" : "Construction by street"}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {list.map((s) => <Link key={s.he} to={streetPath(s)} className="h-8 inline-flex items-center rounded-md bg-white/12 px-3 text-[14px] font-semibold hover:bg-white/25" dir="auto">{lang === "he" ? s.he : streetName(s)}</Link>)}
      </div>
    </div>
  );
};

/** Construction and noise around the neighbourhood centre, from the city's live data. */
const HoodBuild = ({ hood }: { hood: (typeof NEIGHBOURHOODS)[number] }) => {
  const { lang } = useI18n();
  const L = (en: string, he: string) => (lang === "he" ? he : en);
  const name = lang === "he" ? hood.he : hood.en;
  const q = useQuery({ queryKey: ["activity", hood.lat, hood.lon, 500], queryFn: () => fetchActivity(hood.lat, hood.lon, 500), staleTime: 10 * 60_000 });
  const sum = useMemo(() => (q.data ? summarize(q.data) : null), [q.data]);
  const st = IMPACT_STYLE[sum?.level ?? "none"];
  return (
    <section className="mt-10 rounded-[12px] bg-[#0057ff] text-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold uppercase tracking-wider text-[#ffcb05]">{L("Living here: construction and noise", "לגור כאן: בניה ורעש")}</p>
          <h2 className="mt-1 font-display text-[28px] sm:text-[36px] leading-tight">{L(`What's being built in ${name}`, `מה בונים ב${name}`)}</h2>
          <p className="mt-1 text-white/85 text-[15px]">{L("Within 500 m of the neighbourhood centre, from the city's records, updated nightly.", "ברדיוס 500 מ' ממרכז השכונה, לפי רישומי העירייה, מתעדכן מדי לילה.")}</p>
        </div>
        <div className="rounded-[10px] px-5 py-3 text-center" style={{ background: st.bg, color: st.fg }}>
          <p className="font-poster text-[44px] leading-none tabular">{sum ? sum.score.toFixed(1) : "…"}</p>
          <p className="text-[11px] font-extrabold uppercase">{L("noise score", "ציון רעש")}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { n: sum?.review, en: "Permit requests under review", he: "בקשות היתר בבדיקה" },
          { n: sum?.building, en: "Buildings going up", he: "בניינים בבניה" },
          { n: sum?.counts.night, en: "Night works", he: "עבודות לילה" },
          { n: sum?.counts.rail, en: "Light rail works", he: "עבודות רכבת קלה" },
          { n: sum?.bars, en: "New bars and restaurants", he: "ברים ומסעדות חדשים" },
        ].map((x) => (
          <div key={x.en} className="rounded-[8px] bg-white/12 p-3">
            <p className="font-poster text-[30px] leading-none tabular">{x.n ?? "…"}</p>
            <p className="mt-1 text-[13px] leading-snug text-white/90">{lang === "he" ? x.he : x.en}</p>
          </div>
        ))}
      </div>
      <HoodStreets hood={hood} />
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to={checkUrl(hood.lat, hood.lon, name, 500)} className="h-11 inline-flex items-center rounded-md bg-[#ffcb05] px-5 font-extrabold text-[#0b1a33]">{L("See it on the map", "לצפייה במפה")}</Link>
        <Link to="/check" className="h-11 inline-flex items-center rounded-md bg-white/15 px-5 font-bold hover:bg-white/25">{L("Check your exact address", "בדיקת הכתובת המדויקת שלך")}</Link>
        <Link to="/construction-noise-rules" className="h-11 inline-flex items-center rounded-md bg-white/15 px-5 font-bold hover:bg-white/25">{L("Noise rules", "כללי רעש")}</Link>
      </div>
    </section>
  );
};

const AreaPage = () => {
  const { hood: hs, kind: ks, craving: cs } = useParams();
  const { t, lang } = useI18n();
  const places = usePlaces();
  const events = useEventsFeed();
  const hood = hs ? hoodBySlug(hs) : undefined;
  const kind = ks ? areaKindById(ks) : undefined;
  const craving = cs ? cravingBySlug(cs) : undefined;
  const photos = useFoodPhotos();

  const hoodName = hood ? (lang === "he" ? hood.he : hood.en) : "";
  const title = craving
    ? `${lang === "he" ? craving.he : craving.en} ${t("eat.inTlv")}`
    : hood && kind ? `${lang === "he" ? kind.he : kind.en} ${t("area.in")}${lang === "he" ? "" : " "}${hoodName}`
    : hood ? hoodName : t("area.title");

  useEffect(() => {
    document.title = `${title} · Discover Tel Aviv`;
    window.scrollTo(0, 0);
  }, [title]);

  const data = useMemo(() => {
    const all = places.data ?? [];
    if (craving) {
      const list = placesForCraving(all, craving);
      const byHood = NEIGHBOURHOODS.map((h) => ({ h, n: list.filter((p) => neighbourhoodOf(p)?.en === h.en).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
      const guide = ARTICLES.find((a) => a.slug.includes(craving.id) || a.tags.some((x) => x.toLowerCase() === craving.en.toLowerCase()));
      return { list, byHood, guide, kinds: [], ev: [] };
    }
    if (hood) {
      const inHood = placesInHood(all, hood);
      const kinds = AREA_KINDS.map((k) => ({ k, list: placesOfKind(inHood, k) })).filter((x) => x.list.length >= MIN_PER_PAGE);
      const list = kind ? placesOfKind(inHood, kind) : inHood;
      const guide = ARTICLES.find((a) => a.category === "neighbourhoods" && a.title.includes(hood.en));
      const ev = eventsNear(events.data?.events ?? [], hood).filter((e) => isEveningOut(e) && Date.parse(e.end ?? e.start) > Date.now()).slice(0, 10);
      return { list, kinds, guide, ev, byHood: [] };
    }
    return null;
  }, [places.data, events.data, hood, kind, craving]);

  if (!places.data) return <SiteLayout><div className="container-page py-16"><div className="h-80 rounded-xl bg-secondary animate-pulse" /></div></SiteLayout>;
  if (!hs && !cs) return <SiteLayout><AreaIndex places={places.data} /></SiteLayout>;
  if ((!hood && !craving) || (ks && !kind) || !data) {
    return <SiteLayout><div className="container-page py-20"><h1 className="font-display text-[36px]">{t("place.notFound")}</h1><Link to="/area" className="mt-4 inline-block text-sea underline">{t("area.title")}</Link></div></SiteLayout>;
  }

  const openNow = data.list.filter((p) => openStateAt(p.hours).status === "open").length;
  const cover = craving ? pickPhoto(photos.data?.[CRAVING_PHOTO[craving.id]], craving.id) : undefined;
  return (
    <SiteLayout>
      {cover ? (
        <section className="relative text-white">
          <img src={cover.src} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative container-page py-14 sm:py-20">
            <Link to="/food" className="text-[14px] text-white/85 underline underline-offset-4">{t("food.title")}</Link>
            <h1 className="mt-1 font-display text-[44px] sm:text-[80px] leading-[0.95]">{title}</h1>
            <p className="mt-3 text-[17px] text-white/90 tabular">{data.list.length} {t("area.places")} · {openNow} {t("area.openNow").toLowerCase()}</p>
          </div>
        </section>
      ) : (
        <Hero
          title={title}
          color={colorFor(hood?.en ?? title)}
          dek={`${data.list.length} ${t("area.places")} · ${openNow} ${t("area.openNow").toLowerCase()}`}
          crumb={kind && hood ? { to: `/area/${hoodSlug(hood)}`, label: hoodName } : { to: "/area", label: t("area.title") }}
          photo={hood && !kind && HOODS[hood.en]?.photo ? photos.data?.__city?.[HOODS[hood.en].photo!]?.src : undefined}
          kicker={hood && !kind && HOODS[hood.en] ? (lang === "he" ? HOODS[hood.en].tagline.he : HOODS[hood.en].tagline.en) : undefined}
        />
      )}

      <div className="container-page">
        {hood && !kind && <HoodProfileBlock hood={hood} />}
        {hood && !kind && <HoodBuild hood={hood} />}
        {data.guide && (
          <Link to={`/magazine/${data.guide.slug}`} className="mt-6 block rounded-lg bg-[#ffcb05] text-[#0b1a33] p-4 hover:opacity-90">
            <span className="block text-[13px] font-semibold">{craving ? t("eat.ourPicks") : t("area.guide")}</span>
            <span className="block text-[20px] font-display leading-tight">{data.guide.title}</span>
          </Link>
        )}

        {hood && !kind && data.kinds.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {data.kinds.map(({ k, list }) => (
              <Link key={k.id} to={`/area/${hoodSlug(hood)}/${k.id}`} className="h-10 inline-flex items-center rounded-md border border-border px-3.5 text-[14px] hover:bg-secondary">
                {lang === "he" ? k.he : k.en} <span className="ms-1.5 text-muted-foreground tabular">{list.length}</span>
              </Link>
            ))}
          </div>
        )}

        {craving && data.byHood.length > 0 && (
          <div className="mt-6">
            <p className="text-[13px] font-semibold text-muted-foreground">{t("eat.byArea")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.byHood.slice(0, 12).map(({ h, n }) => (
                <Link key={h.en} to={`/area/${hoodSlug(h)}`} className="h-9 inline-flex items-center rounded-md border border-border px-3 text-[14px] hover:bg-secondary">
                  {lang === "he" ? h.he : h.en} <span className="ms-1.5 text-muted-foreground tabular">{n}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {hood && !kind && data.kinds.length > 0 && <h2 className="mt-14 font-display text-[34px] sm:text-[44px] leading-none border-b-[3px] border-foreground pb-2">{lang === "he" ? `לאכול ולשתות ב${hoodName}` : `Eat and drink in ${hoodName}`}</h2>}
        {hood && !kind && data.ev.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-[28px] leading-none">{t("area.onNearby")}</h2>
            <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2">
              {data.ev.map((e) => <PosterCard key={e.id} e={e} showDay className="shrink-0 w-[46%] sm:w-[200px]" />)}
            </div>
          </section>
        )}

        {hood && !kind ? (
          data.kinds.map(({ k, list }) => (
            <section key={k.id} className="mt-10">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-[28px] leading-none">{lang === "he" ? k.he : k.en}</h2>
                <Link to={`/area/${hoodSlug(hood)}/${k.id}`} className="text-[14px] text-sea underline underline-offset-4">{t("area.seeAll")} ({list.length})</Link>
              </div>
              <PlaceGrid list={list} limit={8} />
            </section>
          ))
        ) : (
          <PlaceGrid list={data.list} />
        )}

        {hood && !kind && (
          <section className="mt-14">
            <h2 className="font-display text-[28px] leading-none">{lang === "he" ? "לגור בתל אביב" : "Living in Tel Aviv"}</h2>
            <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {articlesFor(lang).filter((a) => a.category === "newcomers").slice(0, 6).map((a) => (
                <Link key={a.slug} to={`/magazine/${a.slug}`} className="block border-b border-border py-2 hover:text-[#ff5a4e]">
                  <span className="block font-bold leading-snug">{a.title}</span>
                  <span className="block text-[14px] text-muted-foreground line-clamp-1">{a.dek}</span>
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ["/getting-around", lang === "he" ? "התניידות בעיר" : "Getting around"],
                ["/live?layers=parking", lang === "he" ? "חניה" : "Parking"],
                ["/guide", lang === "he" ? "מקלטים ומידע חירום" : "Shelters and emergencies"],
                ["/compare", lang === "he" ? "השוואת דירות" : "Compare apartments"],
                ["/shabbat", lang === "he" ? "שבת וחגים" : "Shabbat and holidays"],
              ].map(([to, label]) => <Link key={to} to={to} className="h-10 inline-flex items-center rounded-md bg-secondary px-4 text-[14px] font-semibold">{label}</Link>)}
            </div>
          </section>
        )}

        <section className="mt-14">
          <h2 className="font-display text-[24px]">{craving ? t("food.title") : t("area.other")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {craving
              ? CRAVINGS.filter((c) => c.id !== craving.id).map((c) => <Link key={c.id} to={`/eat/${c.id}`} className="h-9 inline-flex items-center rounded-md bg-secondary px-3 text-[14px] hover:bg-secondary/70">{lang === "he" ? c.he : c.en}</Link>)
              : NEIGHBOURHOODS.filter((h) => h.en !== hood?.en).map((h) => <Link key={h.en} to={`/area/${hoodSlug(h)}`} className="h-9 inline-flex items-center rounded-md bg-secondary px-3 text-[14px] hover:bg-secondary/70">{lang === "he" ? h.he : h.en}</Link>)}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
};

export default AreaPage;
