import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useBeaches, useEventsFeed, useParking, usePlaces, useTelofan } from "@/lib/live/hooks";
import { BEACHES, NEIGHBOURHOODS, distanceMeters } from "@/lib/live/geo";
import { openStateAt } from "@/lib/live/openingHours";
import { inRange } from "@/lib/live/when";
import { isEveningOut } from "@/lib/live/sources";
import { hoodSlug } from "@/lib/areas";

// The City Lines look: the city drawn as transit lines. Pick a stop to see what's around it now.

type Stop = { name: string; nameHe: string; lat: number; lon: number; to: string };
type Line = { code: string; name: string; nameHe: string; color: string; stops: Stop[] };

// Red Line underground stations through the city (positions approximate, at street level).
const RED: Stop[] = [
  { name: "Arlozorov", nameHe: "ארלוזורוב", lat: 32.0838, lon: 34.798, to: "/area/new-north" },
  { name: "Shaul HaMelech", nameHe: "שאול המלך", lat: 32.0778, lon: 34.7899, to: "/area/sarona" },
  { name: "Yehudit", nameHe: "יהודית", lat: 32.0712, lon: 34.7878, to: "/area/sarona" },
  { name: "Carlebach", nameHe: "קרליבך", lat: 32.0668, lon: 34.7808, to: "/area/montefiore" },
  { name: "Allenby", nameHe: "אלנבי", lat: 32.063, lon: 34.774, to: "/area/lev-hair" },
  { name: "Elifelet", nameHe: "אליפלט", lat: 32.0556, lon: 34.7646, to: "/area/florentin" },
];

const HOOD_LINE = ["The Port", "Old North", "City Centre", "Lev HaIr", "Neve Tzedek", "Florentin", "Jaffa"]
  .map((n) => NEIGHBOURHOODS.find((h) => h.en === n)!)
  .map((h) => ({ name: h.en, nameHe: h.he, lat: h.lat, lon: h.lon, to: `/area/${hoodSlug(h)}` }));

const COAST = BEACHES.filter((b) => b.id !== "jerusalem").map((b) => ({ name: b.en.replace(/ \(.*\)$/, ""), nameHe: b.he.replace(/ \(.*\)$/, ""), lat: b.lat, lon: b.lon, to: "/beach", id: b.id }));

export const LINES: Line[] = [
  { code: "R", name: "Red Line: the light rail stations", nameHe: "הקו האדום: תחנות הרכבת הקלה", color: "#e4002b", stops: RED },
  { code: "C", name: "Coast line: the beaches, north to south", nameHe: "קו החוף: החופים מצפון לדרום", color: "#0072ce", stops: COAST },
  { code: "N", name: "Neighbourhood line: a walk through the city", nameHe: "קו השכונות: הליכה דרך העיר", color: "#ff8200", stops: HOOD_LINE },
];

export const LineMap = () => {
  const { lang } = useI18n();
  const he = lang === "he";
  const [sel, setSel] = useState<{ line: string; i: number }>({ line: "R", i: 4 });
  const places = usePlaces();
  const docks = useTelofan();
  const parking = useParking();
  const events = useEventsFeed();
  const seas = useBeaches();
  const line = LINES.find((l) => l.code === sel.line)!;
  const stop = line.stops[sel.i];

  const facts = useMemo(() => {
    const near = (p: { lat: number; lon: number }, m: number) => distanceMeters(stop, p) < m;
    const open = (places.data ?? []).filter((p) => p.kind !== "bicycle_rental" && near(p, 500) && openStateAt(p.hours).status === "open").length;
    const bikes = (docks.data ?? []).filter((d) => near(d, 400)).reduce((n, d) => n + d.bikes + d.ebikes, 0);
    const lots = (parking.data ?? []).filter((k) => near(k, 700));
    const lotsFree = lots.filter((k) => k.status === "free" || k.status === "few").length;
    const tonight = (events.data?.events ?? []).filter((e) => e.lat != null && e.lon != null && isEveningOut(e) && inRange(e.start, e.end, "tonight") && near({ lat: e.lat, lon: e.lon }, 900)).length;
    const sea = "id" in stop ? seas.data?.find((b) => b.id === (stop as { id: string }).id) : undefined;
    const out: [string, string][] = [];
    if (sea?.seaTemp != null) out.push([he ? "ים" : "Sea", `${Math.round(sea.seaTemp)}°${sea.waveHeight != null ? `, ${sea.waveHeight.toFixed(1)} m` : ""}`]);
    if (places.data) out.push([he ? "פתוח עכשיו בסביבה" : "Open now nearby", String(open)]);
    if (docks.data) out.push([he ? "תל-אופן פנויים" : "Tel-O-Fun bikes free", String(bikes)]);
    if (parking.data && lots.length) out.push([he ? "חניונים עם מקום" : "Car parks with space", `${lotsFree} / ${lots.length}`]);
    if (events.data) out.push([he ? "אירועים הערב" : "Events tonight", String(tonight)]);
    return out;
  }, [stop, places.data, docks.data, parking.data, events.data, seas.data, he]);

  return (
    <div className="flex flex-wrap gap-10 items-start">
      <div className="flex-[999_1_620px] min-w-0 flex flex-col gap-9">
        {LINES.map((l) => (
          <div key={l.code} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="line-bullet" style={{ background: l.color }}>{l.code}</span>
              <span className="text-[17px] font-bold">{he ? l.nameHe : l.name}</span>
            </div>
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <div className="relative flex justify-between pt-3" style={{ minWidth: `${l.stops.length * 92}px` }}>
                <span className="absolute inset-x-3 top-[21px] h-2 rounded" style={{ background: l.color }} aria-hidden />
                {l.stops.map((s, i) => {
                  const active = sel.line === l.code && sel.i === i;
                  return (
                    <button key={s.name} onClick={() => setSel({ line: l.code, i })} aria-pressed={active} className="relative flex w-[88px] flex-col items-center gap-2 bg-transparent">
                      <span className="h-[26px] w-[26px] rounded-full border-[5px]" style={{ borderColor: l.color, background: active ? l.color : "hsl(var(--background))" }} />
                      <span className={`text-[13px] leading-tight text-center ${active ? "font-extrabold" : "font-medium"}`}>{he ? s.nameHe : s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <aside className="flex-[1_1_320px] max-w-[420px] border-2 border-foreground rounded-[6px] overflow-hidden">
        <div className="h-3" style={{ background: line.color }} />
        <div className="p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="line-bullet" style={{ background: line.color }}>{line.code}</span>
            <span className="text-[28px] font-extrabold tracking-tight">{he ? stop.nameHe : stop.name}</span>
          </div>
          {facts.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2 border-t border-border/40 text-[15px]">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-bold tabular">{v}</span>
            </div>
          ))}
          <Link to={stop.to} className="mt-1 inline-flex h-11 items-center justify-center rounded-[4px] bg-foreground text-background font-bold">{he ? `לגלות את ${stop.nameHe}` : `Explore ${stop.name}`}</Link>
          <Link to={`/live?where=1`} className="text-center text-[14px] font-semibold text-sea hover:underline">{he ? "איך מגיעים לשם" : "How to get there"}</Link>
        </div>
      </aside>
    </div>
  );
};

export const BoardRow = ({ code, color, label, value, to }: { code: string; color: string; label: string; value: string; to: string }) => (
  <Link to={to} className="flex items-center gap-3.5 p-4 bg-[#101820] text-white hover:bg-[#18232e]">
    <span className="line-bullet" style={{ background: color, color: color === "#ffffff" ? "#101820" : "#fff" }}>{code}</span>
    <span className="flex-1">{label}</span>
    <span className="text-[30px] font-extrabold text-[#ffd200] tabular">{value}</span>
  </Link>
);
