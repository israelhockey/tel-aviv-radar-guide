// Fixed geography for Tel Aviv-Yafo.

export const TLV_CENTER = { lat: 32.0809, lon: 34.7806 }; // Dizengoff Square area

// Bounding box that covers Tel Aviv-Yafo (south of Jaffa to north of Tel Baruch).
export const TLV_BBOX = { south: 32.025, west: 34.735, north: 32.135, east: 34.83 };

// Hebcal geonameid for Tel Aviv
export const HEBCAL_GEONAME_ID = 293397;

export type Beach = { id: string; en: string; he: string; lat: number; lon: number };

// Public beaches, north to south. Coordinates are on the sand.
export const BEACHES: Beach[] = [
  { id: "tel-baruch", en: "Tel Baruch", he: "תל ברוך", lat: 32.1196, lon: 34.788 },
  { id: "metzitzim", en: "Metzitzim", he: "מציצים", lat: 32.099, lon: 34.7737 },
  { id: "hilton", en: "Hilton", he: "הילטון", lat: 32.088, lon: 34.7685 },
  { id: "gordon", en: "Gordon", he: "גורדון", lat: 32.0839, lon: 34.7674 },
  { id: "frishman", en: "Frishman", he: "פרישמן", lat: 32.0806, lon: 34.7665 },
  { id: "jerusalem", en: "Jerusalem Beach", he: "חוף ירושלים", lat: 32.0731, lon: 34.7637 },
  { id: "banana", en: "Banana Beach", he: "חוף בננה", lat: 32.07, lon: 34.7622 },
  { id: "alma", en: "Alma", he: "עלמה", lat: 32.0613, lon: 34.759 },
  { id: "jaffa", en: "Jaffa (Givat Aliya)", he: "יפו (גבעת עלייה)", lat: 32.045, lon: 34.751 },
];

// The marine model grid has no data over land, so sea conditions are read ~1 km offshore.
export const OFFSHORE_LON_SHIFT = -0.012;

export const distanceMeters = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// ~80 m per minute walking, adjusted for a city grid.
export const walkMinutes = (meters: number) => Math.max(1, Math.round((meters * 1.25) / 80));
