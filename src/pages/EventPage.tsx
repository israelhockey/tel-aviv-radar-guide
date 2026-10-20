import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarPlus, MapPin, Navigation, Share2, Ticket } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useEventsFeed, useFoodPhotos, usePlaces } from "@/lib/live/hooks";
import { fmtClock } from "@/lib/live/format";
import { nightKey } from "@/lib/live/when";
import { distanceMeters, neighbourhoodOf, walkMinutes } from "@/lib/live/geo";
import { dishOf, pickPhoto } from "@/lib/live/dishes";
import { placeSlug } from "@/lib/placeMatch";
import { eventSlug, hoodSlug } from "@/lib/areas";
import { MiniMap } from "@/components/radar/MiniMap";
import { CAT_BG, PosterCard } from "@/components/radar/PosterCard";
import { gcal } from "./WhatsOn";

// One page per event, so each can be found on Google and shared with a proper preview.
const EventPage = () => {
  const { slug = "" } = useParams();
  const { t, lang } = useI18n();
  const events = useEventsFeed();
  const places = usePlaces();
  const photos = useFoodPhotos();
  const [broken, setBroken] = useState(false);
  const e = events.data?.events.find((x) => eventSlug(x) === slug);

  useEffect(() => {
    if (e) document.title = `${e.title} · Discover Tel Aviv`;
    window.scrollTo(0, 0);
  }, [e]);

  const extra = useMemo(() => {
    if (!e) return null;
    const night = nightKey(e.start);
    const same = (events.data?.events ?? []).filter((x) => x.id !== e.id && nightKey(x.start) === night && x.category !== "community").slice(0, 8);
    const at = e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null;
    const food = at ? (places.data ?? []).filter((p) => p.kind !== "bicycle_rental" && p.name && distanceMeters(at, p) < 500)
      .sort((a, b) => distanceMeters(at, a) - distanceMeters(at, b)).slice(0, 6) : [];
    return { same, at, food };
  }, [e, events.data, places.data]);

  if (!events.data) return <SiteLayout zone="night"><div className="container-page py-16"><div className="h-80 rounded-xl bg-secondary animate-pulse" /></div></SiteLayout>;
  if (!e || !extra) {
    return (
      <SiteLayout zone="night">
        <div className="container-page py-20">
          <h1 className="font-display text-[36px] leading-tight">{t("ev.gone")}</h1>
          <Link to="/events" className="mt-4 inline-block text-sea underline underline-offset-4">{t("ev.all")}</Link>
        </div>
      </SiteLayout>
    );
  }

  const when = new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" }).format(new Date(e.start));
  const hood = extra.at ? neighbourhoodOf(extra.at) : null;
  const cat = CAT_BG[e.category] ?? CAT_BG.other;
  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: e.title, url }).catch(() => undefined);
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${e.title} ${url}`)}`, "_blank", "noopener");
  };
  const btn = "inline-flex items-center gap-2 h-11 rounded-lg border border-border px-4 text-[14px] font-medium hover:bg-secondary";

  return (
    <SiteLayout zone="night">
      <div className="container-page py-8 grid gap-8 lg:grid-cols-[360px,1fr]">
        <div className={`relative aspect-[4/5] rounded-xl overflow-hidden ${e.image && !broken ? "bg-muted" : cat}`}>
          {e.image && !broken
            ? <img src={e.image} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
            : <span className="absolute inset-0 p-6 flex items-end font-display text-[34px] leading-tight text-white" dir="auto">{e.title}</span>}
        </div>
        <div className="min-w-0">
          <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-medium text-white ${cat}`}>{t(`cat.${e.category}` as StringKey)}</span>
          <h1 className="mt-3 font-display text-[36px] sm:text-[56px] leading-[1]" dir="auto">{e.title}</h1>
          <p className="mt-4 text-[20px]"><span className="font-semibold">{when}</span>{!e.allDay && <span className="tabular">, {fmtClock(e.start, lang)}{e.end ? `–${fmtClock(e.end, lang)}` : ""}</span>}</p>
          {e.venue && (
            <p className="mt-1 flex items-start gap-2 text-[17px] text-muted-foreground" dir="auto">
              <MapPin className="h-4 w-4 mt-1.5 shrink-0" aria-hidden />
              <span>{e.venue}{hood && <> · <Link to={`/area/${hoodSlug(hood)}`} className="underline underline-offset-2">{lang === "he" ? hood.he : hood.en}</Link></>}</span>
            </p>
          )}
          <p className="mt-2 text-[17px] font-semibold">
            {e.free ? <span className="text-[#2f9e44]">{t("ev.free")}</span> : e.priceFrom != null ? <span className="tabular">{t("on.from")} ₪{Math.round(e.priceFrom)}</span> : null}
          </p>
          {e.summary && <p className="mt-4 text-[17px] leading-relaxed max-w-2xl" dir="auto">{e.summary}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-11 rounded-full bg-accent text-accent-foreground px-6 font-extrabold text-[15px] font-semibold"><Ticket className="h-4 w-4" aria-hidden />{t("ev.tickets")}</a>
            <a href={gcal(e)} target="_blank" rel="noopener noreferrer" className={btn}><CalendarPlus className="h-4 w-4" aria-hidden />{t("ev.calendar")}</a>
            {extra.at && <a href={`https://www.google.com/maps/dir/?api=1&destination=${extra.at.lat},${extra.at.lon}`} target="_blank" rel="noopener noreferrer" className={btn}><Navigation className="h-4 w-4" aria-hidden />{t("live.directions")}</a>}
            <button onClick={share} className={btn}><Share2 className="h-4 w-4" aria-hidden />{t("art.share")}</button>
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">{t("ev.via")} {e.source}</p>

          {extra.at && <MiniMap lat={extra.at.lat} lon={extra.at.lon} className="mt-8 h-[240px] max-w-2xl" />}

          {extra.food.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-[26px]">{t("ev.nearby")}</h2>
              <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
                {extra.food.map((p) => {
                  const ph = pickPhoto(photos.data?.[dishOf(p)], p.id);
                  return (
                    <li key={p.id}>
                      <Link to={`/place/${placeSlug(p)}`} className="group block">
                        {ph ? <img src={ph.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full aspect-[4/3] object-cover rounded-lg" /> : <span className="block w-full aspect-[4/3] rounded-lg bg-secondary" />}
                        <span className="mt-1.5 block text-[15px] font-semibold truncate group-hover:text-accent" dir="auto">{(lang === "en" && p.nameEn) || p.name}</span>
                        <span className="block text-[12px] text-muted-foreground">{walkMinutes(distanceMeters(extra.at!, p))} {t("now.walk")}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      {extra.same.length > 0 && (
        <section className="container-page mt-4">
          <h2 className="font-display text-[28px]">{t("ev.more")}</h2>
          <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2">
            {extra.same.map((x) => <PosterCard key={x.id} e={x} className="shrink-0 w-[46%] sm:w-[220px]" />)}
          </div>
          <Link to="/events" className="mt-4 inline-block text-sea underline underline-offset-4">{t("ev.all")}</Link>
        </section>
      )}
    </SiteLayout>
  );
};

export default EventPage;
