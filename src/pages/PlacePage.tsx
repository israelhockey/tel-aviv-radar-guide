import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bike, Globe, Instagram, MapPin, Navigation, Share2, SquareParking } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useEventsFeed, useFoodPhotos, useParking, usePlaces, useTelofan } from "@/lib/live/hooks";
import { openStateAt, weekTable } from "@/lib/live/openingHours";
import { dishOf, pickPhoto } from "@/lib/live/dishes";
import { distanceMeters, neighbourhoodOf, walkMinutes } from "@/lib/live/geo";
import { placeKindLabel } from "@/lib/live/places";
import { inRange } from "@/lib/live/when";
import { fmtClock } from "@/lib/live/format";
import { isEveningOut } from "@/lib/live/sources";
import { describePlace } from "@/lib/describePlace";
import { findPlaces, placeIdFromSlug, placeSlug } from "@/lib/placeMatch";
import { ARTICLES } from "@/lib/articles";
import { eventSlug, hoodSlug } from "@/lib/areas";
import { MiniMap } from "@/components/radar/MiniMap";
import { Credit } from "@/components/article/Blocks";

const DAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const PlacePage = () => {
  const { slug = "" } = useParams();
  const { t, lang } = useI18n();
  const places = usePlaces();
  const photos = useFoodPhotos();
  const parking = useParking();
  const docks = useTelofan();
  const events = useEventsFeed();
  const [broken, setBroken] = useState(false);

  const p = places.data?.find((x) => x.id === placeIdFromSlug(slug));
  const name = p ? (lang === "en" && p.nameEn) || p.name : "";

  useEffect(() => {
    if (p) document.title = `${name} · Discover Tel Aviv`;
    window.scrollTo(0, 0);
  }, [p, name]);

  const data = useMemo(() => {
    if (!p || !places.data) return null;
    const dish = dishOf(p);
    const near = (x: { lat: number; lon: number }) => distanceMeters(p, x);
    return {
      dish,
      similar: places.data.filter((x) => x.id !== p.id && x.kind !== "bicycle_rental" && x.name && dishOf(x) === dish && near(x) < 900)
        .sort((a, b) => near(a) - near(b)).slice(0, 4),
      parks: (parking.data ?? []).filter((k) => near(k) < 900).sort((a, b) => near(a) - near(b)).slice(0, 3),
      docks: (docks.data ?? []).filter((d) => near(d) < 500).sort((a, b) => near(a) - near(b)).slice(0, 3),
      tonight: (events.data?.events ?? []).filter((e) => e.lat != null && e.lon != null && isEveningOut(e) && inRange(e.start, e.end, "tonight") && near({ lat: e.lat!, lon: e.lon! }) < 700).slice(0, 4),
      guides: ARTICLES.filter((a) => [...a.body.matchAll(/\[\[pick:\s*([^|\]]+)/g)].some((m) => findPlaces(places.data, m[1].trim()).some((x) => x.id === p.id))),
    };
  }, [p, places.data, parking.data, docks.data, events.data]);

  if (!places.data) {
    return <SiteLayout><div className="container-page py-16"><div className="h-80 rounded-xl bg-secondary animate-pulse" /></div></SiteLayout>;
  }
  if (!p || !data) {
    return (
      <SiteLayout>
        <div className="container-page py-20">
          <h1 className="font-display text-[40px]">{t("place.notFound")}</h1>
          <Link to="/food" className="mt-4 inline-block text-sea underline">{t("food.title")}</Link>
        </div>
      </SiteLayout>
    );
  }

  const photo = pickPhoto(photos.data?.[data.dish], p.id);
  const state = openStateAt(p.hours);
  const week = weekTable(p.hours);
  const todayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short" }).format(new Date()));
  const hood = neighbourhoodOf(p);
  const insta = p.insta?.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/^@/, "").replace(/\/$/, "");
  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: name, url }).catch(() => undefined);
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${name} ${url}`)}`, "_blank", "noopener");
  };
  const badge = state.status === "open" ? `${t("food.openTill")} ${state.until ?? ""}`.trim() : state.status === "closed" ? (state.opensAt ? `${t("food.opens")} ${state.opensAt}` : t("live.closed")) : t("live.hoursUnknown");

  return (
    <SiteLayout>
      <section className="relative bg-[#0b1a33]">
        {photo && !broken ? (
          <img src={photo.src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="w-full h-[260px] sm:h-[380px] object-cover" />
        ) : <div className="h-[200px] sm:h-[260px] bg-[#ffcb05]" />}
        <div className="container-page relative -mt-20 sm:-mt-24 pb-2">
          <div className="inline-block max-w-full rounded-lg bg-white dark:bg-card px-5 py-4 sm:px-7 sm:py-5 shadow-[var(--shadow-card)]">
            <p className="text-[14px] text-muted-foreground">{placeKindLabel(p.kind, lang)}{hood && <>, <Link to={`/area/${hoodSlug(hood)}`} className="underline underline-offset-2 hover:text-foreground">{lang === "he" ? hood.he : hood.en}</Link></>}</p>
            <h1 className="font-display text-[36px] sm:text-[56px] leading-[1] text-foreground" dir="auto">{name}</h1>
            <span className={`mt-2 inline-block rounded-md px-2.5 py-1 text-[13px] font-semibold ${state.status === "open" ? "bg-[#2f9e44] text-white" : "bg-secondary"}`}>{badge}</span>
          </div>
        </div>
        {photo && <p className="container-page pb-2 text-end"><Credit p={photo} /></p>}
      </section>

      <div className="container-page mt-6 grid gap-10 lg:grid-cols-[1fr,380px]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-11 rounded-lg bg-foreground text-background px-4 text-[14px] font-semibold"><Navigation className="h-4 w-4" aria-hidden />{t("live.directions")}</a>
            {p.web && <a href={p.web} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-11 rounded-lg border border-border px-4 text-[14px] font-medium hover:bg-secondary"><Globe className="h-4 w-4" aria-hidden />{t("place.website")}</a>}
            {insta && <a href={`https://instagram.com/${insta}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-11 rounded-lg border border-border px-4 text-[14px] font-medium hover:bg-secondary"><Instagram className="h-4 w-4" aria-hidden />Instagram</a>}
            <button onClick={share} className="inline-flex items-center gap-2 h-11 rounded-lg border border-border px-4 text-[14px] font-medium hover:bg-secondary"><Share2 className="h-4 w-4" aria-hidden />{t("art.share")}</button>
          </div>

          <div className="mt-6 space-y-3 text-[18px] leading-relaxed max-w-2xl">
            {describePlace(p, lang).map((s, i) => <p key={i} dir="auto">{s}</p>)}
          </div>

          {data.guides.length > 0 && (
            <div className="mt-6 rounded-lg bg-[#ffcb05] text-[#0b1a33] p-4">
              <p className="text-[14px] font-semibold">{t("place.inGuides")}</p>
              <ul className="mt-1 space-y-1">{data.guides.map((g) => <li key={g.slug}><Link to={`/magazine/${g.slug}`} className="text-[16px] font-medium underline underline-offset-4">{g.title}</Link></li>)}</ul>
            </div>
          )}

          <h2 className="mt-10 font-display text-[26px]">{t("live.hours")}</h2>
          {week ? (
            <table className="mt-3 w-full max-w-md text-[15px]">
              <tbody>
                {week.map((h, i) => (
                  <tr key={i} className={`border-t border-border ${i === todayIdx ? "font-semibold" : ""}`}>
                    <td className="py-2 pe-4">{lang === "he" ? DAY_HE[i] : DAY_EN[i]}</td>
                    <td className="py-2 tabular">{h === "Closed" ? t("live.closed") : h ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="mt-2 text-[15px] text-muted-foreground">{p.hours ?? t("live.hoursUnknown")}</p>}

          {data.similar.length > 0 && (
            <>
              <h2 className="mt-10 font-display text-[26px]">{t("place.similar")}</h2>
              <ul className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {data.similar.map((x) => {
                  const ph = pickPhoto(photos.data?.[dishOf(x)], x.id);
                  const s = openStateAt(x.hours);
                  return (
                    <li key={x.id}>
                      <Link to={`/place/${placeSlug(x)}`} className="group block">
                        {ph ? <img src={ph.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full aspect-[4/3] object-cover rounded-lg" /> : <span className="block w-full aspect-[4/3] rounded-lg bg-[#ffcb05]" />}
                        <span className="mt-1.5 block text-[15px] font-semibold truncate group-hover:text-[#ff5a4e]" dir="auto">{(lang === "en" && x.nameEn) || x.name}</span>
                        <span className={`block text-[12px] ${s.status === "open" ? "text-[#2f9e44] font-semibold" : "text-muted-foreground"}`}>{s.status === "open" ? t("live.open") : s.status === "closed" ? t("live.closed") : ""} {walkMinutes(distanceMeters(p, x))} {t("now.walk")}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <aside className="space-y-6">
          <MiniMap lat={p.lat} lon={p.lon} className="h-[260px]" />
          {p.street && <p className="flex items-start gap-2 text-[15px]" dir="auto"><MapPin className="h-4 w-4 mt-1 shrink-0" aria-hidden />{p.street}{p.number ? ` ${p.number}` : ""}, {lang === "he" ? "תל אביב-יפו" : "Tel Aviv-Yafo"}</p>}

          {(data.parks.length > 0 || data.docks.length > 0) && (
            <section className="rounded-xl border border-border p-4">
              <h2 className="text-[16px] font-semibold">{t("place.gettingThere")}</h2>
              <ul className="mt-2 space-y-2 text-[14px]">
                {data.parks.map((k) => (
                  <li key={k.id} className="flex items-center gap-2">
                    <SquareParking className="h-4 w-4 text-[#0057ff] shrink-0" aria-hidden />
                    <span className="flex-1 truncate" dir="auto">{k.name}</span>
                    <span className={`text-[12px] font-semibold ${k.status === "free" ? "text-[#2f9e44]" : k.status === "full" ? "text-destructive" : "text-muted-foreground"}`}>{t(`park.${k.status}` as "park.free")}</span>
                  </li>
                ))}
                {data.docks.map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <Bike className="h-4 w-4 text-[#2f9e44] shrink-0" aria-hidden />
                    <span className="flex-1 truncate" dir="auto">Tel-O-Fun {d.name}</span>
                    <span className="text-[12px] font-semibold tabular">{d.bikes + d.ebikes}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.tonight.length > 0 && (
            <section className="rounded-xl border border-border p-4">
              <h2 className="text-[16px] font-semibold">{t("place.tonightNear")}</h2>
              <ul className="mt-2 space-y-2">
                {data.tonight.map((e) => (
                  <li key={e.id}><Link to={`/event/${eventSlug(e)}`} className="block text-[14px] hover:text-[#ff5a4e]"><span className="tabular font-semibold">{fmtClock(e.start, lang)}</span> <span dir="auto">{e.title}</span></Link></li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-[12px] text-muted-foreground">{t("place.source")}</p>
        </aside>
      </div>
    </SiteLayout>
  );
};

export default PlacePage;
