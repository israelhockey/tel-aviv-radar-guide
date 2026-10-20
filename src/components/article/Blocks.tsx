import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { eventSlug } from "@/lib/areas";
import { useI18n } from "@/lib/i18n";
import { useEventsFeed, useFoodPhotos, useHolidays, usePlaces } from "@/lib/live/hooks";
import { openStateAt } from "@/lib/live/openingHours";
import { dishOf, pickPhoto, CRAVINGS, matchesCraving } from "@/lib/live/dishes";
import { distanceMeters, neighbourhoodOf, TLV_CENTER } from "@/lib/live/geo";
import { inRange } from "@/lib/live/when";
import { fmtDayTime } from "@/lib/live/format";
import { isEveningOut, type DishPhoto, type Place } from "@/lib/live/sources";
import { findPlaces, placeSlug } from "@/lib/placeMatch";
import { placeKindLabel } from "@/lib/live/places";

/** "dish:burger", "city:jaffa" or a plain URL → a photo with its credit. */
export const usePhoto = (spec: string | undefined, seed = ""): DishPhoto | undefined => {
  const photos = useFoodPhotos();
  if (!spec) return undefined;
  if (spec.startsWith("dish:")) return pickPhoto(photos.data?.[spec.slice(5)], seed || spec);
  if (spec.startsWith("city:")) return photos.data?.__city?.[spec.slice(5)];
  return { file: "", src: spec, by: "", license: "", page: "" };
};

export const Credit = ({ p }: { p?: DishPhoto }) =>
  p?.by ? (
    <a href={p.page} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:underline">
      Photo: {p.by}{p.license ? `, ${p.license}` : ""}
    </a>
  ) : null;

const openLine = (p: Place, t: (k: "food.openTill" | "live.open" | "live.closed" | "food.opens" | "live.hoursUnknown") => string) => {
  const s = openStateAt(p.hours);
  return {
    open: s.status === "open",
    text: s.status === "open" ? (s.until ? `${t("food.openTill")} ${s.until}` : t("live.open")) : s.status === "closed" ? (s.opensAt ? `${t("food.opens")} ${s.opensAt}` : t("live.closed")) : t("live.hoursUnknown"),
  };
};

const lateTonight = () => {
  const d = new Date();
  if (d.getHours() >= 5) d.setDate(d.getDate() + 1);
  d.setHours(0, 30, 0, 0);
  return d;
};

/** When a holiday falls next: [[holiday: Chanukah]] */
export const HolidayBlock = ({ name }: { name: string }) => {
  const { lang } = useI18n();
  const en = useHolidays("en");
  const he = useHolidays(lang === "he" ? "he" : "en");
  const i = (en.data ?? []).findIndex((h) => new RegExp(name, "i").test(h.title));
  if (i < 0) return null;
  const h = en.data![i];
  const title = he.data?.[i]?.title ?? h.title;
  const date = new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${h.date.slice(0, 10)}T12:00:00Z`));
  return (
    <aside className="mt-6 flex items-center gap-4 rounded-xl bg-[#0b1a33] text-white px-5 py-4">
      <span className="font-display text-[44px] leading-none tabular">{new Date(`${h.date.slice(0, 10)}T12:00:00Z`).getUTCDate()}</span>
      <span><span className="block text-[17px] font-semibold" dir="auto">{title}</span><span className="block text-[14px] text-white/80">{date}</span></span>
    </aside>
  );
};

/** An editor's pick: our write-up beside the live listing from the map. */
export const PickBlock = ({ name, text, n }: { name: string; text: string; n?: number }) => {
  const { t, lang } = useI18n();
  const places = usePlaces();
  const photos = useFoodPhotos();
  const hits = findPlaces(places.data, name);
  const p = hits[0];
  const photo = p ? pickPhoto(photos.data?.[dishOf(p)], p.id) : undefined;
  const state = p ? openLine(p, t) : null;
  const bg = ["#fff4c2", "#ffd9d4", "#d6e4ff", "#d3f9d8", "#f3d9fa", "#ffe8cc"][((n ?? 1) - 1) % 6];
  return (
    <section className="mt-8 flex flex-col sm:flex-row overflow-hidden rounded-[10px] text-[#0b1a33]" style={{ background: bg }}>
      {photo ? (
        <img src={photo.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full sm:w-[220px] aspect-[16/9] sm:aspect-auto object-cover shrink-0" />
      ) : <span className="hidden sm:block w-[220px] shrink-0 bg-[#ffcb05]" />}
      <div className="flex-1 p-5 sm:border-s-[3px] border-t-[3px] sm:border-t-0 border-dashed border-[#0b1a33]">
        <div className="flex items-start gap-3">
          {n != null && <span className="font-poster text-[44px] leading-none">{String(n).padStart(2, "0")}</span>}
          <div className="min-w-0">
            <h3 className="font-display text-[26px] leading-tight" dir="auto">
              {p ? <Link to={`/place/${placeSlug(p)}`} className="hover:underline underline-offset-4">{name}</Link> : name}
            </h3>
            {p && (
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-semibold">
                <span className={state?.open ? "text-[#2b8a3e]" : "opacity-75"}>{state?.text}</span>
                <span className="opacity-75">{placeKindLabel(p.kind, lang)}</span>
                {p.street && <span className="opacity-75" dir="auto">{p.street}{p.number ? ` ${p.number}` : ""}</span>}
                {hits.length > 1 && <span className="opacity-75">+{hits.length - 1} {t("art.branches")}</span>}
              </p>
            )}
          </div>
        </div>
        <p className="mt-3 text-[17px] leading-relaxed">{text}</p>
        {p && <Link to={`/place/${placeSlug(p)}`} className="mt-3 inline-block text-[14px] font-bold underline underline-offset-4">{t("art.seePlace")}</Link>}
      </div>
    </section>
  );
};

/** A live list from the map: e.g. [[list: craving=burger; limit=8; open=now]] */
export const PlaceListBlock = (q: Record<string, string>) => {
  const { t, lang } = useI18n();
  const places = usePlaces();
  const photos = useFoodPhotos();
  const crave = CRAVINGS.find((c) => c.id === q.craving);
  const list = (places.data ?? [])
    .filter((p) => p.kind !== "bicycle_rental" && p.name)
    .filter((p) => (crave ? matchesCraving(p, crave) : true))
    .filter((p) => (q.kind ? q.kind.split(",").includes(p.kind) : true))
    .filter((p) => (q.kosher ? p.kosher === "yes" || p.kosher === "only" : true))
    .filter((p) => (q.vegan ? p.vegan === "yes" || p.vegan === "only" : true))
    .filter((p) => (q.open === "now" ? openStateAt(p.hours).status === "open" : true))
    .filter((p) => (q.late ? openStateAt(p.hours, lateTonight()).status === "open" : true))
    .filter((p) => (q.outdoor ? p.outdoor : true))
    .filter((p) => (q.area ? q.area.split(",").some((a) => neighbourhoodOf(p)?.en.toLowerCase() === a.trim().toLowerCase()) : true))
    .sort((a, b) => distanceMeters(TLV_CENTER, a) - distanceMeters(TLV_CENTER, b))
    .slice(0, Number(q.limit ?? 8));
  if (!places.data) return <div className="mt-6 h-40 rounded-lg bg-secondary animate-pulse" />;
  return (
    <section className="mt-6 rounded-xl border border-border p-4">
      <p className="text-[13px] font-semibold text-muted-foreground">{q.title ?? t("art.liveList")}</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {list.map((p) => {
          const photo = pickPhoto(photos.data?.[dishOf(p)], p.id);
          const s = openLine(p, t);
          return (
            <li key={p.id}>
              <Link to={`/place/${placeSlug(p)}`} className="group flex gap-3 items-center">
                {photo ? <img src={photo.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-16 w-16 rounded-md object-cover shrink-0" /> : <span className="h-16 w-16 rounded-md bg-[#ffcb05] shrink-0" />}
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold truncate group-hover:text-[#ff5a4e]" dir="auto">{(lang === "en" && p.nameEn) || p.name}</span>
                  <span className={`block text-[12px] ${s.open ? "text-[#2f9e44] font-semibold" : "text-muted-foreground"}`}>{s.text}</span>
                  {p.street && <span className="block text-[12px] text-muted-foreground truncate" dir="auto">{p.street}{p.number ? ` ${p.number}` : ""}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

/** Upcoming events from the calendar: [[events: category=music; range=week; limit=6]] */
export const EventsBlock = (q: Record<string, string>) => {
  const { lang } = useI18n();
  const { data } = useEventsFeed();
  const list = (data?.events ?? [])
    .filter((e) => (q.category ? q.category.split(",").includes(e.category) : isEveningOut(e)))
    .filter((e) => inRange(e.start, e.end, (q.range as "week") ?? "week"))
    .filter((e) => (q.free ? e.free : true))
    .filter((e) => (q.q ? new RegExp(q.q, "i").test(`${e.title} ${e.venue ?? ""}`) : true))
    .slice(0, Number(q.limit ?? 6));
  if (!data) return <div className="mt-6 h-32 rounded-lg bg-secondary animate-pulse" />;
  if (!list.length) return null;
  return (
    <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
      {list.map((e) => (
        <li key={e.id}>
          <Link to={`/event/${eventSlug(e)}`} className="flex gap-3 p-3 hover:bg-secondary/60">
            {e.image ? <img src={e.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-16 w-12 rounded object-cover shrink-0" /> : <span className="h-16 w-12 rounded bg-[#ff5a4e] shrink-0" />}
            <span className="min-w-0">
              <span className="block text-[13px] text-muted-foreground tabular">{fmtDayTime(e.start, lang)}</span>
              <span className="block text-[16px] font-semibold leading-snug" dir="auto">{e.title}</span>
              {e.venue && <span className="block text-[13px] text-muted-foreground truncate" dir="auto">{e.venue}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export const TipBlock = ({ children }: { children: ReactNode }) => (
  <aside className="mt-6 rounded-xl bg-[#ffcb05] text-[#0b1a33] px-5 py-4 text-[16px] leading-relaxed">{children}</aside>
);

export const PhotoBlock = ({ src, caption }: { src: string; caption?: string }) => {
  const p = usePhoto(src);
  if (!p) return null;
  return (
    <figure className="mt-8">
      <img src={p.src} alt={caption ?? ""} loading="lazy" referrerPolicy="no-referrer" className="w-full max-h-[520px] object-cover rounded-xl" />
      <figcaption className="mt-2 flex flex-wrap justify-between gap-2 text-[13px] text-muted-foreground">
        <span>{caption}</span>
        <Credit p={p} />
      </figcaption>
    </figure>
  );
};
