// Time windows in Israel time, whatever the viewer's timezone.
const TZ = "Asia/Jerusalem";

const parts = (d: Date) => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, wd: get("weekday"), hour: Number(get("hour")) };
};

// The "night" belongs to the previous day until 05:00, so a 01:00 party is still "tonight".
export const nightKey = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const p = parts(d);
  return p.hour < 5 ? parts(new Date(d.getTime() - 6 * 3600_000)).day : p.day;
};

const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export type Range = "tonight" | "tomorrow" | "weekend" | "week" | "all";

export const inRange = (startIso: string, endIso: string | null, range: Range, now = new Date()) => {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : start + 3 * 3600_000;
  if (end < now.getTime()) return false; // already over
  const today = nightKey(now);
  const key = nightKey(startIso);
  switch (range) {
    case "tonight": return key <= today; // includes anything still running
    case "tomorrow": return key === addDays(today, 1);
    case "week": return key <= addDays(today, 6);
    case "all": return true;
    case "weekend": {
      // Israeli weekend: Thursday night through Saturday night.
      const wd = parts(now).wd;
      const offset = ({ Sun: 4, Mon: 3, Tue: 2, Wed: 1, Thu: 0, Fri: -1, Sat: -2 } as Record<string, number>)[wd] ?? 0;
      const thu = addDays(today, offset);
      return key >= thu && key <= addDays(thu, 2);
    }
  }
};

export const dayHeading = (key: string, lang: "en" | "he") => {
  const today = nightKey(new Date());
  if (key === today) return lang === "he" ? "היום" : "Today";
  if (key === addDays(today, 1)) return lang === "he" ? "מחר" : "Tomorrow";
  return new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" })
    .format(new Date(`${key}T12:00:00Z`));
};
