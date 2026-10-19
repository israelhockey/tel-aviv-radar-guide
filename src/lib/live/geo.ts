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

// Rough centre points of Tel Aviv-Yafo's neighbourhoods, for "in Florentin" style labels.
export const NEIGHBOURHOODS: { en: string; he: string; lat: number; lon: number }[] = [
  { en: "Jaffa", he: "יפו", lat: 32.0525, lon: 34.7555 },
  { en: "Ajami", he: "עג׳מי", lat: 32.0465, lon: 34.7525 },
  { en: "Florentin", he: "פלורנטין", lat: 32.0565, lon: 34.7695 },
  { en: "Neve Tzedek", he: "נווה צדק", lat: 32.0612, lon: 34.7655 },
  { en: "Neve Sha'anan", he: "נווה שאנן", lat: 32.0570, lon: 34.7790 },
  { en: "Shapira", he: "שפירא", lat: 32.0500, lon: 34.7735 },
  { en: "Kerem HaTeimanim", he: "כרם התימנים", lat: 32.0685, lon: 34.7675 },
  { en: "Lev HaIr", he: "לב העיר", lat: 32.0670, lon: 34.7750 },
  { en: "Montefiore", he: "מונטיפיורי", lat: 32.0685, lon: 34.7835 },
  { en: "Sarona", he: "שרונה", lat: 32.0715, lon: 34.7870 },
  { en: "City Centre", he: "מרכז העיר", lat: 32.0780, lon: 34.7750 },
  { en: "Old North", he: "הצפון הישן", lat: 32.0875, lon: 34.7765 },
  { en: "New North", he: "הצפון החדש", lat: 32.0935, lon: 34.7865 },
  { en: "The Port", he: "הנמל", lat: 32.0980, lon: 34.7745 },
  { en: "Bavli", he: "בבלי", lat: 32.0935, lon: 34.7975 },
  { en: "Yad Eliyahu", he: "יד אליהו", lat: 32.0595, lon: 34.7950 },
  { en: "Ramat Aviv", he: "רמת אביב", lat: 32.1120, lon: 34.8000 },
  { en: "Tel Baruch", he: "תל ברוך", lat: 32.1220, lon: 34.7920 },
];

export const neighbourhoodOf = (p: { lat: number; lon: number }) => {
  let best: (typeof NEIGHBOURHOODS)[number] | null = null;
  let d = Infinity;
  for (const n of NEIGHBOURHOODS) {
    const x = distanceMeters(p, n);
    if (x < d) { d = x; best = n; }
  }
  return d < 1600 ? best : null;
};
