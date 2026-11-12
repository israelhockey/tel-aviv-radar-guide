// One overview of an address, shared by the address report and the apartment comparison.
import { isLive, type Activity, type ActivityKind } from "./build";
import { impactOf } from "./buildInsight";

export type Summary = {
  score: number; level: "high" | "medium" | "low" | "none";
  counts: Record<ActivityKind, number>;
  review: number; building: number; nearestBuild?: number;
  top: (Activity & { impact: number })[];
  zone?: Activity; rail?: Activity; bars: number;
  headline: { en: string; he: string };
};

const KINDS: ActivityKind[] = ["permit", "site", "night", "road", "rail", "business", "zone", "danger", "plan"];

export const summarize = (items: Activity[]): Summary => {
  const live = items.filter(isLive);
  const scored = live.map((a) => ({ ...a, impact: impactOf(a).score })).sort((x, y) => y.impact - x.impact || x.distance - y.distance);
  const counts = Object.fromEntries(KINDS.map((k) => [k, live.filter((a) => a.kind === k).length])) as Record<ActivityKind, number>;
  const review = live.filter((a) => a.kind === "permit" && /בתהליך/.test(a.stage ?? "")).length;
  const buildingItems = live.filter((a) => (a.kind === "permit" && /בבניה/.test(a.stage ?? "")) || a.kind === "site");
  const nearestBuild = buildingItems.length ? Math.min(...buildingItems.map((a) => a.distance)) : undefined;
  // The loudest thing matters most; the next few add to it.
  const s = scored.filter((a) => a.kind !== "zone" && a.kind !== "plan").map((a) => a.impact);
  const rest = s.slice(1, 6);
  const raw = s.length ? s[0] * 0.65 + (rest.reduce((t, x) => t + x, 0) / Math.max(rest.length, 1)) * 0.35 + Math.min(1.5, s.filter((x) => x >= 5).length * 0.25) : 0;
  const zone = live.find((a) => a.kind === "zone");
  const score = Math.max(0, Math.min(10, Math.round(raw + (zone ? 0.5 : 0))));
  const level = score >= 7 ? "high" : score >= 4 ? "medium" : score >= 1 ? "low" : "none";
  const rail = scored.find((a) => a.kind === "rail");
  const bars = live.filter((a) => a.kind === "business" && impactOf(a).score >= 3).length;
  const headline =
    level === "high" ? { en: "Expect noticeable building noise around here", he: "צפו לרעש בניה מורגש בסביבה" }
    : level === "medium" ? { en: "Some works nearby, nothing extreme", he: "יש עבודות בסביבה, לא קיצוני" }
    : level === "low" ? { en: "Fairly quiet for Tel Aviv", he: "שקט יחסית לתל אביב" }
    : { en: "Nothing active nearby right now", he: "אין פעילות בסביבה כרגע" };
  return { score, level, counts, review, building: buildingItems.length, nearestBuild, top: scored.filter((a) => a.kind !== "zone").slice(0, 8), zone, rail, bars, headline };
};
