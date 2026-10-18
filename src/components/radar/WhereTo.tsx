import { FormEvent, useState } from "react";
import { MapPin, Navigation, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { geocode, linesBetween, type Bus, type Geo, type LineMatch } from "@/lib/live/sources";

export type WhereResult = { origin: Geo; dest: Geo; lines: LineMatch[] };

type Props = {
  getOrigin: () => Promise<{ geo: Geo; mine: boolean }>;
  buses: Bus[];
  activeLine: number | null;
  onResult: (r: WhereResult | null) => void;
  onPickLine: (lineRef: number | null) => void;
  onClose: () => void;
};

// Live buses of a line that haven't reached the rider's stop yet.
const approaching = (l: LineMatch, buses: Bus[]) =>
  buses
    .filter((b) => b.lineRef === l.lineRef && b.distance != null && b.distance < l.distAtOrigin)
    .map((b) => (l.distAtOrigin - b.distance!) / 1000)
    .sort((a, b) => a - b);

export const WhereTo = ({ getOrigin, buses, activeLine, onResult, onPickLine, onClose }: Props) => {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "notfound" | "error">("idle");
  const [result, setResult] = useState<WhereResult | null>(null);
  const [mine, setMine] = useState<boolean | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setState("busy");
    setResult(null);
    onPickLine(null);
    try {
      const [{ geo: origin, mine: m }, hits] = await Promise.all([getOrigin(), geocode(q.trim(), lang)]);
      setMine(m);
      if (!hits.length) { setState("notfound"); onResult(null); return; }
      const dest = hits[0];
      const lines = await linesBetween(origin, dest);
      const r = { origin, dest, lines };
      setResult(r);
      onResult(r);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const clear = () => { setQ(""); setResult(null); setState("idle"); onResult(null); onPickLine(null); };

  const google = result && `https://www.google.com/maps/dir/?api=1&origin=${result.origin.lat},${result.origin.lon}&destination=${result.dest.lat},${result.dest.lon}&travelmode=transit`;
  const moovit = result && `https://moovit.com/?from=${encodeURIComponent(mine ? t("where.myLocation") : "Start")}&fll=${result.origin.lat}_${result.origin.lon}&to=${encodeURIComponent(result.dest.label)}&tll=${result.dest.lat}_${result.dest.lon}&metroId=1&lang=${lang}`;

  return (
    <div className="absolute inset-x-3 bottom-3 md:inset-x-auto md:start-3 md:bottom-6 md:w-[380px] max-h-[70%] flex flex-col rounded-2xl bg-background border border-border shadow-lg">
      <form onSubmit={submit} className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <label className="flex-1 flex items-center gap-2 h-11 rounded-xl bg-secondary px-3 focus-within:ring-2 focus-within:ring-sea">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("where.placeholder")}
              aria-label={t("where.button")}
              className="flex-1 min-w-0 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              dir="auto"
            />
          </label>
          <button type="button" onClick={() => { clear(); onClose(); }} aria-label={t("live.close")} className="p-2 rounded-full hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5" aria-hidden />
            {t("where.from")} {mine === false ? t("where.mapCentre") : t("where.myLocation")}
          </span>
          <button type="submit" disabled={state === "busy"} className="h-8 rounded-full bg-foreground text-background px-3.5 text-[13px] font-medium disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea">
            {t("where.go")}
          </button>
        </div>
      </form>

      <div className="overflow-y-auto p-3">
        {state === "busy" && <p className="text-[14px] text-muted-foreground animate-pulse">{t("where.searching")}</p>}
        {state === "notfound" && <p className="text-[14px] text-muted-foreground">{t("where.notFound")}</p>}
        {state === "error" && <p className="text-[14px] text-muted-foreground">{t("common.error")}</p>}

        {result && (
          <>
            <p className="flex items-start gap-1.5 text-[13px]" dir="auto">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-cat-festival" aria-hidden />
              <span className="min-w-0">{result.dest.label}</span>
            </p>
            {result.lines.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted-foreground">{t("where.none")}</p>
            ) : (
              <>
                <h3 className="mt-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{t("where.lines")}</h3>
                <ul className="mt-1 divide-y divide-border">
                  {result.lines.slice(0, 12).map((l) => {
                    const coming = approaching(l, buses);
                    const active = activeLine === l.lineRef;
                    return (
                      <li key={l.lineRef}>
                        <button
                          onClick={() => onPickLine(active ? null : l.lineRef)}
                          aria-pressed={active}
                          className={`w-full text-start grid grid-cols-[auto,1fr] gap-3 py-2.5 px-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${active ? "bg-secondary" : "hover:bg-secondary/60"}`}
                        >
                          <span className="min-w-[44px] h-8 px-2 rounded-lg bg-[#0b63e5] text-white text-[15px] font-semibold tabular flex items-center justify-center">{l.line ?? "?"}</span>
                          <span className="min-w-0">
                            <span className="block text-[14px] leading-snug truncate" dir="auto">→ {l.to ?? ""}</span>
                            <span className="block text-[12px] text-muted-foreground" dir="auto">
                              {[l.agency, `${((l.distAtDest - l.distAtOrigin) / 1000).toFixed(1)} ${t("where.ride")}`].filter(Boolean).join(" · ")}
                            </span>
                            {coming.length > 0 && (
                              <span className="block text-[12px] text-surf font-medium">
                                {coming.length} {t("where.coming")} · {t("where.nearest")} {coming[0].toFixed(1)} {t("where.kmAway")}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <p className="mt-3 text-[12px] text-muted-foreground">{t("where.note")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={google!} target="_blank" rel="noopener noreferrer" className="h-8 inline-flex items-center rounded-full border border-border px-3 text-[13px] hover:bg-secondary">Google Maps</a>
              <a href={moovit!} target="_blank" rel="noopener noreferrer" className="h-8 inline-flex items-center rounded-full border border-border px-3 text-[13px] hover:bg-secondary">Moovit</a>
              <button onClick={clear} className="h-8 inline-flex items-center rounded-full px-3 text-[13px] text-muted-foreground hover:bg-secondary">{t("where.clear")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
