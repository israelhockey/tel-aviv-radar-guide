// A small, strict parser for the common subset of OSM `opening_hours`.
// Anything it does not fully understand returns `unknown` rather than a guess.
//
// Supported: "24/7"; rules separated by ";" or ","-joined day lists;
// day ranges (Mo-Fr, Su-Th, Sa), "off"/"closed", time ranges (08:00-22:00),
// several ranges per day (08:00-12:00,16:00-20:00), past midnight (18:00-02:00),
// and "+" open-ended times. Rules with PH/SH/dates/months/weeks make the whole value unknown.

export type OpenState = { status: "open" | "closed" | "unknown"; until?: string; opensAt?: string };

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

type Range = { start: number; end: number; openEnd?: boolean }; // minutes from day start; end may exceed 1440
type Week = (Range[] | null)[]; // index = JS day (0 = Sunday); null = not specified
// Marker for a day whose hours depend on something we can't compute (e.g. sunset).
const UNKNOWN: Range[] = [];

const parseTime = (s: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 48 || min > 59) return null;
  return h * 60 + min;
};

const parseDays = (s: string): number[] | null => {
  const out: number[] = [];
  for (const part of s.split(",")) {
    const p = part.trim();
    const range = /^([A-Z][a-z])-([A-Z][a-z])$/.exec(p);
    if (range) {
      const a = DAYS.indexOf(range[1] as (typeof DAYS)[number]);
      const b = DAYS.indexOf(range[2] as (typeof DAYS)[number]);
      if (a < 0 || b < 0) return null;
      let i = a;
      for (let guard = 0; guard < 8; guard++) {
        out.push(i);
        if (i === b) break;
        i = (i + 1) % 7;
      }
      continue;
    }
    const d = DAYS.indexOf(p as (typeof DAYS)[number]);
    if (d < 0) return null;
    out.push(d);
  }
  return out;
};

const parseRanges = (s: string): Range[] | null => {
  const out: Range[] = [];
  for (const part of s.split(",")) {
    const p = part.trim();
    if (!p) continue;
    if (p.endsWith("+") && !p.includes("-")) {
      const start = parseTime(p.slice(0, -1));
      if (start == null) return null;
      out.push({ start, end: start + 6 * 60, openEnd: true }); // "open end": assume six hours, never shown as a closing time
      continue;
    }
    const [a, b] = p.replace(/\+$/, "").split("-");
    if (a == null || b == null) return null;
    const start = parseTime(a);
    let end = parseTime(b);
    if (start == null || end == null) return null;
    if (end <= start) end += 1440;
    out.push({ start, end });
  }
  return out.length ? out : null;
};

export const parseOpeningHours = (raw: string | undefined): Week | "always" | null => {
  if (!raw) return null;
  let value = raw.trim();
  if (value === "24/7") return "always";
  // Rules that change by date or season can't be evaluated here.
  if (/\b(SH|week|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|"|\[/.test(value)) return null;
  // Normalise day case ("SU-Th") and the common local style of separating rules with commas
  // ("Su-Th 16:00-02:00, Fr 11:00-19:00"): a comma right after a time or "off" starts a new rule.
  value = value.replace(/\b(Su|Mo|Tu|We|Th|Fr|Sa)\b/gi, (d) => d[0].toUpperCase() + d[1].toLowerCase());
  value = value.replace(/(?<=\d|\+|off|closed),\s*(?=[A-Z][a-z])/g, ";");

  const week: Week = [null, null, null, null, null, null, null];
  for (const ruleRaw of value.split(";")) {
    const rule = ruleRaw.trim();
    if (!rule) continue;
    // Public-holiday rules apply only on holidays; skip them rather than misapply them.
    if (/^PH\b/.test(rule)) continue;
    // Times tied to sunset (common for Saturday night openings): that day becomes unknown.
    if (/sunrise|sunset|dawn|dusk|\?/i.test(rule)) {
      const dm = /^((?:[A-Z][a-z](?:-[A-Z][a-z])?)(?:\s*,\s*[A-Z][a-z](?:-[A-Z][a-z])?)*)/.exec(rule);
      const days = dm ? parseDays(dm[1].replace(/\s+/g, "")) : null;
      if (!days) return null;
      for (const d of days) week[d] = UNKNOWN;
      continue;
    }
    // Split "Mo-Fr 08:00-20:00" into day part and time part.
    const m = /^((?:[A-Z][a-z](?:-[A-Z][a-z])?)(?:\s*,\s*[A-Z][a-z](?:-[A-Z][a-z])?)*)?\s*(.*)$/.exec(rule);
    if (!m) return null;
    const dayPart = m[1];
    const timePart = (m[2] ?? "").trim();
    const days = dayPart ? parseDays(dayPart.replace(/\s+/g, "")) : [0, 1, 2, 3, 4, 5, 6];
    if (!days) return null;
    if (/^(off|closed)$/i.test(timePart)) {
      for (const d of days) week[d] = [];
      continue;
    }
    if (timePart === "24/7" || timePart === "00:00-24:00") {
      for (const d of days) week[d] = [{ start: 0, end: 1440 }];
      continue;
    }
    const ranges = parseRanges(timePart);
    if (!ranges) return null;
    for (const d of days) week[d] = ranges;
  }
  return week;
};

const fmt = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// `now` is evaluated in Israel time regardless of the viewer's timezone.
export const openStateAt = (raw: string | undefined, now: Date = new Date()): OpenState => {
  const parsed = parseOpeningHours(raw);
  if (parsed === "always") return { status: "open" };
  if (!parsed) return { status: "unknown" };

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value.slice(0, 2) ?? "Su";
  const day = DAYS.indexOf(wd as (typeof DAYS)[number]);
  const minutes = Number(parts.find((p) => p.type === "hour")?.value) * 60 + Number(parts.find((p) => p.type === "minute")?.value);
  if (day < 0) return { status: "unknown" };

  // A day that no rule mentions is closed (OSM semantics), unless no rule mentioned any day.
  const today = parsed[day] ?? [];
  const yesterday = parsed[(day + 6) % 7] ?? [];
  if (today === UNKNOWN) {
    // Still answer if yesterday's late hours cover this moment.
    for (const r of yesterday) {
      if (r.end > 1440 && minutes < r.end - 1440) return { status: "open", until: r.openEnd ? undefined : fmt(r.end) };
    }
    return { status: "unknown" };
  }

  for (const r of today) {
    if (minutes >= r.start && minutes < r.end) return { status: "open", until: r.openEnd ? undefined : fmt(r.end) };
  }
  for (const r of yesterday) {
    if (r.end > 1440 && minutes < r.end - 1440) return { status: "open", until: r.openEnd ? undefined : fmt(r.end) };
  }
  const next = today.filter((r) => r.start > minutes).sort((a, b) => a.start - b.start)[0];
  return { status: "closed", opensAt: next ? fmt(next.start) : undefined };
};

// The week as a table, Sunday first: "08:00–22:00", "Closed", or null when not known.
export const weekTable = (raw: string | undefined): (string | null)[] | null => {
  const parsed = parseOpeningHours(raw);
  if (parsed === "always") return Array(7).fill("24h");
  if (!parsed) return null;
  const anyDay = parsed.some((d) => d && d !== UNKNOWN);
  return parsed.map((d) => {
    if (d === UNKNOWN) return null;
    if (!d) return anyDay ? "Closed" : null;
    if (!d.length) return "Closed";
    return d.map((r) => `${fmt(r.start)}–${r.openEnd ? "late" : fmt(r.end)}`).join(", ");
  });
};
