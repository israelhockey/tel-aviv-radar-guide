import type { FeedEvent, Place } from "./live/sources";
import { NEIGHBOURHOODS, distanceMeters, neighbourhoodOf } from "./live/geo";
import { CRAVINGS, matchesCraving, type Craving } from "./live/dishes";

// Neighbourhood pages ("Cafés in Florentin") and dish pages ("Hummus in Tel Aviv"), built from
// the map data so they stay current and there is one for every search people make.

export type Hood = (typeof NEIGHBOURHOODS)[number];

export const hoodSlug = (h: Hood) => h.en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const hoodBySlug = (slug: string) => NEIGHBOURHOODS.find((h) => hoodSlug(h) === slug);

export type AreaKind = { id: string; kinds: string[]; en: string; he: string; one: string; oneHe: string };
export const AREA_KINDS: AreaKind[] = [
  { id: "restaurants", kinds: ["restaurant"], en: "Restaurants", he: "מסעדות", one: "restaurant", oneHe: "מסעדה" },
  { id: "cafes", kinds: ["cafe"], en: "Cafés", he: "בתי קפה", one: "café", oneHe: "בית קפה" },
  { id: "bars", kinds: ["bar", "pub", "biergarten"], en: "Bars", he: "ברים", one: "bar", oneHe: "בר" },
  { id: "quick-bites", kinds: ["fast_food"], en: "Quick bites", he: "אוכל מהיר", one: "quick bite", oneHe: "אוכל מהיר" },
  { id: "ice-cream", kinds: ["ice_cream"], en: "Ice cream", he: "גלידריות", one: "ice cream shop", oneHe: "גלידריה" },
];
export const areaKindById = (id: string) => AREA_KINDS.find((k) => k.id === id);

const eatable = (p: Place) => p.kind !== "bicycle_rental" && !!p.name;

export const placesInHood = (places: Place[], h: Hood) =>
  places.filter((p) => eatable(p) && neighbourhoodOf(p)?.en === h.en)
    .sort((a, b) => distanceMeters(h, a) - distanceMeters(h, b));

export const placesOfKind = (places: Place[], k: AreaKind) => places.filter((p) => k.kinds.includes(p.kind));

/** Kinds with enough places in a neighbourhood to deserve their own page. */
export const MIN_PER_PAGE = 3;

export const cravingBySlug = (slug: string) => CRAVINGS.find((c) => c.id === slug);
export const placesForCraving = (places: Place[], c: Craving) =>
  places.filter((p) => eatable(p) && matchesCraving(p, c))
    .sort((a, b) => Number(!!b.hours) - Number(!!a.hours) || (a.nameEn || a.name).localeCompare(b.nameEn || b.name));

export const eventsNear = (events: FeedEvent[], h: Hood, meters = 1400) =>
  events.filter((e) => e.lat != null && e.lon != null && distanceMeters(h, { lat: e.lat, lon: e.lon }) < meters);

// Event pages: "/event/tickchak-112429".
export const eventSlug = (e: { id: string }) => e.id.replace(/[^a-zA-Z0-9]+/g, "-");
