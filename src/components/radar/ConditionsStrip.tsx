import type { ReactNode } from "react";
import { Navigation } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAir, useBeaches, useWeather } from "@/lib/live/hooks";
import { aqiWord, compass, fmtLocalClock, weatherWord } from "@/lib/live/format";

// The city's vital signs in one row: big numbers, short labels, nothing decorative.
export const ConditionsStrip = () => {
  const { t, lang } = useI18n();
  const weather = useWeather();
  const air = useAir();
  const beaches = useBeaches();

  // City-wide sea reading = the Gordon/Frishman stretch, the middle of the shoreline.
  const sea = beaches.data?.find((b) => b.id === "gordon") ?? beaches.data?.find((b) => b.seaTemp != null);
  const w = weather.data;

  const cells: { label: string; value: string; sub?: ReactNode }[] = [
    {
      label: t("now.air"),
      value: w ? `${Math.round(w.temp)}°` : "–",
      sub: w ? `${weatherWord(w.code, lang)} · ${t("now.feels")} ${Math.round(w.feels)}°` : undefined,
    },
    {
      label: t("now.sea"),
      value: sea?.seaTemp != null ? `${Math.round(sea.seaTemp)}°` : "–",
      sub: sea?.waveHeight != null ? `${t("now.waves")} ${sea.waveHeight.toFixed(1)} m` : undefined,
    },
    {
      label: t("now.wind"),
      value: w ? `${Math.round(w.windKmh)}` : "–",
      sub: w ? (
        <span className="inline-flex items-center gap-1">
          km/h {compass(w.windDir, lang)}
          {/* Arrow points where the wind is blowing to. */}
          <Navigation className="h-3 w-3" style={{ transform: `rotate(${w.windDir + 180 - 45}deg)` }} aria-hidden />
        </span>
      ) : undefined,
    },
    {
      label: t("now.aqi"),
      value: air.data?.aqi != null ? String(Math.round(air.data.aqi)) : "–",
      sub: air.data?.aqi != null ? aqiWord(air.data.aqi, lang) : undefined,
    },
    {
      label: t("now.uv"),
      value: w ? String(Math.round(w.uvMax)) : "–",
      sub: w ? `${t("now.sunrise")} ${fmtLocalClock(w.sunrise)}` : undefined,
    },
    {
      label: t("now.sunset"),
      value: w ? fmtLocalClock(w.sunset) : "–",
    },
  ];

  return (
    <dl className="grid grid-cols-3 lg:grid-cols-6 border-y border-border">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`py-4 px-3 sm:px-4 ${i % 3 !== 0 ? "border-s border-border" : ""} ${i >= 3 ? "border-t lg:border-t-0" : ""} ${i === 3 ? "lg:border-s" : ""}`}
        >
          <dt className="text-[12px] text-muted-foreground">{c.label}</dt>
          <dd className="mt-1 text-[28px] sm:text-[34px] font-medium leading-none tabular">{c.value}</dd>
          {c.sub && <dd className="mt-2 text-[12px] text-muted-foreground leading-snug">{c.sub}</dd>}
        </div>
      ))}
    </dl>
  );
};
