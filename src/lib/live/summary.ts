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
  // The ten most disruptive things nearby, averaged over ten (so a couple of items can't max it out),
  // plus a nudge for how many loud ones there are. One decimal, so busy streets can still be compared.
  const top10 = s.slice(0, 10).reduce((t, x) => t + x, 0) / 10;
  const zone = live.find((a) => a.kind === "zone");
  const raw = top10 + Math.min(1, s.filter((x) => x >= 7).length * 0.1) + (zone ? 0.3 : 0);
  const score = Math.max(0, Math.min(10, Math.round(raw * 10) / 10));
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
