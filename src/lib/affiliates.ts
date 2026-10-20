// Affiliate partners. Paste each ID here once you're approved, and every link on the site that
// points to that partner starts earning. Until then the links still work, just without a commission.
//
// Where to find each one after signing up:
//   bookingAid          Booking.com Affiliate Partner Centre, "aid" (a number)
//   stay22Aid           Stay22 dashboard, your "aid" (a word); used for the hotel map/links
//   gygPartnerId        GetYourGuide Partner Portal, "partner_id" (e.g. ABC1D2E)
//   viatorPid           Viator Partner Program, "pid" (e.g. P00012345)
//   travelpayoutsMarker Travelpayouts dashboard, "marker" (a number)
//   airaloRef           Airalo Partners, referral code
//   safetyWingRef       SafetyWing Ambassador, referenceID
//   discoverCarsAid     DiscoverCars affiliate, a_aid
export const AFFILIATE = {
  bookingAid: "",
  stay22Aid: "",
  gygPartnerId: "",
  viatorPid: "",
  travelpayoutsMarker: "",
  airaloRef: "",
  safetyWingRef: "",
  discoverCarsAid: "",
};

const withParams = (base: string, params: Record<string, string | undefined>) => {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  return u.toString();
};

/** rel for outbound partner links: "sponsored" tells search engines it's a paid link. */
export const relFor = (earning: boolean) => (earning ? "sponsored noopener noreferrer" : "noopener noreferrer");

export type PartnerLink = { href: string; earning: boolean };

/** Search a hotel by name on Booking.com (through Stay22 when set up). */
export const hotelLink = (name: string, lat?: number, lon?: number): PartnerLink => {
  const q = name ? `${name}, Tel Aviv` : "Tel Aviv";
  if (AFFILIATE.stay22Aid) {
    return { href: withParams("https://www.stay22.com/allez/booking", { aid: AFFILIATE.stay22Aid, address: q, lat: lat?.toString(), lng: lon?.toString() }), earning: true };
  }
  return { href: withParams("https://www.booking.com/searchresults.html", { ss: q, aid: AFFILIATE.bookingAid || undefined }), earning: !!AFFILIATE.bookingAid };
};

/** All stays in an area, for "see prices near here". */
export const areaStaysLink = (area = "Tel Aviv"): PartnerLink => hotelLink(area === "Tel Aviv" ? "" : area);

/** Tours and tickets search on GetYourGuide. */
export const toursLink = (query: string): PartnerLink => ({
  href: withParams("https://www.getyourguide.com/s/", { q: query, partner_id: AFFILIATE.gygPartnerId || undefined }),
  earning: !!AFFILIATE.gygPartnerId,
});

export type Essential = { id: string; en: string; he: string; bodyEn: string; bodyHe: string; partner: string; link: PartnerLink; color: string };

/** Things every visitor needs; shown on the guide, hotels and newcomer pages. */
export const essentials = (): Essential[] => [
  {
    id: "esim", en: "A data eSIM", he: "eSIM לגלישה", partner: "Airalo", color: "#0057ff",
    bodyEn: "Land with data already working. Israeli eSIMs start at a few dollars and install in a minute.",
    bodyHe: "לנחות עם גלישה שכבר עובדת. eSIM ישראלי מתחיל בכמה דולרים ומותקן בדקה.",
    link: { href: withParams("https://www.airalo.com/israel-esim", { ref: AFFILIATE.airaloRef || undefined }), earning: !!AFFILIATE.airaloRef },
  },
  {
    id: "insurance", en: "Travel insurance", he: "ביטוח נסיעות", partner: "SafetyWing", color: "#2f9e44",
    bodyEn: "Medical care in Israel is excellent and expensive for visitors. Cover that works month to month.",
    bodyHe: "הרפואה בישראל מצוינת ויקרה לתיירים. כיסוי שמתחדש מחודש לחודש.",
    link: { href: withParams("https://safetywing.com/nomad-insurance", { referenceID: AFFILIATE.safetyWingRef || undefined }), earning: !!AFFILIATE.safetyWingRef },
  },
  {
    id: "car", en: "A rental car", he: "השכרת רכב", partner: "DiscoverCars", color: "#e8590c",
    bodyEn: "You don't need one in the city, but it's the easy way to see the Dead Sea, Galilee and Negev.",
    bodyHe: "בעיר לא צריך, אבל זו הדרך הנוחה להגיע לים המלח, לגליל ולנגב.",
    link: { href: withParams("https://www.discovercars.com/israel/tel-aviv", { a_aid: AFFILIATE.discoverCarsAid || undefined }), earning: !!AFFILIATE.discoverCarsAid },
  },
  {
    id: "flights", en: "Flights to Tel Aviv", he: "טיסות לתל אביב", partner: "Skyscanner", color: "#5f3dc4",
    bodyEn: "Compare every airline flying into Ben Gurion, including the low-cost carriers.",
    bodyHe: "השוואת כל חברות התעופה לנתב״ג, כולל הלואו-קוסט.",
    // Swap for a Travelpayouts deep link once the marker is set.
    link: { href: "https://www.skyscanner.net/flights-to/tlv/", earning: false },
  },
];

export const anyEarning = () => Object.values(AFFILIATE).some(Boolean);
