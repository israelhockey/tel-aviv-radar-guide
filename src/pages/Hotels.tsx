import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Globe, Navigation, Star, Waves } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useEventsFeed, useHotels, usePlaces } from "@/lib/live/hooks";
import { BEACHES, distanceMeters, neighbourhoodOf, walkMinutes } from "@/lib/live/geo";
import { openStateAt } from "@/lib/live/openingHours";
import { inRange } from "@/lib/live/when";
import { isEveningOut, type Hotel } from "@/lib/live/sources";
import { MiniMap } from "@/components/radar/MiniMap";
import { placeSlug } from "@/lib/placeMatch";
import { usePhoto, Credit } from "@/components/article/Blocks";

type Kind = "all" | "hotel" | "hostel" | "guest_house" | "apartment";
const KINDS: { id: Kind; key: StringKey }[] = [
  { id: "all", key: "food.all" }, { id: "hotel", key: "hot.hotels" }, { id: "hostel", key: "hot.hostels" },
  { id: "guest_house", key: "hot.guest" }, { id: "apartment", key: "hot.apartments" },
];
const KIND_BG: Record<string, string> = { hotel: "#1971c2", hostel: "#d6336c", guest_house: "#2f9e44", apartment: "#7048e8", motel: "#868e96" };

const beachOf = (h: { lat: number; lon: number }) => {
  let best = BEACHES[0];
  let d = Infinity;
  for (const b of BEACHES) { const x = distanceMeters(h, b); if (x < d) { d = x; best = b; } }
  return { beach: best, m: d };
};

const kindLabel = (k: string, t: (k: StringKey) => string) =>
  t(({ hotel: "hot.hotel", hostel: "hot.hostel", guest_house: "hot.guestOne", apartment: "hot.apartment", motel: "hot.hotel" } as Record<string, StringKey>)[k] ?? "hot.hotel");

export const Hotels = () => {
  const { t, lang } = useI18n();
  const hotels = useHotels();
  const [kind, setKind] = useState<Kind>("all");
  const [beachFirst, setBeachFirst] = useState(true);
  const hero = usePhoto("city:promenade");

  useEffect(() => {
    document.title = lang === "he" ? "מלונות · Discover Tel Aviv" : "Hotels · Discover Tel Aviv";
  }, [lang]);

  const list = useMemo(() => (hotels.data ?? [])
    .filter((h) => kind === "all" || h.kind === kind)
    .map((h) => ({ h, ...beachOf(h), hood: neighbourhoodOf(h) }))
    .sort((a, b) => (beachFirst ? a.m - b.m : (b.h.stars ?? 0) - (a.h.stars ?? 0) || a.m - b.m)), [hotels.data, kind, beachFirst]);

  const chip = (active: boolean) => `h-9 rounded-md px-3.5 text-[14px] border transition-colors ${active ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`;

  return (
    <SiteLayout>
      <section className="relative bg-[#0f1530] text-white">
        {hero && <img src={hero.src} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
        <div className="container-page relative py-14 sm:py-20">
          <div className="inline-block rounded-lg bg-[#1971c2] px-5 py-4 sm:px-7 sm:py-5">
            <h1 className="font-display text-[40px] sm:text-[64px] leading-[0.95]">{t("hot.title")}</h1>
            <p className="mt-1 text-[16px] sm:text-[18px]">{hotels.data ? `${hotels.data.length} ${t("hot.count")}` : "…"}</p>
          </div>
        </div>
      </section>
      <div className="container-page">
        <div className="mt-6 flex flex-wrap gap-2">
          {KINDS.map((k) => <button key={k.id} onClick={() => setKind(k.id)} aria-pressed={kind === k.id} className={chip(kind === k.id)}>{t(k.key)}</button>)}
          <span className="mx-1" />
          <button onClick={() => setBeachFirst(true)} aria-pressed={beachFirst} className={chip(beachFirst)}>{t("hot.byBeach")}</button>
          <button onClick={() => setBeachFirst(false)} aria-pressed={!beachFirst} className={chip(!beachFirst)}>{t("hot.byStars")}</button>
        </div>
        {hotels.isError && <p className="mt-6 text-[14px] text-muted-foreground">{t("common.error")}</p>}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.slice(0, 90).map(({ h, beach, m, hood }) => (
            <li key={h.id}>
              <Link to={`/hotel/${h.id}`} className="group flex gap-4 rounded-xl border border-border p-4 hover:border-foreground/40">
                <span className="h-14 w-14 shrink-0 rounded-lg text-white flex items-center justify-center font-display text-[24px]" style={{ background: KIND_BG[h.kind] ?? "#1971c2" }}>{((lang === "en" && h.nameEn) || h.name).trim().charAt(0)}</span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold leading-snug group-hover:text-[#1971c2]" dir="auto">{(lang === "en" && h.nameEn) || h.name}</span>
                  <span className="block text-[13px] text-muted-foreground">{kindLabel(h.kind, t)}{hood ? `, ${lang === "he" ? hood.he : hood.en}` : ""}</span>
                  <span className="mt-1 flex items-center gap-3 text-[13px]">
                    {h.stars ? <span className="inline-flex items-center gap-0.5 text-[#f08c00]">{Array.from({ length: Math.min(5, Math.round(h.stars)) }, (_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden />)}<span className="sr-only">{h.stars} stars</span></span> : null}
                    <span className="inline-flex items-center gap-1 text-[#0c8599]"><Waves className="h-3.5 w-3.5" aria-hidden />{walkMinutes(m)} {t("now.walk")} {t("hot.toBeach")} {lang === "he" ? beach.he : beach.en}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[12px] text-muted-foreground">{t("hot.source")}</p>
      </div>
    </SiteLayout>
  );
};

export const HotelPage = () => {
  const { id = "" } = useParams();
  const { t, lang } = useI18n();
  const hotels = useHotels();
  const places = usePlaces();
  const events = useEventsFeed();
  const h: Hotel | undefined = hotels.data?.find((x) => x.id === id);
  const name = h ? (lang === "en" && h.nameEn) || h.name : "";
  const hero = usePhoto("city:promenade");

  useEffect(() => {
    if (h) document.title = `${name} · Discover Tel Aviv`;
    window.scrollTo(0, 0);
  }, [h, name]);

  if (!hotels.data) return <SiteLayout><div className="container-page py-16"><div className="h-80 rounded-xl bg-secondary animate-pulse" /></div></SiteLayout>;
  if (!h) return <SiteLayout><div className="container-page py-20"><h1 className="font-display text-[40px]">{t("place.notFound")}</h1><Link to="/hotels" className="mt-4 inline-block text-sea underline">{t("hot.title")}</Link></div></SiteLayout>;

  const { beach, m } = beachOf(h);
  const hood = neighbourhoodOf(h);
  const nearFood = (places.data ?? []).filter((p) => p.kind !== "bicycle_rental" && p.name && distanceMeters(h, p) < 500);
  const openFood = nearFood.filter((p) => openStateAt(p.hours).status === "open").sort((a, b) => distanceMeters(h, a) - distanceMeters(h, b)).slice(0, 6);
  const tonight = (events.data?.events ?? []).filter((e) => e.lat != null && isEveningOut(e) && inRange(e.start, e.end, "week") && distanceMeters(h, { lat: e.lat!, lon: e.lon! }) < 1200).slice(0, 5);

  return (
    <SiteLayout>
      <section className="relative bg-[#0f1530]">
        {hero && <img src={hero.src} alt="" referrerPolicy="no-referrer" className="w-full h-[220px] sm:h-[300px] object-cover opacity-70" />}
        <div className="container-page relative -mt-16 pb-2">
          <div className="inline-block max-w-full rounded-lg bg-white dark:bg-card px-5 py-4 sm:px-7 shadow-[var(--shadow-card)]">
            <p className="text-[14px] text-muted-foreground">{kindLabel(h.kind, t)}{hood ? `, ${lang === "he" ? hood.he : hood.en}` : ""}</p>
            <h1 className="font-display text-[34px] sm:text-[52px] leading-[1] text-foreground" dir="auto">{name}</h1>
            {h.stars ? <p className="mt-1 inline-flex items-center gap-0.5 text-[#f08c00]">{Array.from({ length: Math.min(5, Math.round(h.stars)) }, (_, i) => <Star key={i} className="h-4 w-4 fill-current" aria-hidden />)}</p> : null}
          </div>
        </div>
        {hero && <p className="container-page pb-2 text-end"><Credit p={hero} /></p>}
      </section>
      <div className="container-page mt-6 grid gap-10 lg:grid-cols-[1fr,380px]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {h.web && <a href={h.web} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-11 rounded-lg bg-foreground text-background px-4 text-[14px] font-semibold"><Globe className="h-4 w-4" aria-hidden />{t("hot.site")}</a>}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-11 rounded-lg border border-border px-4 text-[14px] font-medium hover:bg-secondary"><Navigation className="h-4 w-4" aria-hidden />{t("live.directions")}</a>
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-[#0c8599] text-white p-4"><p className="font-display text-[32px] leading-none tabular">{walkMinutes(m)}</p><p className="mt-1 text-[13px]">{t("now.walk")} {t("hot.toBeach")} {lang === "he" ? beach.he : beach.en}</p></div>
            <div className="rounded-lg bg-[#ffc233] text-[#1f1400] p-4"><p className="font-display text-[32px] leading-none tabular">{nearFood.length}</p><p className="mt-1 text-[13px]">{t("hot.foodNear")}</p></div>
            {h.rooms ? <div className="rounded-lg bg-secondary p-4"><p className="font-display text-[32px] leading-none tabular">{h.rooms}</p><p className="mt-1 text-[13px]">{t("hot.rooms")}</p></div> : null}
          </div>
          {openFood.length > 0 && (
            <>
              <h2 className="mt-10 font-display text-[26px]">{t("hot.openNear")}</h2>
              <ul className="mt-3 divide-y divide-border">
                {openFood.map((p) => (
                  <li key={p.id}><Link to={`/place/${placeSlug(p)}`} className="flex justify-between gap-3 py-2.5 hover:text-[#d6336c]"><span dir="auto">{(lang === "en" && p.nameEn) || p.name}</span><span className="text-[13px] text-muted-foreground tabular">{walkMinutes(distanceMeters(h, p))} {t("now.walk")}</span></Link></li>
                ))}
              </ul>
            </>
          )}
          {tonight.length > 0 && (
            <>
              <h2 className="mt-10 font-display text-[26px]">{t("hot.eventsNear")}</h2>
              <ul className="mt-3 divide-y divide-border">
                {tonight.map((e) => <li key={e.id}><a href={e.url} target="_blank" rel="noopener noreferrer" className="block py-2.5 hover:text-[#d6336c]" dir="auto">{e.title}{e.venue ? `, ${e.venue}` : ""}</a></li>)}
              </ul>
            </>
          )}
        </div>
        <aside className="space-y-4">
          <MiniMap lat={h.lat} lon={h.lon} className="h-[280px]" />
          {h.street && <p className="text-[15px]" dir="auto">{h.street}{h.number ? ` ${h.number}` : ""}, {lang === "he" ? "תל אביב-יפו" : "Tel Aviv-Yafo"}</p>}
          <p className="text-[12px] text-muted-foreground">{t("hot.source")}</p>
        </aside>
      </div>
    </SiteLayout>
  );
};
