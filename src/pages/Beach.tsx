import { useEffect, useMemo } from "react";
import { Accessibility, Coffee, Dog, Lightbulb, MapPin, ShowerHead, Sun, CircleDot, Waves, Wind, Baby, Sailboat, Car } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useBeachForecast, useBeaches, useCityData, useJellyfish, useWeather } from "@/lib/live/hooks";
import { BEACHES, distanceMeters } from "@/lib/live/geo";
import { seaState, type BeachHour, type CityBeach, type JellyStatus } from "@/lib/live/sources";

const verdictKey = (s: number): StringKey =>
  s >= 8 ? "beach.v5" : s >= 6.5 ? "beach.v4" : s >= 4.5 ? "beach.v3" : s >= 2.5 ? "beach.v2" : "beach.v1";

const scoreColor = (s: number) =>
  s >= 8 ? "#12b886" : s >= 6.5 ? "#40c057" : s >= 4.5 ? "#fab005" : s >= 2.5 ? "#fd7e14" : "#fa5252";

// The longest run of daylight hours close to the day's best.
const bestWindow = (hours: BeachHour[]) => {
  const day = hours.filter((h) => h.isDay);
  if (!day.length) return null;
  const top = Math.max(...day.map((h) => h.score));
  const bar = Math.max(top - 1, 4.5);
  let best: [number, number] | null = null;
  let start = -1;
  day.forEach((h, i) => {
    if (h.score >= bar) {
      if (start < 0) start = i;
      if (!best || i - start > best[1] - best[0]) best = [start, i];
    } else start = -1;
  });
  if (!best) return { top, from: null, to: null };
  const [a, b] = best as [number, number];
  return { top, from: day[a].time.slice(11, 16), to: `${String(Number(day[b].time.slice(11, 13)) + 1).padStart(2, "0")}:00` };
};

const JELLY_STYLE: Record<JellyStatus, string> = {
  none: "bg-surf/15 text-surf",
  few: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  many: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  mixed: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  fewStinging: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  manyStinging: "bg-destructive/15 text-destructive",
  stingingWater: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  unknown: "bg-secondary text-muted-foreground",
};

const ScoreRing = ({ score }: { score: number }) => {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(score / 10) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[44px] leading-none tabular">{score.toFixed(1)}</span>
        <span className="text-[12px] opacity-80">/ 10</span>
      </span>
    </div>
  );
};

const Facility = ({ on, icon: Icon, label }: { on: boolean | null | undefined; icon: typeof Sun; label: string }) =>
  on ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[12px]" title={label}>
      <Icon className="h-3.5 w-3.5" aria-hidden />{label}
    </span>
  ) : null;

const Beach = () => {
  const { t, lang } = useI18n();
  const forecast = useBeachForecast();
  const sea = useBeaches();
  const weather = useWeather();
  const city = useCityData();
  const jelly = useJellyfish();

  useEffect(() => {
    document.title = lang === "he" ? "חופים · Discover Tel Aviv" : "Beaches · Discover Tel Aviv";
  }, [lang]);

  const days = useMemo(() => {
    const m = new Map<string, BeachHour[]>();
    for (const h of forecast.data ?? []) m.set(h.time.slice(0, 10), [...(m.get(h.time.slice(0, 10)) ?? []), h]);
    return [...m.entries()].slice(0, 4);
  }, [forecast.data]);

  const nowKey = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).format(new Date()).replace(" ", "T").slice(0, 13);
  const today = days[0]?.[1] ?? [];
  const nowHour = today.find((h) => h.time.startsWith(nowKey)) ?? today[0];
  const win = bestWindow(today.filter((h) => h.time.slice(0, 13) >= nowKey));
  const headline = win?.top ?? nowHour?.score ?? 0;
  const st = seaState(nowHour?.wave ?? null);

  const dayName = (ymd: string, i: number) =>
    i === 0 ? t("news.today") : new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(`${ymd}T12:00:00Z`));

  // Live wave reading from the nearest of our sea points, for each city beach.
  const nearestSea = (b: CityBeach) => {
    let best: { d: number; id: string } | null = null;
    for (const p of BEACHES) {
      const d = distanceMeters({ lat: b.at[1], lon: b.at[0] }, p);
      if (!best || d < best.d) best = { d, id: p.id };
    }
    return sea.data?.find((s) => s.id === best?.id);
  };

  const beaches = [...(city.data?.beaches ?? [])].sort((a, b) => b.at[1] - a.at[1]);
  const jellyTlv = [...(jelly.data?.regions ?? [])].sort((a, b) => b.lat - a.lat);

  return (
    <SiteLayout>
      {/* Hero: today's beach verdict on a sea gradient */}
      <section className="relative isolate overflow-hidden text-white" style={{ background: "linear-gradient(160deg, #0b7285 0%, #1098ad 35%, #15aabf 60%, #e8b77d 100%)" }}>
        <svg className="absolute bottom-0 inset-x-0 -z-10 w-full h-24 opacity-30" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
          <path d="M0,64 C240,112 480,16 720,48 C960,80 1200,112 1440,64 L1440,120 L0,120 Z" fill="#fff" className="motion-safe:animate-[pulse_6s_ease-in-out_infinite]" />
        </svg>
        <div className="container-page py-8 sm:py-12">
          <p className="text-[13px] uppercase tracking-wider opacity-85">{t("beach.title")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-6">
            {forecast.data ? <ScoreRing score={headline} /> : <div className="h-[132px] w-[132px] rounded-full bg-white/15 animate-pulse" />}
            <div className="min-w-0">
              <h1 className="font-display text-[38px] sm:text-[56px] leading-[0.95]">{forecast.data ? t(verdictKey(headline)) : "…"}</h1>
              {win?.from && <p className="mt-2 text-[17px] opacity-95">{t("beach.best")} <span className="font-semibold tabular">{win.from}–{win.to}</span></p>}
              {!win?.from && forecast.data && <p className="mt-2 text-[17px] opacity-95">{t("beach.notToday")}</p>}
            </div>
          </div>
          {nowHour && (
            <div className="mt-6 flex flex-wrap gap-2 text-[14px]">
              <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1.5"><Sun className="inline h-4 w-4 me-1 -mt-0.5" aria-hidden />{Math.round(nowHour.feels)}° {t("now.feels")}</span>
              {nowHour.sea != null && <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1.5"><Waves className="inline h-4 w-4 me-1 -mt-0.5" aria-hidden />{t("now.sea")} {Math.round(nowHour.sea)}°</span>}
              {nowHour.wave != null && <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1.5">{nowHour.wave.toFixed(1)} m{st ? ` · ${t(`sea.${st}` as const)}` : ""}</span>}
              <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1.5"><Wind className="inline h-4 w-4 me-1 -mt-0.5" aria-hidden />{Math.round(nowHour.wind)} km/h</span>
              {weather.data && <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1.5">UV {Math.round(weather.data.uvMax)}</span>}
              {weather.data && <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1.5">{t("now.sunset")} {weather.data.sunset.slice(11, 16)}</span>}
            </div>
          )}
        </div>
      </section>

      <div className="container-page">
        {/* Today hour by hour */}
        {today.length > 0 && (
          <section className="mt-8" aria-labelledby="hours-h">
            <h2 id="hours-h" className="font-display text-[24px] leading-none">{t("beach.hours")}</h2>
            <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-end gap-1.5 overflow-x-auto pb-2">
              {today.filter((h) => h.isDay).map((h) => (
                <div key={h.time} className="flex flex-col items-center gap-1 shrink-0 w-10">
                  <span className="text-[11px] tabular text-muted-foreground">{h.score.toFixed(0)}</span>
                  <span className="w-7 rounded-md" style={{ height: `${12 + h.score * 9}px`, background: scoreColor(h.score), opacity: h.time.slice(0, 13) < nowKey ? 0.35 : 1 }} />
                  <span className="text-[11px] tabular">{h.time.slice(11, 13)}</span>
                  <span className="text-[10px] text-muted-foreground tabular">{Math.round(h.feels)}°</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Next days */}
        {days.length > 1 && (
          <section className="mt-8" aria-labelledby="days-h">
            <h2 id="days-h" className="font-display text-[24px] leading-none">{t("beach.days")}</h2>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {days.map(([ymd, hours], i) => {
                const w = bestWindow(hours);
                const s = w?.top ?? 0;
                const noon = hours.find((h) => h.time.endsWith("13:00")) ?? hours[12];
                return (
                  <div key={ymd} className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-3.5">
                    <p className="text-[13px] text-muted-foreground">{dayName(ymd, i)}</p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-[30px] leading-none tabular" style={{ color: scoreColor(s) }}>{s.toFixed(1)}</span>
                      <span className="text-[13px]">{t(verdictKey(s))}</span>
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full" style={{ width: `${s * 10}%`, background: scoreColor(s) }} /></div>
                    <p className="mt-2 text-[12px] text-muted-foreground tabular">
                      {w?.from ? `${w.from}–${w.to}` : "—"}{noon ? ` · ${Math.round(noon.feels)}°` : ""}{noon?.wave != null ? ` · ${noon.wave.toFixed(1)} m` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr,340px]">
          {/* Beaches with their facilities */}
          <section aria-labelledby="list-h" className="min-w-0">
            <h2 id="list-h" className="font-display text-[24px] leading-none">{t("beach.list")}</h2>
            {city.isError && <p className="mt-3 text-[14px] text-muted-foreground">{t("common.error")}</p>}
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {beaches.map((b) => {
                const s = nearestSea(b);
                const state = seaState(s?.waveHeight ?? null);
                return (
                  <li key={b.name} className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[16px] font-medium leading-snug" dir="auto">{b.name}</h3>
                      {s?.waveHeight != null && (
                        <span className="shrink-0 text-[12px] tabular text-muted-foreground">{s.waveHeight.toFixed(1)} m{state ? ` · ${t(`sea.${state}` as const)}` : ""}</span>
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <Facility on={b.accessible} icon={Accessibility} label={t("fac.accessible")} />
                      <Facility on={!!b.showers} icon={ShowerHead} label={t("fac.showers")} />
                      <Facility on={b.cafe} icon={Coffee} label={t("fac.cafe")} />
                      <Facility on={b.volleyball} icon={CircleDot} label={t("fac.volleyball")} />
                      <Facility on={b.watersport} icon={Sailboat} label={t("fac.watersport")} />
                      <Facility on={b.playground} icon={Baby} label={t("fac.playground")} />
                      <Facility on={b.dogs} icon={Dog} label={t("fac.dogs")} />
                      <Facility on={b.lighting} icon={Lightbulb} label={t("fac.lighting")} />
                      <Facility on={!!b.parking} icon={Car} label={b.parking ?? t("fac.parking")} />
                    </div>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${b.at[1]},${b.at[0]}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-sea hover:underline underline-offset-4">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />{t("live.directions")}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>

          <aside className="space-y-8">
            {/* Jellyfish */}
            <section aria-labelledby="jelly-h">
              <h2 id="jelly-h" className="font-display text-[24px] leading-none">{t("beach.jelly")}</h2>
              {jelly.isError && <p className="mt-3 text-[14px] text-muted-foreground">{t("common.error")}</p>}
              <ul className="mt-3 space-y-2">
                {jellyTlv.map((r) => (
                  <li key={r.region}>
                    <a href={r.link} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-border p-3 hover:bg-secondary/60">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[14px] font-medium leading-snug">{r.region}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${JELLY_STYLE[r.status]}`}>{t(`jelly.${r.status}` as StringKey)}</span>
                      </span>
                      {r.sightings > 0 && <span className="mt-1 block text-[12px] text-muted-foreground">{r.sightings} {t("jelly.reports")}</span>}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {t("jelly.credit")} <a href="https://www.meduzot.co.il/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Meduzot BaAm</a>
              </p>
            </section>

            {/* Flags and lifeguards */}
            <section aria-labelledby="safety-h" className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-4">
              <h2 id="safety-h" className="text-[17px] font-medium">{t("beach.safety")}</h2>
              <ul className="mt-3 space-y-2 text-[14px]">
                <li className="flex items-center gap-2.5"><span className="h-4 w-6 rounded-sm border border-border bg-white" aria-hidden />{t("flag.white")}</li>
                <li className="flex items-center gap-2.5"><span className="h-4 w-6 rounded-sm bg-[#e03131]" aria-hidden />{t("flag.red")}</li>
                <li className="flex items-center gap-2.5"><span className="h-4 w-6 rounded-sm bg-black" aria-hidden />{t("flag.black")}</li>
              </ul>
              <p className="mt-3 text-[13px] text-muted-foreground leading-snug">{t("beach.lifeguards")}</p>
            </section>
            <p className="text-[12px] text-muted-foreground">{t("beach.sources")}</p>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
};

export default Beach;
