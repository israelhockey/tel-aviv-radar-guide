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
  "now.wholeCoast": { en: "Whole coastline", he: "כל קו החוף" },
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
  "live.rail": { en: "Rail", he: "רכבות" },
  "live.flights": { en: "Flights", he: "טיסות" },
  "live.food": { en: "Open now", he: "פתוח עכשיו" },
  "live.bikes": { en: "Bike docks", he: "תחנות אופניים" },
  "live.beaches": { en: "Beaches", he: "חופים" },
  "live.rain": { en: "Rain radar", he: "מכ״ם גשם" },
  "live.locate": { en: "Near me", he: "לידי" },
  "live.updated": { en: "positions from", he: "מיקומים" },
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
  "bus.trip": { en: "This trip", he: "הנסיעה הזו" },
  "bus.started": { en: "Left", he: "יצא" },
  "bus.scheduled": { en: "Scheduled", he: "מתוכנן" },
  "bus.progress": { en: "Driven", he: "נסע" },
  "bus.of": { en: "of", he: "מתוך" },
  "bus.tripTime": { en: "Whole route", he: "כל המסלול" },
  "bus.loadingRoute": { en: "Loading the route…", he: "טוען מסלול…" },
  "bus.legend": { en: "Solid: driven so far · Dashed: still to come", he: "קו מלא: מה שנסע · מקווקו: מה שנשאר" },
  "bus.vehicle": { en: "Vehicle", he: "רכב" },
  "bus.showLine": { en: "Show only this line", he: "רק הקו הזה" },
  "bus.showAll": { en: "Show all buses", he: "כל האוטובוסים" },
  "where.button": { en: "Where to?", he: "לאן?" },
  "where.placeholder": { en: "Address or place, e.g. Azrieli", he: "כתובת או מקום, למשל עזריאלי" },
  "where.from": { en: "From", he: "מ־" },
  "where.myLocation": { en: "my location", he: "המיקום שלי" },
  "where.mapCentre": { en: "the map centre", he: "מרכז המפה" },
  "where.go": { en: "Find buses", he: "חיפוש" },
  "where.searching": { en: "Checking which lines run there…", he: "בודקים אילו קווים מגיעים…" },
  "where.notFound": { en: "Couldn't find that place. Try a street and number.", he: "לא מצאנו את המקום. נסו רחוב ומספר." },
  "where.none": { en: "No direct bus seen between these points in the last 3 hours. A trip planner can find a route with a change.", he: "לא נראה קו ישיר בין הנקודות ב־3 השעות האחרונות. מתכנן מסלולים ימצא מסלול עם החלפה." },
  "where.lines": { en: "Direct lines", he: "קווים ישירים" },
  "where.coming": { en: "on the way to you", he: "בדרך אליך" },
  "where.nearest": { en: "nearest", he: "הקרוב" },
  "where.kmAway": { en: "km before your stop", he: "ק״מ לפני התחנה שלך" },
  "where.ride": { en: "km ride", he: "ק״מ נסיעה" },
  "where.note": { en: "Bus positions run about 20 minutes behind. For exact times use a trip planner:", he: "מיקומי האוטובוסים מתעכבים בכ־20 דקות. לזמנים מדויקים:" },
  "where.clear": { en: "Clear", he: "ניקוי" },
  "flight.from": { en: "From", he: "מ־" },
  "flight.to": { en: "To", he: "אל" },
  "flight.aircraft": { en: "Aircraft", he: "מטוס" },
  "flight.reg": { en: "Registration", he: "רישום" },
  "flight.climbing": { en: "climbing", he: "מטפס" },
  "flight.descending": { en: "descending", he: "יורד" },
  "flight.level": { en: "level", he: "גובה קבוע" },
  "flight.photo": { en: "Photo", he: "צילום" },
  "flight.track": { en: "Track on adsb.lol", he: "מעקב ב־adsb.lol" },
  "flight.emergency": { en: "Emergency code", he: "קוד חירום" },
  "flight.ground": { en: "On the ground", he: "על הקרקע" },

  // beach verdicts
  "sea.calm": { en: "Calm", he: "שקט" },
  "sea.light": { en: "Light waves", he: "גלים קלים" },
  "sea.choppy": { en: "Choppy", he: "גלי" },
  "sea.rough": { en: "Rough", he: "סוער" },


  // hero
  "hero.title": { en: "Tel Aviv, right now", he: "תל אביב, עכשיו" },
  "hero.eventsTonight": { en: "events tonight", he: "אירועים הערב" },
  "hero.tonightTitle": { en: "Tonight in Tel Aviv", he: "הערב בתל אביב" },
  "hero.weekTitle": { en: "This week in Tel Aviv", he: "השבוע בתל אביב" },
  "hero.thingsTonight": { en: "things on tonight", he: "אירועים הערב" },
  "hero.thingsWeek": { en: "things on this week", he: "אירועים השבוע" },
  "hero.seeTonight": { en: "See what's on tonight", he: "מה קורה הערב" },

  // what's on
  "on.title": { en: "What's on in Tel Aviv", he: "מה קורה בתל אביב" },
  "on.tonight": { en: "Tonight", he: "הערב" },
  "on.tomorrow": { en: "Tomorrow", he: "מחר" },
  "on.weekend": { en: "This weekend", he: "סוף השבוע" },
  "on.week": { en: "Next 7 days", he: "7 הימים הקרובים" },
  "on.all": { en: "Everything", he: "הכל" },
  "on.free": { en: "Free", he: "חינם" },
  "on.from": { en: "from", he: "החל מ־" },
  "on.tickets": { en: "Tickets", he: "כרטיסים" },
  "on.empty": { en: "Nothing listed for this time yet. Try a wider range.", he: "עוד אין אירועים לזמן הזה. נסו טווח רחב יותר." },
  "on.sources": { en: "Listings from the City of Tel Aviv-Yafo, Tickchak, Leaan and Meetup, refreshed every two hours. Always check the event page before you go.", he: "האירועים מעיריית תל אביב-יפו, טיקצ'אק, לאן ומיטאפ, מתעדכנים כל שעתיים. כדאי לבדוק בעמוד האירוע לפני שיוצאים." },
  "on.count": { en: "events", he: "אירועים" },
  "cat.music": { en: "Music", he: "מוזיקה" },
  "cat.comedy": { en: "Stand-up", he: "סטנדאפ" },
  "cat.theatre": { en: "Theatre", he: "תיאטרון" },
  "cat.party": { en: "Parties", he: "מסיבות" },
  "cat.family": { en: "Family", he: "משפחה" },
  "cat.talk": { en: "Talks", he: "הרצאות" },
  "cat.festival": { en: "Festivals", he: "פסטיבלים" },
  "cat.sport": { en: "Sport", he: "ספורט" },
  "cat.meetup": { en: "Meetups", he: "מיטאפים" },
  "cat.art": { en: "Art", he: "אמנות" },
  "cat.market": { en: "Markets & fairs", he: "שווקים וירידים" },
  "cat.community": { en: "Classes & community", he: "חוגים וקהילה" },
  "cat.other": { en: "Other", he: "אחר" },

  // news
  "news.title": { en: "Tel Aviv news", he: "חדשות תל אביב" },
  "news.body": { en: "Headlines about the city from Israeli news sites. Each links to the full story at the source.", he: "כותרות על העיר מאתרי החדשות בישראל. כל כותרת מובילה לכתבה המלאה במקור." },
  "news.all": { en: "All", he: "הכל" },
  "news.he": { en: "Hebrew", he: "עברית" },
  "news.en": { en: "English", he: "אנגלית" },
  "news.empty": { en: "No Tel Aviv headlines in the last few days.", he: "אין כותרות על תל אביב בימים האחרונים." },
  "news.today": { en: "Today", he: "היום" },
  "news.yesterday": { en: "Yesterday", he: "אתמול" },

  // live map events
  "live.events": { en: "Tonight's events", he: "אירועים הערב" },

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
