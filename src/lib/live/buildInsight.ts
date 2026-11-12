// Making the city's building records understandable: how disruptive each item is likely to be,
// whether its status still looks current, and an English reading of the Hebrew request text.
import type { Activity } from "./build";

type T = { en: string; he: string };
const YEAR = 365 * 864e5;

/* ---------------- impact: how much noise and disruption to expect ---------------- */

export type Impact = { score: number; level: "high" | "medium" | "low" | "none"; reasons: T[] };

const stageOf = (a: Activity) => a.stage ?? "";

export const impactOf = (a: Activity, now = Date.now()): Impact => {
  const reasons: T[] = [];
  let base = 0;
  const s = stageOf(a);
  const t = `${a.title} ${a.detail ?? ""}`;

  if (a.kind === "night") { base = 8; reasons.push({ en: "Approved to work at night", he: "אישור לעבודה בלילה" }); }
  else if (a.kind === "road") {
    base = /הרמטית/.test(s) ? 7 : 5;
    reasons.push(/הרמטית/.test(s) ? { en: "Road fully closed", he: "חסימה מלאה של הכביש" } : { en: "Lanes reduced", he: "צמצום נתיבים" });
    if (/לילה/.test(a.hours ?? "")) { base += 1; reasons.push({ en: "Includes night work", he: "כולל עבודות לילה" }); }
  } else if (a.kind === "rail") {
    if (/התארגנות/.test(a.title)) { base = 7; reasons.push({ en: "Light rail works compound: trucks, cranes and work around the clock at times", he: "מתחם עבודה של הרכבת הקלה: משאיות, מנופים ולעיתים עבודה מסביב לשעון" }); }
    else if (/תחנת/.test(a.title)) { base = /תחתית|תת/.test(s) ? 7 : 5; reasons.push(/תחתית|תת/.test(s) ? { en: "Underground station: years of excavation", he: "תחנה תת־קרקעית: שנים של חפירות" } : { en: "Street-level station: the street is dug up and rebuilt", he: "תחנה עילית: הרחוב נחפר ונבנה מחדש" }); }
    else if (/מנהור|תת"ק|תת קרקע/.test(`${a.detail ?? ""}`)) { base = 5; reasons.push({ en: "Tunnel section: most work is underground, with shafts and trucks at the surface", he: "קטע מנהור: רוב העבודה מתחת לאדמה, עם פירים ומשאיות על פני השטח" }); }
    else { base = 6; reasons.push({ en: "Street-level track: lanes closed and the road rebuilt", he: "מסילה עילית: נתיבים נסגרים והרחוב נבנה מחדש" }); }
  } else if (a.kind === "business") {
    if (/בר|פאב|מועדון|דיסקוטק|מסיבות|אולם אירועים|מוסיקה|מוזיקה|הופעות/.test(t)) { base = 5; reasons.push({ en: "Newly licensed bar, club or venue: late-night noise and crowds possible", he: "מקום בילוי שקיבל רישיון לאחרונה: ייתכנו רעש וקהל בלילה" }); }
    else if (/מסעדה|בית אוכל|קפה|מזון/.test(t)) { base = 2; reasons.push({ en: "New restaurant or café: deliveries, extraction fans, outside seating", he: "מסעדה או בית קפה חדש: פריקות, מנדפים, ישיבה בחוץ" }); }
    else { base = 1; reasons.push({ en: "New business licence nearby", he: "רישיון עסק חדש בסביבה" }); }
  } else if (a.kind === "zone") {
    base = /2:00|3:00|ללא/.test(s) ? 4 : 3; reasons.push({ en: "Nightlife zone: venues here may legally stay open late", he: "אזור בילוי: מקומות כאן רשאים לפתוח עד שעה מאוחרת" });
  } else if (a.kind === "danger") { base = 2; reasons.push({ en: "Safety order on the building; repairs or scaffolding likely", he: "צו בטיחות למבנה; צפויים תיקונים או פיגומים" }); }
  else if (a.kind === "plan") { base = 1; reasons.push({ en: "A plan only: sets what may be built here in future", he: "תכנית בלבד: קובעת מה ניתן לבנות בעתיד" }); }
  else if (a.kind === "site") {
    if (/יסודות|חפירה|דיפון|הריסה|תחילת עבודות/.test(s)) { base = 8; reasons.push({ en: "Early works: demolition, digging or foundations are the loudest phase", he: "שלב ראשוני: הריסה, חפירה או יסודות הם השלב הרועש ביותר" }); }
    else if (/שלד/.test(s)) { base = 7; reasons.push({ en: "Frame going up: concrete pours, cranes, trucks", he: "בניית שלד: יציקות, מנופים ומשאיות" }); }
    else if (/גמר/.test(s)) { base = 4; reasons.push({ en: "Finishing works: quieter, mostly indoors", he: "עבודות גמר: שקט יותר, בעיקר בפנים" }); }
    else { base = 6; reasons.push({ en: "Active building site", he: "אתר בניה פעיל" }); }
    if (a.hours) { base += 1; reasons.push({ en: "Night work approved on this site", he: "אושרה עבודת לילה באתר" }); }
  } else if (a.kind === "permit") {
    if (/תעודת גמר|אכלוס/.test(s)) { base = 0; reasons.push({ en: "Finished", he: "הסתיים" }); }
    else if (/בבניה/.test(s)) { base = 7; reasons.push({ en: "Under construction now", he: "בבניה כעת" }); }
    else if (/קיים היתר/.test(s)) { base = 5; reasons.push({ en: "Approved: works can start", he: "אושר: אפשר להתחיל לעבוד" }); }
    else { base = 2; reasons.push({ en: "Still a request: nothing on site yet", he: "עדיין בקשה: אין עבודות בשטח" }); }
    if (base > 0) {
      if (/הריסה|בניה חדשה|הקמת מבנה חדש/.test(t)) { base += 2; reasons.push({ en: "Demolition and a new building: months of heavy works", he: "הריסה ובניין חדש: חודשים של עבודות כבדות" }); }
      else if (a.tama38) { base += 1; reasons.push({ en: "TAMA 38: strengthening and new floors on a lived-in building", he: "תמ״א 38: חיזוק והוספת קומות בבניין מאוכלס" }); }
      else if (/שימוש חורג|שינויים|הארכת תוקף/.test(t)) { base -= 1; reasons.push({ en: "Small-scale change", he: "שינוי בהיקף קטן" }); }
      if ((a.units ?? 0) >= 20) { base += 2; reasons.push({ en: `${a.units} homes: a big project`, he: `${a.units} יח״ד: פרויקט גדול` }); }
      else if ((a.units ?? 0) >= 8) { base += 1; reasons.push({ en: `${a.units} homes`, he: `${a.units} יח״ד` }); }
      if (/מרתף|מרתפים|חניון/.test(a.detail ?? "")) { base += 1; reasons.push({ en: "Basement digging", he: "חפירת מרתף" }); }
    }
  }

  // Closer is louder.
  const near = a.distance < 40 ? 1 : a.distance < 120 ? 0.85 : a.distance < 250 ? 0.65 : 0.5;
  if (a.distance < 40 && a.kind !== "zone") reasons.push({ en: "Right next door", he: "ממש בסמוך" });
  // Something whose dates have passed is probably done or paused.
  const stale = statusCheck(a, now).some((f) => f.downgrade);
  const score = Math.max(0, Math.min(10, Math.round(base * near * (stale ? 0.5 : 1))));
  const level = score >= 7 ? "high" : score >= 4 ? "medium" : score >= 1 ? "low" : "none";
  return { score, level, reasons };
};

export const IMPACT_STYLE: Record<Impact["level"], { bg: string; fg: string; en: string; he: string }> = {
  high: { bg: "#ff5a4e", fg: "#ffffff", en: "High impact", he: "השפעה גבוהה" },
  medium: { bg: "#ffcb05", fg: "#0b1a33", en: "Medium impact", he: "השפעה בינונית" },
  low: { bg: "#d3f9d8", fg: "#0b1a33", en: "Low impact", he: "השפעה נמוכה" },
  none: { bg: "#e9ecef", fg: "#0b1a33", en: "No impact", he: "ללא השפעה" },
};

/* ---------------- status reality check ---------------- */

export type Flag = T & { downgrade?: boolean; tone: "warn" | "info" };

/** Notes that explain dates that look odd, like a permit "valid until 2024" in 2026. */
export const statusCheck = (a: Activity, now = Date.now()): Flag[] => {
  const out: Flag[] = [];
  const s = stageOf(a);
  const y = (ms: number) => new Date(ms + 3 * 3600e3).getUTCFullYear();
  if (a.kind === "permit") {
    if (a.expires && a.expires < now) {
      if (/בבניה/.test(s)) out.push({ tone: "info", en: `The permit's deadline (${y(a.expires)}) has passed, but the city lists it as under construction. Permits mainly set a deadline to start work, so building can legally continue after it.`, he: `מועד תוקף ההיתר (${y(a.expires)}) עבר, אבל העירייה מציגה שהבניה בעיצומה. ההיתר קובע בעיקר מועד לתחילת עבודות, כך שהבניה יכולה להימשך גם אחריו.` });
      else if (/קיים היתר/.test(s)) out.push({ tone: "warn", downgrade: true, en: `Approved, but the permit ran out in ${y(a.expires)} and the city has no record of work starting. The project may have stalled or be waiting for an extension.`, he: `אושר, אבל תוקף ההיתר פג ב-${y(a.expires)} ואין רישום של תחילת עבודות. ייתכן שהפרויקט נעצר או ממתין להארכה.` });
    }
    if (/בתהליך/.test(s) && a.opened && now - a.opened > 3 * YEAR) out.push({ tone: "warn", downgrade: true, en: `Requested in ${y(a.opened)} and still under review after ${Math.floor((now - a.opened) / YEAR)} years. Long-running requests often stall; it may never be built.`, he: `הוגשה ב-${y(a.opened)} ועדיין בבדיקה אחרי ${Math.floor((now - a.opened) / YEAR)} שנים. בקשות ארוכות נתקעות לא פעם; ייתכן שלא תמומש.` });
    if (/בבניה/.test(s) && a.start && now - a.start > 4 * YEAR) out.push({ tone: "info", en: `Construction started in ${y(a.start)}. Big projects take 3 to 4 years; this one may be near the end.`, he: `הבניה התחילה ב-${y(a.start)}. פרויקטים גדולים נמשכים 3–4 שנים; ייתכן שהוא לקראת סיום.` });
  }
  if ((a.kind === "night" || a.kind === "road") && a.end && a.end < now - 7 * 864e5) out.push({ tone: "warn", downgrade: true, en: `Scheduled to end on ${new Date(a.end).toLocaleDateString("en-GB")}. The city still lists it, so it may have been extended, or the listing hasn't been cleared yet.`, he: `היה אמור להסתיים ב-${new Date(a.end).toLocaleDateString("he-IL")}. העירייה עדיין מציגה אותו, כך שייתכן שהוארך או שהרישום טרם עודכן.` });
  if ((a.kind === "night" || a.kind === "road") && a.start && a.start > now) out.push({ tone: "info", en: `Starts on ${new Date(a.start).toLocaleDateString("en-GB")}.`, he: `מתחיל ב-${new Date(a.start).toLocaleDateString("he-IL")}.` });
  return out;
};

/** Where a permit is on the road from request to finished building. */
export const PERMIT_STEPS: T[] = [
  { en: "Requested", he: "הוגשה" },
  { en: "Approved", he: "אושרה" },
  { en: "Building", he: "בבניה" },
  { en: "Finished", he: "הסתיים" },
];
export const permitStep = (a: Activity) => {
  const s = stageOf(a);
  return /תעודת גמר|אכלוס/.test(s) ? 3 : /בבניה/.test(s) ? 2 : /קיים היתר/.test(s) ? 1 : 0;
};

/* ---------------- reading the Hebrew request text ---------------- */

const WORDS: [RegExp, string][] = [
  [/כמות מקומות חניה/g, "parking spaces"], [/מקומות חניה/g, "parking spaces"], [/גדר בגבולות מגרש בגובה \(מטר\)/g, "boundary fence, height (m)"],
  [/בגבולות מגרש/g, "on the plot boundary"], [/מרתף אחד בלבד/g, "one basement level"], [/בלבד/g, "only"], [/אחד/g, "one"],
  [/כמות קומות מגורים/g, "residential floors"], [/כמות יח"ד מבוקשות/g, "homes requested"], [/כמות/g, "number of"], [/קומות/g, "floors"],
  [/ממ"ד|ממ״ד|ממדים|ממ"דים/g, "safe room"], [/מרחב מוגן קומתי|ממ"ק/g, "shared safe room"], [/מקלט/g, "shelter"],
  [/מחסנים|מחסן/g, "storage room"], [/חדרי עזר|חדר עזר/g, "utility room"], [/חדר אשפה/g, "refuse room"], [/חדר גז/g, "gas room"],
  [/חדר משחקים/g, "playroom"], [/חדר כושר/g, "gym"], [/חדר טכני|חדרים טכניים/g, "technical room"], [/חדר אופניים/g, "bike room"],
  [/חדרי יציאה|חדר יציאה לגג|חדר על הגג/g, "rooftop room"], [/קולטי שמש/g, "solar water heaters"], [/פרגולה/g, "pergola"],
  [/גינה/g, "garden"], [/שטחים מרוצפים/g, "paved areas"], [/גדר/g, "fence"], [/בריכה/g, "pool"], [/מעלית/g, "lift"],
  [/לובי/g, "lobby"], [/מרפסות|מרפסת/g, "balcony"], [/דירת גן/g, "garden flat"], [/דירה|דירות/g, "flat"], [/פנטהאוז|דירת גג/g, "penthouse"],
  [/משרדים/g, "offices"], [/מסחר|חנויות|חנות/g, "shops"], [/מסעדה/g, "restaurant"], [/גן ילדים/g, "nursery"], [/מלונאות|מלון/g, "hotel"],
  [/חניון|חניה|מקומות חניה/g, "parking"], [/מרתפים|מרתף/g, "basement"], [/מטבח/g, "kitchen"], [/שירותים/g, "toilets"], [/חדר מדרגות/g, "stairwell"],
  [/אחר/g, "other"],
];
export const roughEnglish = (he: string) => {
  let s = he;
  for (const [re, en] of WORDS) s = s.replace(re, en);
  return /[א-ת]/.test(s) ? null : s; // only when every word was understood
};

const num = (re: RegExp, text: string) => {
  const m = re.exec(text);
  return m ? Number(m[1].replace(/,/g, "")) : null;
};

/** Plain facts pulled out of the request text, in both languages. */
export const requestFacts = (text?: string): T[] => {
  if (!text) return [];
  const t = text.replace(/\s+/g, " ");
  const out: T[] = [];
  const demoFloors = num(/מספר קומות להריסה:\s*(\d+)/, t) ?? num(/הריסת מבנה קיים הכולל\s*(\d+)\s*קומות/, t);
  if (demoFloors != null || /הריסה|הריסת/.test(t)) out.push({ en: `Demolition${demoFloors ? ` of a ${demoFloors}-storey building` : " of an existing building"}`, he: `הריסה${demoFloors ? ` של מבנה בן ${demoFloors} קומות` : " של מבנה קיים"}` });
  if (/הקמת מבנה חדש|בניה חדשה/.test(t)) out.push({ en: "A new building", he: "בניין חדש" });
  const floors = num(/כמות קומות מגורים:\s*(\d+)/, t) ?? num(/(\d+)\s*קומות מגורים/, t);
  if (floors) out.push({ en: `${floors} residential floors`, he: `${floors} קומות מגורים` });
  const added = num(/תוספת\s*(\d+)\s*קומות/, t) ?? num(/הוספת\s*(\d+)\s*קומות/, t);
  if (added) out.push({ en: `${added} floors added`, he: `תוספת ${added} קומות` });
  const units = num(/כמות יח"ד מבוקשות:\s*(\d+)/, t) ?? num(/(\d+)\s*יח"ד/, t);
  if (units) out.push({ en: `${units} homes`, he: `${units} יח״ד` });
  const basements = /מרתף אחד/.test(t) ? 1 : num(/(\d+)\s*(?:קומות )?מרתפים/, t);
  if (basements) out.push({ en: `${basements} basement level${basements > 1 ? "s" : ""}`, he: `${basements} קומות מרתף` });
  const parking = num(/(?:כמות )?מקומות חניה:\s*(\d+)/, t);
  if (parking) out.push({ en: `${parking} parking spaces`, he: `${parking} מקומות חניה` });
  if (/בריכה/.test(t) && !/בריכה: קומה: 0, מיקום: 0, גודל: 0/.test(t)) out.push({ en: "A swimming pool", he: "בריכת שחייה" });
  if (/חיזוק/.test(t)) out.push({ en: "Earthquake strengthening", he: "חיזוק מפני רעידות אדמה" });
  if (/מעלית/.test(t)) out.push({ en: "A lift", he: "מעלית" });
  if (/ממ"ד|ממ״ד/.test(t)) out.push({ en: "Safe rooms", he: "ממ״דים" });
  if (/שימוש חורג/.test(t)) out.push({ en: "A change of use (e.g. a flat to a shop or office)", he: "שימוש חורג" });
  const area = num(/שטח הריסה \(מ"ר\):\s*([\d.]+)/, t);
  if (area) out.push({ en: `${Math.round(area)} m² to be demolished`, he: `${Math.round(area)} מ״ר להריסה` });
  return out;
};

/** The request text split into its sections ("Basement: storage room, utility room"). */
export const requestSections = (text?: string): { label: T; items: string; en: string | null }[] => {
  if (!text) return [];
  const LABELS: [RegExp, T][] = [
    [/במרתפים|מרתפים/, { en: "Basement", he: "מרתף" }], [/בקומת הקרקע|קומת קרקע/, { en: "Ground floor", he: "קומת קרקע" }],
    [/על הגג|בגג/, { en: "Roof", he: "גג" }], [/בחצר/, { en: "Yard", he: "חצר" }], [/בקומות/, { en: "Floors", he: "קומות" }],
  ];
  const out: { label: T; items: string; en: string | null }[] = [];
  for (const line of text.split(/\n|;/)) {
    const m = /^\s*(?:פירוט המבוקש\s*)?([^:]{2,30}):\s*(.+)$/.exec(line);
    if (!m) continue;
    const lab = LABELS.find(([re]) => re.test(m[1]));
    if (!lab) continue;
    const items = m[2].replace(/\s*,\s*$/, "").trim();
    out.push({ label: lab[1], items, en: roughEnglish(items) });
  }
  return out;
};

/* ---------------- translating the rest ---------------- */

// Chrome (and other browsers that ship the Translator API) can translate on the device, free.
export const canTranslateOnDevice = () => typeof window !== "undefined" && "Translator" in window;
export const translateOnDevice = async (text: string): Promise<string | null> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Tr = (window as any).Translator;
    if (!Tr) return null;
    const avail = await Tr.availability({ sourceLanguage: "he", targetLanguage: "en" });
    if (avail === "unavailable") return null;
    const t = await Tr.create({ sourceLanguage: "he", targetLanguage: "en" });
    return await t.translate(text);
  } catch {
    return null;
  }
};
export const googleTranslateUrl = (text: string) => `https://translate.google.com/?sl=iw&tl=en&op=translate&text=${encodeURIComponent(text.slice(0, 4500))}`;
