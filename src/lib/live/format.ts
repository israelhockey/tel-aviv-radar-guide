import type { Lang } from "@/lib/i18n";

const TZ = "Asia/Jerusalem";

export const fmtClock = (d: string | Date, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(typeof d === "string" ? new Date(d) : d);

// Open-Meteo returns local times without an offset ("2026-10-18T17:24"); read them as Israel time.
export const fmtLocalClock = (s: string) => s.slice(11, 16);

export const fmtToday = (lang: Lang) =>
  new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date());

export const fmtDayTime = (d: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(d));

export const minutesAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

const WEATHER: [number[], string, string][] = [
  [[0], "Clear", "בהיר"],
  [[1, 2], "Partly cloudy", "מעונן חלקית"],
  [[3], "Overcast", "מעונן"],
  [[45, 48], "Fog", "ערפל"],
  [[51, 53, 55, 56, 57], "Drizzle", "טפטוף"],
  [[61, 63, 65, 66, 67], "Rain", "גשם"],
  [[71, 73, 75, 77, 85, 86], "Snow", "שלג"],
  [[80, 81, 82], "Showers", "ממטרים"],
  [[95, 96, 99], "Thunderstorms", "סופות רעמים"],
];

export const weatherWord = (code: number, lang: Lang) => {
  const row = WEATHER.find(([codes]) => codes.includes(code));
  return row ? (lang === "he" ? row[2] : row[1]) : "";
};

// European AQI bands.
export const aqiWord = (aqi: number, lang: Lang) => {
  const bands: [number, string, string][] = [
    [20, "Good", "טובה"], [40, "Fair", "סבירה"], [60, "Moderate", "בינונית"],
    [80, "Poor", "ירודה"], [100, "Very poor", "ירודה מאוד"], [Infinity, "Extremely poor", "גרועה"],
  ];
  const b = bands.find(([max]) => aqi <= max)!;
  return lang === "he" ? b[2] : b[1];
};

const COMPASS_EN = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const COMPASS_HE = ["צפונית", "צפון-מזרחית", "מזרחית", "דרום-מזרחית", "דרומית", "דרום-מערבית", "מערבית", "צפון-מערבית"];
export const compass = (deg: number, lang: Lang) => (lang === "he" ? COMPASS_HE : COMPASS_EN)[Math.round(deg / 45) % 8];

export const fmtWeekday = (d: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { timeZone: TZ, weekday: "long" }).format(new Date(d));
