import { useEffect, useMemo } from "react";
import { Accessibility, Coffee, Dog, Lightbulb, MapPin, ShowerHead, Sun, CircleDot, Baby, Sailboat, Car } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useBeachForecast, useBeaches, useCityData, useFoodPhotos, useJellyfish, useWeather } from "@/lib/live/hooks";
import { PhotoHero, SectionHead, Stub } from "@/components/postcard/ui";
import { BEACHES, distanceMeters } from "@/lib/live/geo";
import { seaState, type BeachHour, type CityBeach, type JellyStatus } from "@/lib/live/sources";

const verdictKey = (s: number): StringKey =>
  s >= 8 ? "beach.v5" : s >= 6.5 ? "beach.v4" : s >= 4.5 ? "beach.v3" : s >= 2.5 ? "beach.v2" : "beach.v1";

const scoreColor = (s: number) =>
  s >= 8 ? "#0057ff" : s >= 6.5 ? "#4dabf7" : s >= 4.5 ? "#ffcb05" : s >= 2.5 ? "#ff922b" : "#ff5a4e";

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
  const photos = useFoodPhotos();

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
      <PhotoHero
        photo={photos.data?.__city?.hilton?.src}
        alt={lang === "he" ? "חוף הילטון" : "Hilton Beach, Tel Aviv"}
        kicker={t("beach.title")}
        title={forecast.data ? t(verdictKey(headline)) : "…"}
        stamp={forecast.data ? (
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-bold">{lang === "he" ? "ציון החוף היום" : "Beach score today"}</span>
            <span className="font-poster text-[60px] sm:text-[68px]">{headline.toFixed(1)}</span>
            <span className="text-[13px]">{win?.from ? `${t("beach.best")} ${win.from}–${win.to}` : t("beach.notToday")}</span>
          </div>
        ) : undefined}
        band={nowHour && (
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {[
              [`${Math.round(nowHour.feels)}°`, t("now.feels")],
              nowHour.sea != null ? [`${Math.round(nowHour.sea)}°`, t("now.sea")] : null,
              nowHour.wave != null ? [`${nowHour.wave.toFixed(1)} m`, st ? t(`sea.${st}` as const) : ""] : null,
              [`${Math.round(nowHour.wind)}`, "km/h"],
              weather.data ? [`${Math.round(weather.data.uvMax)}`, "UV"] : null,
              weather.data ? [weather.data.sunset.slice(11, 16), t("now.sunset")] : null,
            ].filter(Boolean).map((x) => (
              <div key={x![1] + x![0]} className="flex flex-col">
                <span className="font-poster text-[44px] sm:text-[52px]">{x![0]}</span>
                <span className="text-[14px] font-semibold opacity-90">{x![1]}</span>
              </div>
            ))}
          </div>
        )}
      />

      <div className="container-page">
        {/* Today hour by hour */}
        {today.length > 0 && (
          <section className="mt-12" aria-labelledby="hours-h">
            <SectionHead id="hours-h" title={t("beach.hours")} />
            <div className="mt-5 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-end gap-1.5 overflow-x-auto pb-2">
              {today.filter((h) => h.isDay).map((h) => (
                <div key={h.time} className="flex flex-col items-center gap-1 shrink-0 w-10">
                  <span className="text-[11px] tabular text-muted-foreground">{h.score.toFixed(0)}</span>
                  <span className="w-8 rounded-[4px]" style={{ height: `${16 + h.score * 12}px`, background: scoreColor(h.score), opacity: h.time.slice(0, 13) < nowKey ? 0.35 : 1 }} />
                  <span className="text-[11px] tabular">{h.time.slice(11, 13)}</span>
                  <span className="text-[10px] text-muted-foreground tabular">{Math.round(h.feels)}°</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Next days */}
        {days.length > 1 && (
          <section className="mt-12" aria-labelledby="days-h">
            <SectionHead id="days-h" title={t("beach.days")} />
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {days.map(([ymd, hours], i) => {
                const w = bestWindow(hours);
                const s = w?.top ?? 0;
                const noon = hours.find((h) => h.time.endsWith("13:00")) ?? hours[12];
                return (
                  <Stub key={ymd} i={i} className="p-4 border-t-[3px] border-dashed border-[#0b1a33]">
                    <p className="text-[14px] font-bold">{dayName(ymd, i)}</p>
                    <p className="mt-1 font-poster text-[56px]">{s.toFixed(1)}</p>
                    <p className="text-[14px] font-semibold">{t(verdictKey(s))}</p>
                    <p className="mt-2 text-[13px] tabular">
                      {w?.from ? `${w.from}–${w.to}` : "—"}{noon ? ` · ${Math.round(noon.feels)}°` : ""}{noon?.wave != null ? ` · ${noon.wave.toFixed(1)} m` : ""}
                    </p>
                  </Stub>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr,340px]">
          {/* Beaches with their facilities */}
          <section aria-labelledby="list-h" className="min-w-0">
            <SectionHead id="list-h" title={t("beach.list")} />
            {city.isError && <p className="mt-3 text-[14px] text-muted-foreground">{t("common.error")}</p>}
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {beaches.map((b) => {
                const s = nearestSea(b);
                const state = seaState(s?.waveHeight ?? null);
                return (
                  <li key={b.name} className="rounded-[10px] border-2 border-foreground p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-[20px] leading-tight" dir="auto">{b.name}</h3>
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
              <SectionHead id="jelly-h" title={t("beach.jelly")} />
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
            <section aria-labelledby="safety-h" className="stamp p-4 -rotate-1">
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
