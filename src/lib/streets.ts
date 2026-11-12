// Street pages: "Construction on Dizengoff Street". The street list comes from the city's address
// layer (public/data/streets.json, refreshed weekly); what's on each street comes from the city's
// permit, site and works layers (live in the browser, from the nightly snapshot when pre-rendering).

export type Street = { he: string; en?: string; lat: number; lon: number; n: number; min?: number; max?: number };

/**
 * The name people actually use. The city's English names often add a first name the Hebrew street
 * sign leaves out ("Meir Dizengoff" for דיזנגוף), so keep as many words as the Hebrew name has.
 */
export const streetName = (s: Pick<Street, "en" | "he">) => {
  if (!s.en) return undefined;
  const words = s.en.split(" ");
  const heWords = s.he.split(" ").length;
  let name = words.length > heWords ? words.slice(-heWords).join(" ") : s.en;
  // "Simtat", "Kikar" and friends on their own say nothing: keep the full name.
  if (/^(simtat|shvil|kikar|sderot|derekh|rehov|gan|ma'?avar|mitham)$/i.test(name)) name = s.en;
  return name.replace(/'([A-Z])/g, (_m, c: string) => `'${c.toLowerCase()}`);
};

export const streetSlug = (s: Pick<Street, "en" | "he">) =>
  (streetName(s) ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Slug → street, skipping streets without an English name and keeping the first of any clash. */
export const streetIndex = (list: Street[]) => {
  const m = new Map<string, Street>();
  for (const s of list) {
    const slug = streetSlug(s);
    if (slug && !m.has(slug)) m.set(slug, s);
  }
  return m;
};

export const streetPath = (s: Street, he = false) => `${he ? "/he" : ""}/street/${streetSlug(s)}`;

const d2 = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
  ((a.lat - b.lat) * 110540) ** 2 + ((a.lon - b.lon) * 94400) ** 2;
export const nearbyStreets = (s: Street, list: Street[], n = 8, allowed?: Set<string>) =>
  list.filter((x) => x.he !== s.he && x.en && (!allowed || allowed.has(streetSlug(x))))
    .sort((a, b) => d2(s, a) - d2(s, b)).slice(0, n);

/** Street names in a city address text like "דיזנגוף 100, דיזנגוף 102א". */
export const streetsInAddress = (address: string) =>
  [...new Set(address.split(",").map((p) => p.replace(/\s+/g, " ").trim().replace(/\s+\d+\s*[א-ת]?$/, "").trim()).filter(Boolean))];

/** Numbers on a given street in an address text. */
export const numbersOn = (address: string | undefined, street: string) => {
  const out: string[] = [];
  for (const p of (address ?? "").split(",")) {
    const m = /^(.*?)\s+(\d+\s*[א-ת]?)$/.exec(p.replace(/\s+/g, " ").trim());
    if (m && m[1] === street && !out.includes(m[2])) out.push(m[2]);
  }
  return out;
};
