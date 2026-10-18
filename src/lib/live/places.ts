import type { Lang } from "@/lib/i18n";

const KINDS: Record<string, [string, string]> = {
  restaurant: ["Restaurant", "מסעדה"],
  cafe: ["Café", "בית קפה"],
  bar: ["Bar", "בר"],
  pub: ["Pub", "פאב"],
  fast_food: ["Quick bite", "אוכל מהיר"],
  ice_cream: ["Ice cream", "גלידה"],
  biergarten: ["Beer garden", "גן בירה"],
  bicycle_rental: ["Bike rental", "השכרת אופניים"],
};

export const placeKindLabel = (kind: string, lang: Lang) => {
  const k = KINDS[kind];
  return k ? (lang === "he" ? k[1] : k[0]) : kind;
};
