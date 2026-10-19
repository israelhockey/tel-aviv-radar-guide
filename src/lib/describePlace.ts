import type { Lang } from "./i18n";
import type { Place } from "./live/sources";
import { neighbourhoodOf } from "./live/geo";
import { weekTable } from "./live/openingHours";
import { placeKindLabel } from "./live/places";

const CUISINE_HE: Record<string, string> = {
  coffee_shop: "בית קפה", burger: "המבורגרים", pizza: "פיצה", italian: "איטלקי", sushi: "סושי", japanese: "יפני",
  asian: "אסייתי", chinese: "סיני", thai: "תאילנדי", indian: "הודי", mexican: "מקסיקני", hummus: "חומוס", falafel: "פלאפל",
  shawarma: "שווארמה", middle_eastern: "מזרח תיכוני", mediterranean: "ים תיכוני", israeli: "ישראלי", regional: "מקומי",
  seafood: "דגים ופירות ים", fish: "דגים", steak_house: "סטייקים", meat: "בשרים", grill: "גריל", sandwich: "כריכים",
  breakfast: "ארוחות בוקר", ice_cream: "גלידה", dessert: "קינוחים", vegan: "טבעוני", vegetarian: "צמחוני", french: "צרפתי",
  georgian: "גאורגי", ethiopian: "אתיופי", bagel: "בייגל", chicken: "עוף", kebab: "קבב", juice: "מיצים", pasta: "פסטה",
};

const cuisineList = (p: Place, lang: Lang) =>
  (p.cuisine ?? "").split(/[;,]/).map((c) => c.trim().toLowerCase()).filter(Boolean).slice(0, 2)
    .map((c) => (lang === "he" ? CUISINE_HE[c] ?? c.replace(/_/g, " ") : c.replace(/_/g, " ")));

// The latest closing time across the week, if the place stays open past 23:00 on most days.
const lateClose = (p: Place) => {
  const week = weekTable(p.hours);
  if (!week) return null;
  const late = week.filter((d) => d && /–(0[0-5]|23):\d\d/.test(d));
  return late.length >= 4 ? (/–(\d\d:\d\d)$/.exec(late[0]!)?.[1] ?? null) : null;
};

/** A short, factual description of a place, from its map data. */
export const describePlace = (p: Place, lang: Lang): string[] => {
  const name = (lang === "en" && p.nameEn) || p.name;
  const hood = neighbourhoodOf(p);
  const kind = placeKindLabel(p.kind, lang).toLowerCase();
  const cuis = cuisineList(p, lang).filter((c) => !/coffee shop|בית קפה/.test(c) || p.kind !== "cafe");
  const street = p.street ? `${p.street}${p.number ? ` ${p.number}` : ""}` : null;
  const late = lateClose(p);
  const out: string[] = [];
  if (lang === "he") {
    out.push(`${name} הוא ${kind}${cuis.length ? ` (${cuis.join(", ")})` : ""}${hood ? ` ב${hood.he}` : ""}${street ? `, ברחוב ${street}` : ""}.`);
    const extras = [
      late && `פתוח עד מאוחר, עד ${late} ברוב הלילות`,
      (p.kosher === "yes" || p.kosher === "only") && "כשר",
      p.vegan === "only" ? "טבעוני לגמרי" : p.vegan === "yes" && "יש אפשרויות טבעוניות",
      p.outdoor && "יש ישיבה בחוץ",
      p.happy && `הפי האוור: ${p.happy}`,
    ].filter(Boolean);
    if (extras.length) out.push(`${extras.join(". ")}.`);
  } else {
    const article = /^[aeiou]/i.test(cuis[0] ?? kind) ? "an" : "a";
    out.push(`${name} is ${article} ${cuis.length ? `${cuis.join(" and ")} ` : ""}${kind}${hood ? ` in ${hood.en}` : ""}${street ? `, on ${street}` : ""}.`);
    const extras = [
      late && `It stays open late, until ${late} on most nights`,
      (p.kosher === "yes" || p.kosher === "only") && "It's kosher",
      p.vegan === "only" ? "The menu is fully vegan" : p.vegan === "yes" && "There are vegan options",
      p.outdoor && "There are tables outside",
      p.happy && `Happy hour: ${p.happy}`,
    ].filter(Boolean);
    if (extras.length) out.push(`${extras.join(". ")}.`);
  }
  return out;
};
