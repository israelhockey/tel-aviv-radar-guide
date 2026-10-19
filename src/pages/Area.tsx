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

const COLORS = ["#d6336c", "#1971c2", "#2f9e44", "#e8590c", "#5f3dc4", "#0c8599", "#f08c00"];
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
                {ph ? <img src={ph.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full aspect-[4/3] object-cover rounded-lg" /> : <span className="block w-full aspect-[4/3] rounded-lg bg-[#ffc233]" />}
                <span className="mt-1.5 block text-[16px] font-semibold leading-snug truncate group-hover:text-[#d6336c]" dir="auto">{(lang === "en" && p.nameEn) || p.name}</span>
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

const Hero = ({ title, dek, color, crumb }: { title: string; dek?: string; color: string; crumb?: { to: string; label: string } }) => (
  <section style={{ background: color }} className="text-white">
    <div className="container-page py-10 sm:py-14">
      {crumb && <Link to={crumb.to} className="text-[14px] text-white/85 underline underline-offset-4">{crumb.label}</Link>}
      <h1 className="mt-1 font-display text-[44px] sm:text-[72px] leading-[0.95]" dir="auto">{title}</h1>
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
      <Hero title={t("area.title")} dek={t("area.dek")} color="#1971c2" />
      <div className="container-page mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {counts.map(({ h, n }) => (
          <Link key={h.en} to={`/area/${hoodSlug(h)}`} style={{ background: colorFor(h.en) }} className="rounded-lg p-4 text-white hover:opacity-90">
            <span className="block font-display text-[24px] leading-tight">{lang === "he" ? h.he : h.en}</span>
            <span className="block text-[13px] text-white/85 tabular">{n} {t("area.places")}</span>
          </Link>
        ))}
      </div>
    </>
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
        />
      )}

      <div className="container-page">
        {data.guide && (
          <Link to={`/magazine/${data.guide.slug}`} className="mt-6 block rounded-lg bg-[#ffc233] text-[#1f1400] p-4 hover:opacity-90">
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
