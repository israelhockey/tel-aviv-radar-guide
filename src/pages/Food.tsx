import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Beer, Coffee, LocateFixed, Moon, Search, Sparkles, Sun, UtensilsCrossed, Leaf } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { distanceMeters, TLV_CENTER, walkMinutes } from "@/lib/live/geo";
import { usePlaces } from "@/lib/live/hooks";
import { openStateAt, type OpenState } from "@/lib/live/openingHours";
import { placeKindLabel } from "@/lib/live/places";
import type { Place } from "@/lib/live/sources";

type Filter = "all" | "cafe" | "food" | "bar" | "late" | "happy" | "kosher" | "vegan" | "outdoor";

const FILTERS: { id: Filter; key: StringKey; icon: typeof Coffee }[] = [
  { id: "all", key: "food.all", icon: Sparkles },
  { id: "happy", key: "food.happy", icon: Beer },
  { id: "cafe", key: "food.cafes", icon: Coffee },
  { id: "food", key: "food.eat", icon: UtensilsCrossed },
  { id: "bar", key: "food.bars", icon: Beer },
  { id: "late", key: "food.late", icon: Moon },
  { id: "outdoor", key: "food.outdoor", icon: Sun },
  { id: "kosher", key: "live.kosher", icon: Sparkles },
  { id: "vegan", key: "food.vegan", icon: Leaf },
];

const KIND_BG: Record<string, string> = {
  cafe: "bg-cat-comedy", restaurant: "bg-cat-food", bar: "bg-cat-music", pub: "bg-cat-music", biergarten: "bg-cat-music",
  fast_food: "bg-cat-festival", ice_cream: "bg-cat-party",
};

// Open at half past midnight tonight?
const lateNight = (p: Place) => {
  const d = new Date();
  if (d.getHours() >= 5) d.setDate(d.getDate() + 1);
  d.setHours(0, 30, 0, 0);
  return openStateAt(p.hours, d).status === "open";
};

const Food = () => {
  const { t, lang } = useI18n();
  const places = usePlaces();
  const [filter, setFilter] = useState<Filter>("all");
  const [openOnly, setOpenOnly] = useState(true);
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState<{ lat: number; lon: number; exact: boolean }>({ ...TLV_CENTER, exact: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    document.title = lang === "he" ? "אוכל ושתייה · TLV Radar" : "Food & drink · TLV Radar";
  }, [lang]);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

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
      .map((p) => ({ p, state: openStateAt(p.hours, now), happy: p.happy ? openStateAt(p.happy, now) : null, d: distanceMeters(origin, p) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.data, origin, tick]);

  const happyNow = rows.filter((r) => r.happy?.status === "open").sort((a, b) => a.d - b.d);
  const needle = q.trim().toLowerCase();

  const shown = rows
    .filter(({ p, state, happy }) => {
      if (needle && !`${p.name} ${p.nameEn ?? ""} ${p.cuisine ?? ""} ${p.street ?? ""}`.toLowerCase().includes(needle)) return false;
      if (openOnly && filter !== "happy" && state.status !== "open") return false;
      switch (filter) {
        case "cafe": return p.kind === "cafe";
        case "food": return ["restaurant", "fast_food"].includes(p.kind);
        case "bar": return ["bar", "pub", "biergarten"].includes(p.kind);
        case "late": return lateNight(p);
        case "happy": return !!p.happy && (!openOnly || happy?.status === "open");
        case "kosher": return p.kosher === "yes" || p.kosher === "only";
        case "vegan": return p.vegan === "yes" || p.vegan === "only";
        case "outdoor": return !!p.outdoor;
        default: return true;
      }
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, 60);

  const openCount = rows.filter((r) => r.state.status === "open").length;

  const stateLine = (s: OpenState) =>
    s.status === "open" ? (s.until ? `${t("live.open")} · ${t("now.closesAt")} ${s.until}` : t("live.open"))
      : s.status === "closed" ? `${t("live.closed")}${s.opensAt ? ` · ${t("food.opens")} ${s.opensAt}` : ""}`
        : t("live.hoursUnknown");

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #c2255c 0%, #e8590c 55%, #f59f00 100%)" }}>
        <div className="container-page py-8 sm:py-12">
          <h1 className="font-display text-[42px] sm:text-[64px] leading-[0.95]">{t("food.title")}</h1>
          <p className="mt-2 text-[17px] text-white/90">
            {places.data ? <><span className="font-semibold tabular">{openCount}</span> {t("food.openNow")}</> : "…"}
            {happyNow.length > 0 && <> · <span className="font-semibold tabular">{happyNow.length}</span> {t("food.happyNow")}</>}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <label className="flex-1 min-w-[220px] max-w-md flex items-center gap-2 h-11 rounded-full bg-white/95 text-foreground px-4 focus-within:ring-2 focus-within:ring-white">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("food.search")} className="flex-1 bg-transparent outline-none text-[15px] text-[hsl(230_35%_10%)]" dir="auto" />
            </label>
            <button onClick={locate} className="inline-flex items-center gap-2 h-11 rounded-full bg-black/25 hover:bg-black/35 px-4 text-[14px] font-medium">
              <LocateFixed className="h-4 w-4" aria-hidden />
              {origin.exact ? t("food.nearYou") : t("now.useLocation")}
            </button>
          </div>
        </div>
      </section>

      <div className="container-page">
        {/* Happy hour right now */}
        {happyNow.length > 0 && filter === "all" && !needle && (
          <section className="mt-8" aria-labelledby="hh-h">
            <h2 id="hh-h" className="font-display text-[26px] leading-none">{t("food.happyTitle")}</h2>
            <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2">
              {happyNow.slice(0, 12).map(({ p, happy, d }) => (
                <a key={p.id} href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 w-[220px] rounded-[var(--radius)] p-4 text-white shadow-[var(--shadow-card)]" style={{ background: "linear-gradient(140deg, #7048e8, #c2255c)" }}>
                  <p className="text-[12px] opacity-85">{placeKindLabel(p.kind, lang)} · {walkMinutes(d)} {t("now.walk")}</p>
                  <p className="mt-1 text-[17px] font-semibold leading-tight line-clamp-2" dir="auto">{(lang === "en" && p.nameEn) || p.name}</p>
                  {happy?.until && <p className="mt-2 text-[13px] font-medium">{t("food.hhUntil")} {happy.until}</p>}
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
              className={`shrink-0 inline-flex items-center gap-1.5 h-9 rounded-full px-3.5 text-[14px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${filter === f.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}>
              <f.icon className="h-4 w-4" aria-hidden />{t(f.key)}
            </button>
          ))}
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="h-4 w-4 accent-current" />
          {t("food.onlyOpen")}
        </label>

        {places.isError && <p className="mt-6 text-[14px] text-muted-foreground">{t("common.error")}</p>}
        {places.data && shown.length === 0 && (
          <p className="mt-6 text-[15px] text-muted-foreground">{filter === "happy" ? t("food.noHappy") : t("food.none")}</p>
        )}

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ p, state, happy, d }) => (
            <li key={p.id}>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking`} target="_blank" rel="noopener noreferrer"
                className="group flex gap-3 rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-3.5 h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea">
                <span className={`h-11 w-11 shrink-0 rounded-xl ${KIND_BG[p.kind] ?? "bg-cat-other"} text-white flex items-center justify-center font-display text-[18px]`} aria-hidden>
                  {((lang === "en" && p.nameEn) || p.name).trim().charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-medium leading-snug truncate group-hover:text-sea" dir="auto">{(lang === "en" && p.nameEn) || p.name}</span>
                    <span className="shrink-0 text-[12px] tabular text-muted-foreground">{walkMinutes(d)} {t("now.walk")}</span>
                  </span>
                  <span className="block text-[12px] text-muted-foreground truncate" dir="auto">
                    {[placeKindLabel(p.kind, lang), p.cuisine?.split(";")[0].replace(/_/g, " "), p.street && `${p.street}${p.number ? ` ${p.number}` : ""}`].filter(Boolean).join(" · ")}
                  </span>
                  <span className={`mt-1 block text-[12px] font-medium ${state.status === "open" ? "text-surf" : "text-muted-foreground"}`}>{stateLine(state)}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {happy?.status === "open" && <span className="rounded-full bg-cat-music text-white px-2 py-0.5 text-[11px]">{t("food.happy")}{happy.until ? ` → ${happy.until}` : ""}</span>}
                    {(p.kosher === "yes" || p.kosher === "only") && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{t("live.kosher")}</span>}
                    {(p.vegan === "yes" || p.vegan === "only") && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{t("food.vegan")}</span>}
                    {p.outdoor && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{t("food.outdoor")}</span>}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-[var(--radius)] border border-dashed border-border p-5 text-center">
          <p className="text-[15px] font-medium">{t("food.knowDeal")}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("food.knowDealBody")}</p>
          <Link to="/submit?kind=happy" className="mt-3 inline-flex h-10 items-center rounded-full bg-foreground text-background px-5 text-[14px] font-medium">{t("food.addDeal")}</Link>
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">{t("food.source")}</p>
      </div>
    </SiteLayout>
  );
};

export default Food;
