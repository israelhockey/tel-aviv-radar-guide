import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "he";

const STRINGS = {
  // navigation
  "nav.now": { en: "Now", he: "עכשיו" },
  "nav.live": { en: "Live map", he: "מפה חיה" },
  "nav.whatson": { en: "What's on", he: "מה קורה" },
  "nav.news": { en: "News", he: "חדשות" },
  "nav.more": { en: "More", he: "עוד" },
  "nav.food": { en: "Food & drink", he: "אוכל ושתייה" },
  "nav.nightlife": { en: "Nightlife", he: "חיי לילה" },
  "nav.weekend": { en: "Weekend", he: "סוף שבוע" },
  "nav.free": { en: "Free", he: "בחינם" },
  "nav.newsletter": { en: "Weekly email", he: "מייל שבועי" },
  "nav.submit": { en: "Submit an event", he: "הוספת אירוע" },
  "lang.switch": { en: "עברית", he: "English" },

  // now screen
  "now.city": { en: "Tel Aviv-Yafo", he: "תל אביב-יפו" },
  "now.air": { en: "Air", he: "אוויר" },
  "now.feels": { en: "feels", he: "מורגש" },
  "now.sea": { en: "Sea", he: "ים" },
  "now.waves": { en: "waves", he: "גלים" },
  "now.wind": { en: "Wind", he: "רוח" },
  "now.aqi": { en: "Air quality", he: "איכות אוויר" },
  "now.uv": { en: "UV today", he: "UV היום" },
  "now.sunset": { en: "Sunset", he: "שקיעה" },
  "now.sunrise": { en: "Sunrise", he: "זריחה" },
  "now.tonight": { en: "Tonight", he: "הערב" },
  "now.tonightEmpty": { en: "No events listed for tonight yet. See the full week instead.", he: "עוד לא נוספו אירועים להערב. אפשר לראות את כל השבוע." },
  "now.seeWeek": { en: "See this week", he: "לכל השבוע" },
  "now.news": { en: "Know this today", he: "כדאי לדעת היום" },
  "now.newsEmpty": { en: "No briefs published yet today.", he: "עוד לא פורסמו עדכונים היום." },
  "now.allNews": { en: "All news", he: "לכל החדשות" },
  "now.beaches": { en: "Beaches right now", he: "החופים עכשיו" },
  "now.beachesNote": { en: "Wave model data, not a lifeguard report. Swim only at staffed beaches.", he: "נתוני מודל גלים, לא דיווח מציל. רוחצים רק בחופים מוכרזים." },
  "now.liveTitle": { en: "The city, live", he: "העיר, בשידור חי" },
  "now.liveBody": { en: "Buses, planes, open kitchens and the sea on one map.", he: "אוטובוסים, מטוסים, מקומות פתוחים והים על מפה אחת." },
  "now.openLive": { en: "Open the live map", he: "לפתיחת המפה החיה" },
  "now.busesMoving": { en: "buses on the road", he: "אוטובוסים בדרכים" },
  "now.planes": { en: "aircraft in the area", he: "מטוסים באזור" },
  "now.openNear": { en: "Open near you", he: "פתוח לידך" },
  "now.openNearBody": { en: "Cafés, bars and restaurants open right now, nearest first.", he: "בתי קפה, ברים ומסעדות שפתוחים עכשיו, הקרובים קודם." },
  "now.useLocation": { en: "Use my location", he: "לפי המיקום שלי" },
  "now.locating": { en: "Finding places…", he: "מחפשים מקומות…" },
  "now.locationDenied": { en: "Location is off, so this list starts from Dizengoff Square.", he: "המיקום כבוי, לכן הרשימה מתחילה מכיכר דיזנגוף." },
  "now.closesAt": { en: "until", he: "עד" },
  "now.walk": { en: "min walk", he: "דק׳ הליכה" },

  // shabbat
  "shabbat.title": { en: "Shabbat", he: "שבת" },
  "shabbat.candles": { en: "Candle lighting", he: "הדלקת נרות" },
  "shabbat.ends": { en: "Shabbat ends", he: "צאת השבת" },
  "shabbat.note": { en: "Most buses and the light rail stop from Friday afternoon. The city's free Naim BaSofash shuttles run on Shabbat.", he: "רוב האוטובוסים והרכבת הקלה לא פועלים משישי אחה״צ. שאטלי ״נעים בסופ״ש״ של העירייה פועלים בשבת." },

  // live map
  "live.buses": { en: "Buses", he: "אוטובוסים" },
  "live.flights": { en: "Flights", he: "טיסות" },
  "live.food": { en: "Open now", he: "פתוח עכשיו" },
  "live.bikes": { en: "Bike docks", he: "תחנות אופניים" },
  "live.beaches": { en: "Beaches", he: "חופים" },
  "live.rain": { en: "Rain radar", he: "מכ״ם גשם" },
  "live.locate": { en: "Near me", he: "לידי" },
  "live.updated": { en: "updated", he: "עודכן" },
  "live.ago": { en: "ago", he: "לפני" },
  "live.minutes": { en: "min", he: "דק׳" },
  "live.loading": { en: "loading", he: "טוען" },
  "live.unavailable": { en: "source not responding", he: "המקור לא מגיב" },
  "live.line": { en: "Line", he: "קו" },
  "live.speed": { en: "Speed", he: "מהירות" },
  "live.altitude": { en: "Altitude", he: "גובה" },
  "live.position": { en: "Position from", he: "מיקום מלפני" },
  "live.open": { en: "Open", he: "פתוח" },
  "live.closed": { en: "Closed", he: "סגור" },
  "live.hoursUnknown": { en: "Hours not listed", he: "שעות לא ידועות" },
  "live.hours": { en: "Hours", he: "שעות" },
  "live.directions": { en: "Directions", he: "הוראות הגעה" },
  "live.kosher": { en: "Kosher", he: "כשר" },
  "live.vegan": { en: "Vegan options", he: "אפשרויות טבעוניות" },
  "live.sources": { en: "Data: Open Bus (Hasadna), adsb.lol, OpenStreetMap, Open-Meteo, RainViewer", he: "נתונים: אוטובוס פתוח (הסדנא), adsb.lol, OpenStreetMap, Open-Meteo, RainViewer" },
  "live.dockBikes": { en: "Bike rental dock", he: "תחנת השכרת אופניים" },
  "live.close": { en: "Close", he: "סגירה" },

  // beach verdicts
  "sea.calm": { en: "Calm", he: "שקט" },
  "sea.light": { en: "Light waves", he: "גלים קלים" },
  "sea.choppy": { en: "Choppy", he: "גלי" },
  "sea.rough": { en: "Rough", he: "סוער" },

  // common
  "common.loading": { en: "Loading…", he: "טוען…" },
  "common.error": { en: "This source isn't responding right now. It retries on its own.", he: "המקור לא מגיב כרגע. ננסה שוב אוטומטית." },
  "common.source": { en: "Source", he: "מקור" },
} as const;

export type StringKey = keyof typeof STRINGS;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: StringKey) => string; dir: "ltr" | "rtl"; locale: string };

const I18nContext = createContext<Ctx | null>(null);

const readStored = (): Lang => {
  try {
    const v = localStorage.getItem("radar.lang");
    if (v === "he" || v === "en") return v;
  } catch { /* storage unavailable */ }
  return typeof navigator !== "undefined" && navigator.language?.startsWith("he") ? "he" : "en";
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(readStored);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("radar.lang", l); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    dir: lang === "he" ? "rtl" : "ltr",
    locale: lang === "he" ? "he-IL" : "en-GB",
    t: (k) => STRINGS[k]?.[lang] ?? String(k),
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
};
