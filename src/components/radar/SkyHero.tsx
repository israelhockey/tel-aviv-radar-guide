import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useBeachForecast, useEventsFeed, useHebrewDate, useShabbat, useWeather } from "@/lib/live/hooks";
import { fmtToday, weatherWord } from "@/lib/live/format";
import { inRange } from "@/lib/live/when";
import { isEveningOut } from "@/lib/live/sources";

/* ---------- the real sky over Tel Aviv, minute by minute ---------- */

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
const shade = (c: RGB, k: number): RGB => c.map((v) => Math.round(v * k)) as RGB;

// Sky colours [top, horizon] at moments relative to sunrise (r) and sunset (s), in minutes.
const SKY: Record<string, [string, string]> = {
  night: ["#070b24", "#1b2350"],
  predawn: ["#1c1d4f", "#7a4b8c"],
  sunrise: ["#3b5ba9", "#ff9e6b"],
  morning: ["#3d8fe0", "#b9e3ff"],
  noon: ["#1f7fe0", "#8fd3ff"],
  afternoon: ["#2f86d6", "#ffe1a8"],
  golden: ["#3f6fc1", "#ffb35c"],
  sunset: ["#4b3a8f", "#ff6f61"],
  dusk: ["#1f1f5c", "#b64f8c"],
};

const keyframes = (sr: number, ss: number): [number, string][] => [
  [sr - 100, "night"], [sr - 35, "predawn"], [sr + 10, "sunrise"], [sr + 90, "morning"],
  [(sr + ss) / 2, "noon"], [ss - 110, "afternoon"], [ss - 35, "golden"], [ss + 8, "sunset"], [ss + 45, "dusk"], [ss + 100, "night"],
];

const skyAt = (m: number, sr: number, ss: number): [RGB, RGB] => {
  const k = keyframes(sr, ss);
  if (m <= k[0][0] || m >= k[k.length - 1][0]) return [hex(SKY.night[0]), hex(SKY.night[1])];
  for (let i = 1; i < k.length; i++) {
    if (m <= k[i][0]) {
      const t = (m - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      const [a, b] = [SKY[k[i - 1][1]], SKY[k[i][1]]];
      return [mix(hex(a[0]), hex(b[0]), t), mix(hex(a[1]), hex(b[1]), t)];
    }
  }
  return [hex(SKY.night[0]), hex(SKY.night[1])];
};

const israelMinutes = (d = new Date()) => {
  const [h, mm] = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d).split(":").map(Number);
  return h * 60 + mm;
};
const toMin = (local?: string) => (local ? Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16)) : null);

/* ---------- a hand-drawn skyline: Jaffa on the left, the towers on the right ---------- */

// [x, width, height] for the low White City blocks between Jaffa and the towers.
const BLOCKS: [number, number, number][] = [
  [262, 34, 38], [298, 46, 52], [346, 30, 34], [378, 52, 60], [432, 38, 44], [472, 44, 70], [518, 36, 48], [556, 58, 56],
  [616, 32, 40], [650, 48, 64], [700, 40, 46], [742, 54, 74], [798, 36, 58], [836, 44, 82], [882, 30, 66],
];
const TOWERS: [number, number, number][] = [
  [918, 38, 120], [960, 44, 150], [1006, 34, 205], [1128, 40, 168], [1238, 46, 158], [1288, 52, 182], [1344, 38, 132], [1386, 54, 108],
];

const Skyline = ({ fill, lit }: { fill: string; lit: boolean }) => {
  const windows = useMemo(() => {
    if (!lit) return [];
    const w: [number, number][] = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (const [x, wd, h] of [...TOWERS, [1056, 44, 190], [1182, 42, 176]] as [number, number, number][]) {
      for (let yy = 220 - h + 10; yy < 212; yy += 9) for (let xx = x + 5; xx < x + wd - 4; xx += 8) if (rnd() > 0.62) w.push([xx, yy]);
    }
    return w;
  }, [lit]);
  return (
    <svg viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 w-full h-[46%] sm:h-[52%]" aria-hidden>
      <g fill={fill}>
        {/* Jaffa hill, St Peter's church and the clock tower */}
        <path d="M0 220 L0 168 Q40 150 92 156 Q150 132 214 152 Q240 158 262 176 L262 220 Z" />
        <rect x="104" y="112" width="16" height="50" /><path d="M100 112 L112 94 L124 112 Z" />
        <rect x="160" y="118" width="26" height="40" /><rect x="166" y="98" width="14" height="22" /><circle cx="173" cy="96" r="7" />
        {BLOCKS.map(([x, w, h]) => <rect key={x} x={x} y={220 - h} width={w} height={h} />)}
        {/* palms along the promenade */}
        {[322, 590, 812].map((x) => (
          <g key={x}>
            <path d={`M${x} 220 Q${x + 4} 180 ${x + 2} 140`} stroke={fill} strokeWidth="4" fill="none" />
            <path d={`M${x + 2} 140 q-24 2 -34 16 q14 -14 34 -12 q-18 -6 -30 -22 q18 10 30 16 q2 -18 16 -26 q-8 14 -12 26 q16 -10 34 -6 q-20 0 -32 10 q22 2 30 18 q-14 -12 -36 -14`} />
          </g>
        ))}
        {TOWERS.map(([x, w, h]) => <rect key={x} x={x} y={220 - h} width={w} height={h} />)}
        <rect x="1022" y="0" width="2" height="16" />
        {/* the Azrieli trio: round, triangle, square */}
        <rect x="1056" y="44" width="44" height="176" /><circle cx="1078" cy="44" r="22" />
        <path d="M1182 220 L1182 50 L1224 38 L1224 220 Z" />
        <rect x="1128" y="52" width="40" height="168" />
      </g>
      {windows.map(([x, y], i) => <rect key={i} x={x} y={y} width="3" height="4" fill="#ffd56b" opacity="0.85" />)}
    </svg>
  );
};

/* ---------- hero ---------- */

export const SkyHero = () => {
  const { t, lang } = useI18n();
  const weather = useWeather();
  const hebrewDate = useHebrewDate();
  const events = useEventsFeed();
  const beach = useBeachForecast();
  const shabbat = useShabbat(lang);
  const [now, setNow] = useState(() => new Date());
  // Dragging the timeline previews the sky (and the city) at another hour today.
  const [preview, setPreview] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const realM = israelMinutes(now);
  const m = preview != null ? preview % 1440 : realM;
  const sr = toMin(weather.data?.sunrise) ?? 6 * 60 + 15;
  const ss = toMin(weather.data?.sunset) ?? 17 * 60 + 30;
  const [top, horizon] = skyAt(m, sr, ss);
  const isNight = m < sr - 20 || m > ss + 30;
  const silhouette = css(mix(shade(horizon, 0.28), [8, 10, 30], isNight ? 0.6 : 0.35));

  // The sun (or moon) on its arc across the sky.
  const dayP = (m - sr) / (ss - sr);
  const nightLen = 1440 - (ss - sr);
  const nightP = ((m - ss + 1440) % 1440) / nightLen;
  const p = dayP >= 0 && dayP <= 1 ? dayP : nightP;
  const orbX = 8 + p * 84;
  const orbY = 64 - Math.sin(Math.PI * Math.min(1, Math.max(0, p))) * 48;
  const sunUp = dayP >= -0.02 && dayP <= 1.02;

  const greeting = m < 300 ? t("sky.night") : m < 720 ? t("sky.morning") : m < 1020 ? t("sky.afternoon") : m < 1320 ? t("sky.evening") : t("sky.night");

  const tonight = (events.data?.events ?? []).filter((e) => isEveningOut(e) && inRange(e.start, e.end, "tonight")).length;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
  const beachHours = (beach.data ?? []).filter((h) => h.time.startsWith(today) && h.isDay);
  const beachScore = beachHours.length ? Math.max(...beachHours.map((h) => h.score)) : null;
  const toSunset = ss - m;
  const toSunrise = (sr - m + 1440) % 1440;
  const candles = shabbat.data?.candles ? new Date(shabbat.data.candles).getTime() : null;
  const hoursToShabbat = candles && candles > now.getTime() ? (candles - now.getTime()) / 3600_000 : null;

  // Timeline runs from 05:00 today to 05:00 tomorrow.
  const T0 = 300;
  const tl = (min: number) => (min < T0 ? min + 1440 : min);
  const tlNow = tl(realM);
  const tlSel = preview ?? tlNow;
  const trackStops = Array.from({ length: 25 }, (_, i) => {
    const mm = (T0 + i * 60) % 1440;
    const [a, b] = skyAt(mm, sr, ss);
    return `${css(mix(a, b, 0.6))} ${(i / 24) * 100}%`;
  }).join(",");
  const pct = (v: number) => `${((v - T0) / 1440) * 100}%`;
  const hh = (v: number) => `${String(Math.floor((v % 1440) / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;

  const selHour = beach.data?.find((h) => h.time.startsWith(today) && Number(h.time.slice(11, 13)) === Math.floor((tlSel % 1440) / 60))
    ?? beach.data?.find((h) => Number(h.time.slice(11, 13)) === Math.floor((tlSel % 1440) / 60) && h.time.slice(0, 10) > today);
  const startingThen = useMemo(() => {
    if (preview == null) return [];
    // Israel midnight today, as an instant, plus the chosen minutes.
    const off = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "shortOffset" }).formatToParts(now).find((x) => x.type === "timeZoneName")?.value.replace("GMT", "") || "+2";
    const midnight = Date.parse(`${today}T00:00:00${off.startsWith("-") ? "-" : "+"}${String(Math.abs(Number(off.split(":")[0]))).padStart(2, "0")}:00`);
    const at = midnight + tlSel * 60_000;
    return (events.data?.events ?? [])
      .filter((e) => isEveningOut(e) && !e.allDay && Math.abs(new Date(e.start).getTime() - at) <= 45 * 60_000)
      .slice(0, 3);
  }, [preview, tlSel, events.data, now]);

  const pills: { text: string; to: string; bg: string }[] = [];
  if (tonight) pills.push({ text: `${tonight} ${t("hero.thingsTonight")}`, to: "/events", bg: "#d6336c" });
  if (toSunset > 0 && toSunset < 180) pills.push({ text: `${t("sky.sunsetIn")} ${toSunset < 60 ? `${toSunset} ${t("live.minutes")}` : `${Math.floor(toSunset / 60)}:${String(toSunset % 60).padStart(2, "0")}`}`, to: "/beach", bg: "#f76707" });
  else if (isNight && toSunrise < 300) pills.push({ text: `${t("sky.sunriseIn")} ${Math.floor(toSunrise / 60)}:${String(toSunrise % 60).padStart(2, "0")}`, to: "/beach", bg: "#f59f00" });
  if (beachScore != null) pills.push({ text: `${t("nav.beach")} ${beachScore.toFixed(1)}/10`, to: "/beach", bg: "#0c8599" });
  if (hoursToShabbat != null && hoursToShabbat < 30) pills.push({ text: `${t("shab.in")} ${Math.round(hoursToShabbat)} ${t("shab.hours")}`, to: "/shabbat", bg: "#5f3dc4" });
  pills.push({ text: t("sky.liveMap"), to: "/live", bg: "#0f1530" });

  const w = weather.data;

  return (
    <section
      className="relative isolate overflow-hidden text-white transition-[background] duration-[2000ms]"
      style={{ background: `linear-gradient(180deg, ${css(top)} 0%, ${css(mix(top, horizon, 0.55))} 52%, ${css(horizon)} 78%)` }}
      aria-labelledby="sky-h"
    >
      {/* sun or moon */}
      <div className="absolute -z-10 pointer-events-none" style={{ left: `${orbX}%`, top: `${orbY}%`, transform: "translate(-50%,-50%)" }} aria-hidden>
        {sunUp ? (
          <span className="block h-20 w-20 sm:h-28 sm:w-28 rounded-full" style={{ background: "radial-gradient(circle, #fff6d5 0%, #ffd56b 45%, rgba(255,180,80,0) 70%)", boxShadow: "0 0 120px 40px rgba(255,200,110,0.35)" }} />
        ) : (
          <span className="block h-12 w-12 sm:h-16 sm:w-16 rounded-full" style={{ background: "#f1f3ff", boxShadow: "inset -10px -4px 0 0 #c9cdea, 0 0 60px 12px rgba(220,225,255,0.25)" }} />
        )}
      </div>
      {isNight && (
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-70" aria-hidden
          style={{ backgroundImage: "radial-gradient(1px 1px at 12% 18%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 28% 8%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 44% 22%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 63% 12%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 78% 26%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 90% 9%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 6% 34%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 54% 36%, #fff 50%, transparent 51%)" }} />
      )}

      <div className="absolute inset-x-0 bottom-[52px] sm:bottom-[64px] top-0 -z-10" aria-hidden>
        <Skyline fill={silhouette} lit={isNight || m > ss - 15} />
      </div>
      {/* the Mediterranean in front of the city, catching the sky */}
      <div className="absolute inset-x-0 bottom-0 h-[52px] sm:h-[64px] -z-10 overflow-hidden" aria-hidden
        style={{ background: `linear-gradient(180deg, ${css(mix(horizon, [12, 60, 120], 0.55))} 0%, ${css(mix(top, [4, 20, 60], 0.5))} 100%)` }}>
        {[18, 36, 58, 74].map((y, i) => (
          <span key={y} className="absolute h-[2px] rounded-full motion-safe:animate-[pulse_5s_ease-in-out_infinite]"
            style={{ top: `${y}%`, left: `${10 + i * 19}%`, width: `${18 + (i % 2) * 14}%`, background: css(mix(horizon, [255, 255, 255], 0.5)), opacity: 0.35, animationDelay: `${i * 0.9}s` }} />
        ))}
      </div>

      {/* The horizon is a timeline: drag to see the sky, the weather and what starts at any hour today */}
      <div className="absolute inset-x-0 bottom-0 h-[52px] sm:h-[64px] z-10">
        <div className="container-page h-full flex items-center gap-3">
          <div className="relative flex-1 h-full flex items-center">
            <div className="absolute inset-x-0 h-2 rounded-sm" style={{ background: `linear-gradient(90deg, ${trackStops})` }} aria-hidden />
            {[sr, ss].map((x, i) => (
              <span key={i} className="absolute -translate-x-1/2 top-1 text-[10px] text-white/80 tabular" style={{ left: pct(tl(x)) }} aria-hidden>{i ? "☾" : "☀"} {hh(x)}</span>
            ))}
            <span className="absolute h-4 w-[2px] bg-white -translate-x-1/2" style={{ left: pct(tlNow) }} aria-hidden />
            <input
              type="range" min={T0} max={T0 + 1439} step={15} value={tlSel}
              onChange={(e) => setPreview(Number(e.target.value))}
              aria-label={t("sky.scrub")}
              aria-valuetext={hh(tlSel)}
              className="radar-scrub relative w-full h-8 bg-transparent appearance-none cursor-grab active:cursor-grabbing"
            />
          </div>
          {preview != null && (
            <button onClick={() => setPreview(null)} className="shrink-0 h-8 rounded-md bg-white text-[#0f1530] px-3 text-[13px] font-semibold">{t("sky.now")}</button>
          )}
        </div>
      </div>

      <div className="container-page relative flex flex-col min-h-[500px] h-[66svh] sm:h-[78svh] max-h-[760px] pt-8 sm:pt-12 pb-[120px] sm:pb-[150px]">
        <p className="flex flex-wrap gap-x-3 text-[14px] text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">
          <span>{fmtToday(lang)}</span>
          {hebrewDate.data && <span lang="he" dir="rtl" className="text-white/70">{hebrewDate.data}</span>}
        </p>
        <h1 id="sky-h" className="mt-2 font-display text-[50px] leading-[0.9] sm:text-[88px] lg:text-[112px] max-w-[12ch] [text-shadow:0_4px_30px_rgba(0,0,0,0.25)]">
          {greeting}
        </h1>
        {preview != null && (
          <div className="mt-4 [text-shadow:0_1px_10px_rgba(0,0,0,0.3)]" aria-live="polite">
            <p className="flex items-baseline gap-3">
              <span className="font-display text-[56px] sm:text-[72px] leading-none tabular">{hh(tlSel)}</span>
              {selHour && <span className="text-[17px] sm:text-[19px] text-white/90">{Math.round(selHour.temp)}°{selHour.isDay && <span className="block text-[14px] text-white/75">{t("nav.beach")} {selHour.score.toFixed(1)}/10</span>}</span>}
            </p>
            {startingThen.length > 0 && (
              <ul className="mt-3 space-y-1 max-w-xl">
                {startingThen.map((e) => (
                  <li key={e.id}><a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md bg-[#0f1530]/80 px-2.5 py-1 text-[14px] hover:bg-[#0f1530]" dir="auto">{e.title}{e.venue ? `, ${e.venue}` : ""}</a></li>
                ))}
              </ul>
            )}
          </div>
        )}
        {w && preview == null && (
          <p className="mt-4 flex items-baseline gap-3 [text-shadow:0_1px_10px_rgba(0,0,0,0.3)]">
            <span className="font-display text-[56px] sm:text-[72px] leading-none tabular">{Math.round(w.temp)}°</span>
            <span className="text-[17px] sm:text-[19px] text-white/90">
              {weatherWord(w.code, lang)}
              <span className="block text-[14px] text-white/75">{t("now.feels")} {Math.round(w.feels)}°</span>
            </span>
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-2">
          {pills.map((x) => (
            <Link key={x.text} to={x.to} className="inline-flex items-center h-9 rounded-md px-3.5 text-[14px] font-medium text-white hover:outline hover:outline-2 hover:outline-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" style={{ background: x.bg }}>
              {x.text}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
