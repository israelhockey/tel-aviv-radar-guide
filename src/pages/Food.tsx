import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LocateFixed, Search } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { distanceMeters, NEIGHBOURHOODS, TLV_CENTER, walkMinutes } from "@/lib/live/geo";
import { hoodSlug } from "@/lib/areas";
import { useFoodPhotos, usePlaces } from "@/lib/live/hooks";
import { openStateAt, type OpenState } from "@/lib/live/openingHours";
import { placeKindLabel } from "@/lib/live/places";
import { CRAVINGS, CRAVING_PHOTO, dishOf, matchesCraving, pickPhoto } from "@/lib/live/dishes";
import type { DishPhoto, Place } from "@/lib/live/sources";
import { placeSlug } from "@/lib/placeMatch";

type Toggle = "late" | "happy" | "kosher" | "vegan" | "outdoor";
const TOGGLES: { id: Toggle; key: StringKey }[] = [
  { id: "happy", key: "food.happy" },
  { id: "late", key: "food.late" },
  { id: "outdoor", key: "food.outdoor" },
  { id: "kosher", key: "live.kosher" },
  { id: "vegan", key: "food.vegan" },
];

// Open at half past midnight tonight?
const lateNight = (p: Place) => {
  const d = new Date();
  if (d.getHours() >= 5) d.setDate(d.getDate() + 1);
  d.setHours(0, 30, 0, 0);
  return openStateAt(p.hours, d).status === "open";
};

const Photo = ({ photo, className = "" }: { photo?: DishPhoto; className?: string }) => {
  const [broken, setBroken] = useState(false);
  return photo && !broken ? (
    <img src={photo.src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={`object-cover ${className}`} />
  ) : (
    <span className={`block bg-[#ffc233] ${className}`} />
  );
};

const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const Food = () => {
  const { t, lang } = useI18n();
  const places = usePlaces();
  const photos = useFoodPhotos();
  const [craving, setCraving] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Set<Toggle>>(new Set());
  const [openOnly, setOpenOnly] = useState(true);
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState<{ lat: number; lon: number; exact: boolean }>({ ...TLV_CENTER, exact: false });
  const [tick, setTick] = useState(0);
  const [limit, setLimit] = useState(24);

  useEffect(() => {
    document.title = lang === "he" ? "אוכל ושתייה · Discover Tel Aviv" : "Food & drink · Discover Tel Aviv";
  }, [lang]);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setLimit(24), [craving, toggles, openOnly, q]);

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude, exact: true }),
      () => undefined,
      { timeout: 8000, maximumAge: 120000 },
    );

  const rows = useMemo(() => {
    const now = new Date();
    return (places.data ?? [])
      .filter((p) => p.kind !== "bicycle_rental" && p.name)
      .map((p) => ({ p, dish: dishOf(p), state: openStateAt(p.hours, now), happy: p.happy ? openStateAt(p.happy, now) : null, d: distanceMeters(origin, p) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.data, origin, tick]);

  const openRows = rows.filter((r) => r.state.status === "open");
  const happyNow = rows.filter((r) => r.happy?.status === "open").sort((a, b) => a.d - b.d);
  const needle = q.trim().toLowerCase();
  const crave = CRAVINGS.find((c) => c.id === craving);

  const shown = rows
    .filter(({ p, state, happy }) => {
      if (needle && !`${p.name} ${p.nameEn ?? ""} ${p.cuisine ?? ""} ${p.street ?? ""}`.toLowerCase().includes(needle)) return false;
      if (crave && !matchesCraving(p, crave)) return false;
      if (openOnly && !toggles.has("happy") && state.status !== "open") return false;
      if (toggles.has("late") && !lateNight(p)) return false;
      if (toggles.has("happy") && !(p.happy && (!openOnly || happy?.status === "open"))) return false;
      if (toggles.has("kosher") && !(p.kosher === "yes" || p.kosher === "only")) return false;
      if (toggles.has("vegan") && !(p.vegan === "yes" || p.vegan === "only")) return false;
      if (toggles.has("outdoor") && !p.outdoor) return false;
      return true;
    })
    .sort((a, b) => a.d - b.d);

  const stateLine = (s: OpenState) =>
    s.status === "open" ? (s.until ? `${t("food.openTill")} ${s.until}` : t("live.open"))
      : s.status === "closed" ? (s.opensAt ? `${t("food.opens")} ${s.opensAt}` : t("live.closed"))
        : t("live.hoursUnknown");

  const name = (p: Place) => (lang === "en" && p.nameEn) || p.name;
  const toggle = (id: Toggle) => setToggles((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const heroPhotos = ["shakshuka", "hummus", "coffee", "cocktail", "pizza", "sushi"].map((k, i) => pickPhoto(photos.data?.[k], `hero${i}`));

  return (
    <SiteLayout>
      {/* A table full of food: six dishes in a tight grid, the headline on a citrus block */}
      <section className="relative bg-[#0f1530]">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-[3px] h-[300px] sm:h-[380px]">
          {heroPhotos.map((ph, i) => <Photo key={i} photo={ph} className={`h-full w-full ${i > 2 ? "hidden sm:block" : ""}`} />)}
        </div>
        <div className="container-page relative -mt-24 sm:-mt-28 pb-2">
          <div className="inline-block max-w-full rounded-lg bg-[#ffc233] text-[#1f1400] px-5 py-4 sm:px-7 sm:py-5">
            <h1 className="font-display text-[38px] sm:text-[60px] leading-[0.95]">{t("food.hungry")}</h1>
            <p className="mt-1 text-[16px] sm:text-[18px]">
              {places.data ? <><span className="font-semibold tabular">{openRows.length}</span> {t("food.openNow")}</> : "…"}
              {happyNow.length > 0 && <>, <span className="font-semibold tabular">{happyNow.length}</span> {t("food.happyNow")}</>}
            </p>
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <label className="flex-1 min-w-[220px] max-w-lg flex items-center gap-2 h-11 rounded-lg border border-border bg-card px-3.5 focus-within:ring-2 focus-within:ring-sea">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("food.search")} className="flex-1 bg-transparent outline-none text-[15px]" dir="auto" />
          </label>
          <button onClick={locate} className={`inline-flex items-center gap-2 h-11 rounded-lg px-4 text-[14px] font-medium ${origin.exact ? "bg-foreground text-background" : "border border-border hover:bg-secondary"}`}>
            <LocateFixed className="h-4 w-4" aria-hidden />
            {origin.exact ? t("food.nearYou") : t("now.useLocation")}
          </button>
        </div>

        {/* Cravings: pick with your stomach */}
        <section className="mt-7" aria-labelledby="crave-h">
          <h2 id="crave-h" className="font-display text-[28px] leading-none">{t("food.craving")}</h2>
          <div className="mt-3 -mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 flex gap-3 overflow-x-auto pb-2 snap-x [scrollbar-width:none]">
            {CRAVINGS.map((c) => {
              const active = craving === c.id;
              const n = openRows.filter((r) => matchesCraving(r.p, c)).length;
              return (
                <button key={c.id} onClick={() => setCraving(active ? null : c.id)} aria-pressed={active}
                  className={`group snap-start shrink-0 w-[132px] sm:w-[156px] text-start focus-visible:outline-none`}>
                  <span className={`relative block aspect-square rounded-lg overflow-hidden ${active ? "outline outline-[3px] outline-offset-2 outline-[#d6336c]" : "group-hover:outline group-hover:outline-2 group-hover:outline-offset-2 group-hover:outline-foreground/40"} group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-sea`}>
                    <Photo photo={pickPhoto(photos.data?.[CRAVING_PHOTO[c.id]], c.id)} className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105" />
                    {places.data && <span className="absolute top-2 end-2 rounded-md bg-white text-[#0f1530] px-1.5 py-0.5 text-[12px] font-semibold tabular">{n}</span>}
                  </span>
                  <span className={`mt-1.5 block text-[15px] font-medium ${active ? "text-[#d6336c]" : ""}`}>{lang === "he" ? c.he : c.en}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Happy hour right now */}
        {happyNow.length > 0 && !craving && !needle && toggles.size === 0 && (
          <section className="mt-8" aria-labelledby="hh-h">
            <h2 id="hh-h" className="font-display text-[28px] leading-none">{t("food.happyTitle")}</h2>
            <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2">
              {happyNow.slice(0, 12).map(({ p, happy, d, dish }) => (
                <Link key={p.id} to={`/place/${placeSlug(p)}`}
                  className="relative shrink-0 w-[240px] h-[160px] rounded-lg overflow-hidden text-white">
                  <Photo photo={pickPhoto(photos.data?.[dish === "beer" ? "beer" : "cocktail"], p.id)} className="absolute inset-0 h-full w-full" />
                  <span className="absolute inset-x-0 bottom-0 p-3 bg-[#d6336c]">
                    <span className="block text-[16px] font-semibold leading-tight truncate" dir="auto">{name(p)}</span>
                    <span className="block text-[12px]">{happy?.until ? `${t("food.hhUntil")} ${happy.until}` : t("food.happy")}, {walkMinutes(d)} {t("now.walk")}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {TOGGLES.map((x) => (
            <button key={x.id} onClick={() => toggle(x.id)} aria-pressed={toggles.has(x.id)}
              className={`h-9 rounded-md px-3.5 text-[14px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${toggles.has(x.id) ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}>
              {t(x.key)}
            </button>
          ))}
          <label className="ms-auto inline-flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="h-4 w-4 accent-[#d6336c]" />
            {t("food.onlyOpen")}
          </label>
        </div>

        <p className="mt-4 text-[14px] text-muted-foreground tabular">
          {places.data ? `${shown.length} ${t("food.places")}${crave ? `: ${lang === "he" ? crave.he : crave.en}` : ""}` : ""}
        </p>
        {places.isError && <p className="mt-4 text-[14px] text-muted-foreground">{t("common.error")}</p>}
        {places.data && shown.length === 0 && (
          <p className="mt-4 text-[15px] text-muted-foreground">{toggles.has("happy") ? t("food.noHappy") : t("food.none")}</p>
        )}

        <ul className="mt-3 grid gap-x-4 gap-y-6 grid-cols-2 lg:grid-cols-4">
          {shown.slice(0, limit).map(({ p, state, happy, d, dish }) => (
            <li key={p.id}>
              <Link to={`/place/${placeSlug(p)}`} className="group block focus-visible:outline-none">
                <span className="relative block aspect-[4/3] rounded-lg overflow-hidden group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-sea">
                  <Photo photo={pickPhoto(photos.data?.[dish], p.id)} className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105" />
                  <span className={`absolute top-2 start-2 rounded-md px-2 py-0.5 text-[12px] font-semibold ${state.status === "open" ? "bg-[#2f9e44] text-white" : "bg-white text-[#0f1530]"}`}>{stateLine(state)}</span>
                  {happy?.status === "open" && <span className="absolute bottom-2 start-2 rounded-md bg-[#d6336c] text-white px-2 py-0.5 text-[12px] font-semibold">{t("food.happy")}</span>}
                </span>
                <span className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="text-[16px] font-semibold leading-snug truncate group-hover:text-[#d6336c]" dir="auto">{name(p)}</span>
                  <span className="hidden sm:inline shrink-0 text-[12px] tabular text-muted-foreground">{walkMinutes(d)} {t("now.walk")}</span>
                </span>
                <span className="block text-[13px] text-muted-foreground truncate" dir="auto">
                  <span className="sm:hidden tabular">{walkMinutes(d)} {t("now.walk")}, </span>
                  {[cap(p.cuisine?.split(";")[0].replace(/_/g, " ")) || placeKindLabel(p.kind, lang), p.street && `${p.street}${p.number ? ` ${p.number}` : ""}`].filter(Boolean).join(", ")}
                </span>
                {((p.kosher === "yes" || p.kosher === "only") || (p.vegan === "yes" || p.vegan === "only") || p.outdoor) && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {(p.kosher === "yes" || p.kosher === "only") && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{t("live.kosher")}</span>}
                    {(p.vegan === "yes" || p.vegan === "only") && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{t("food.vegan")}</span>}
                    {p.outdoor && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{t("food.outdoor")}</span>}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        {shown.length > limit && (
          <div className="mt-6 text-center">
            <button onClick={() => setLimit((n) => n + 24)} className="h-11 rounded-lg border border-border px-6 text-[14px] font-medium hover:bg-secondary">{t("food.more")}</button>
          </div>
        )}

        <section className="mt-12 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-[22px]">{t("food.craving")}</h2>
            <div className="mt-2 flex flex-wrap gap-2">{CRAVINGS.map((c) => <Link key={c.id} to={`/eat/${c.id}`} className="h-9 inline-flex items-center rounded-md bg-secondary px-3 text-[14px] hover:bg-secondary/70">{lang === "he" ? c.he : c.en}</Link>)}</div>
          </div>
          <div>
            <h2 className="font-display text-[22px]">{t("eat.byArea")}</h2>
            <div className="mt-2 flex flex-wrap gap-2">{NEIGHBOURHOODS.map((h) => <Link key={h.en} to={`/area/${hoodSlug(h)}`} className="h-9 inline-flex items-center rounded-md bg-secondary px-3 text-[14px] hover:bg-secondary/70">{lang === "he" ? h.he : h.en}</Link>)}</div>
          </div>
        </section>

        <div className="mt-12 rounded-lg bg-[#0f1530] text-white p-6 sm:flex sm:items-center sm:justify-between gap-6">
          <div>
            <p className="font-display text-[24px] leading-tight">{t("food.knowDeal")}</p>
            <p className="mt-1 text-[14px] text-white/80">{t("food.knowDealBody")}</p>
          </div>
          <Link to="/submit?kind=happy" className="mt-4 sm:mt-0 shrink-0 inline-flex h-11 items-center rounded-lg bg-[#ffc233] text-[#1f1400] px-5 text-[14px] font-semibold">{t("food.addDeal")}</Link>
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">{t("food.source")} {t("food.photoCredit")}</p>
      </div>
    </SiteLayout>
  );
};

export default Food;
