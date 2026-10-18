import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { TLV_CENTER } from "@/lib/live/geo";
import { useAircraft, useBuses } from "@/lib/live/hooks";

const SIZE = 220;
const R = SIZE / 2 - 6;
// Radius of the scope in degrees of latitude (~7 km), wide enough for the whole city.
const SCOPE_DEG = 0.065;

const project = (lat: number, lon: number) => {
  const dy = (lat - TLV_CENTER.lat) / SCOPE_DEG;
  const dx = ((lon - TLV_CENTER.lon) * Math.cos((TLV_CENTER.lat * Math.PI) / 180)) / SCOPE_DEG;
  return { x: SIZE / 2 + dx * R, y: SIZE / 2 - dy * R, inside: dx * dx + dy * dy <= 1 };
};

// A real radar scope: every dot is a bus or aircraft at its last reported position.
export const LiveTeaser = () => {
  const { t } = useI18n();
  const buses = useBuses();
  const aircraft = useAircraft();

  const busDots = (buses.data?.buses ?? []).map((b) => project(b.lat, b.lon)).filter((p) => p.inside);
  const planeDots = (aircraft.data ?? []).map((a) => project(a.lat, a.lon)).filter((p) => p.inside);

  return (
    <Link
      to="/live"
      className="group block rounded-2xl bg-foreground text-background p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2"
    >
      <div className="flex items-center gap-5">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-[132px] w-[132px] shrink-0" aria-hidden>
          <defs>
            <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7dd3fc" stopOpacity="0" />
              <stop offset="1" stopColor="#7dd3fc" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="currentColor" strokeOpacity="0.25" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R * 0.66} fill="none" stroke="currentColor" strokeOpacity="0.15" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R * 0.33} fill="none" stroke="currentColor" strokeOpacity="0.15" />
          <line x1={SIZE / 2} y1={6} x2={SIZE / 2} y2={SIZE - 6} stroke="currentColor" strokeOpacity="0.1" />
          <line x1={6} y1={SIZE / 2} x2={SIZE - 6} y2={SIZE / 2} stroke="currentColor" strokeOpacity="0.1" />
          <g className="radar-sweep">
            <path d={`M${SIZE / 2} ${SIZE / 2} L${SIZE / 2 + R} ${SIZE / 2} A${R} ${R} 0 0 0 ${SIZE / 2 + R * Math.cos(Math.PI / 3)} ${SIZE / 2 - R * Math.sin(Math.PI / 3)} Z`} fill="url(#sweep)" />
          </g>
          {busDots.map((p, i) => <circle key={`b${i}`} cx={p.x} cy={p.y} r={2.2} fill="#7dd3fc" />)}
          {planeDots.map((p, i) => <circle key={`p${i}`} cx={p.x} cy={p.y} r={3} fill="hsl(var(--accent))" />)}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={3} fill="currentColor" />
        </svg>
        <div className="min-w-0">
          <h2 className="text-lg font-medium">{t("now.liveTitle")}</h2>
          <p className="mt-1 text-[13px] text-background/70 leading-snug">{t("now.liveBody")}</p>
          <dl className="mt-3 space-y-1 text-[13px]">
            <div className="flex items-baseline gap-2">
              <dd className="text-xl font-medium tabular text-sky-300">{buses.data ? buses.data.buses.length : "…"}</dd>
              <dt className="text-background/70">{t("now.busesMoving")}</dt>
            </div>
            <div className="flex items-baseline gap-2">
              <dd className="text-xl font-medium tabular text-accent">{aircraft.data ? aircraft.data.length : "…"}</dd>
              <dt className="text-background/70">{t("now.planes")}</dt>
            </div>
          </dl>
        </div>
      </div>
      <span className="mt-4 inline-block text-[14px] font-medium underline-offset-4 group-hover:underline">{t("now.openLive")}</span>
    </Link>
  );
};
