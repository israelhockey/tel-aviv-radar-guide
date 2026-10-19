import type { Place } from "./live/sources";
import { distanceMeters, TLV_CENTER } from "./live/geo";

// Find the map listing behind a name written in an article ("Miznon", "שלמה ודורון").
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[֑-ׇ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export const findPlaces = (places: Place[] | undefined, name: string): Place[] => {
  if (!places) return [];
  const q = norm(name);
  if (!q) return [];
  const names = (p: Place) => [p.name, p.nameEn].filter(Boolean).map((n) => norm(n!));
  let hits = places.filter((p) => names(p).some((n) => n === q));
  if (!hits.length) hits = places.filter((p) => names(p).some((n) => n.startsWith(q + " ") || n.endsWith(" " + q) || n.includes(" " + q + " ")));
  if (!hits.length && q.length >= 5) hits = places.filter((p) => names(p).some((n) => n.includes(q)));
  // Branches of a chain: the most central first.
  return hits.filter((p) => p.kind !== "bicycle_rental").sort((a, b) => distanceMeters(TLV_CENTER, a) - distanceMeters(TLV_CENTER, b));
};

// Short, stable URL piece for a place page: "/place/n123456-miznon".
export const placeSlug = (p: Place) => {
  const n = norm(p.nameEn || "").replace(/\s+/g, "-").slice(0, 40);
  return n ? `${p.id}-${n}` : p.id;
};
export const placeIdFromSlug = (slug: string) => slug.split("-")[0];
