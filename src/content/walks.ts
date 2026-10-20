// Free self-guided walks. Coordinates are approximate points on the street at each stop.
export type Stop = { name: string; nameHe: string; lat: number; lon: number; text: string };
export type Walk = { slug: string; title: string; titleHe: string; dek: string; cover: string; color: string; stops: Stop[] };

export const WALKS: Walk[] = [
  {
    slug: "white-city-bauhaus",
    title: "The White City: a Bauhaus walk",
    titleHe: "העיר הלבנה: סיור באוהאוס",
    dek: "The streets that made Tel Aviv a UNESCO World Heritage site, from Dizengoff Square to Independence Hall.",
    cover: "city:whitecity",
    color: "#0057ff",
    stops: [
      { name: "Dizengoff Square", nameHe: "כיכר דיזנגוף", lat: 32.0779, lon: 34.774, text: "The heart of the 1930s city, designed as a round plaza ringed by curved Bauhaus buildings." },
      { name: "Bauhaus Center, Dizengoff 77", nameHe: "מרכז הבאוהאוס, דיזנגוף 77", lat: 32.0768, lon: 34.7745, text: "A small shop and gallery about the White City, with maps and books for the rest of the walk." },
      { name: "Bialik Street", nameHe: "רחוב ביאליק", lat: 32.0716, lon: 34.7716, text: "A quiet street of preserved houses ending at the old city hall. Look for ribbon windows and curved balconies." },
      { name: "Rothschild Boulevard at Habima", nameHe: "שדרות רוטשילד מול הבימה", lat: 32.0727, lon: 34.7785, text: "The start of the boulevard, with its central walkway shaded by ficus trees and lined with restored buildings." },
      { name: "Rothschild and Sheinkin", nameHe: "רוטשילד פינת שינקין", lat: 32.0664, lon: 34.775, text: "Classic kiosks and some of the finest International Style facades on the boulevard." },
      { name: "Independence Hall", nameHe: "היכל העצמאות", lat: 32.0629, lon: 34.7709, text: "Where Israel's independence was declared in 1948, at the boulevard's southern end." },
    ],
  },
  {
    slug: "old-jaffa",
    title: "Old Jaffa and the port",
    titleHe: "יפו העתיקה והנמל",
    dek: "The clock tower, the flea market, the stone lanes of the old city and the ancient port.",
    cover: "city:oldjaffa",
    color: "#2f9e44",
    stops: [
      { name: "Jaffa Clock Tower", nameHe: "מגדל השעון ביפו", lat: 32.0546, lon: 34.7564, text: "Built in the early 1900s, the landmark at the entrance to old Jaffa." },
      { name: "Jaffa Flea Market", nameHe: "שוק הפשפשים", lat: 32.0533, lon: 34.7578, text: "Antiques, vintage furniture and cafés. Busiest on Friday mornings." },
      { name: "Kedumim Square", nameHe: "כיכר קדומים", lat: 32.0535, lon: 34.7522, text: "The main square of the old city, beside St Peter's Church." },
      { name: "Abrasha Park lookout", nameHe: "גן הפסגה", lat: 32.0538, lon: 34.7531, text: "The hilltop park with the best view north along the coast to the Tel Aviv skyline." },
      { name: "Jaffa Port", nameHe: "נמל יפו", lat: 32.0517, lon: 34.7506, text: "One of the oldest working ports in the world, now restaurants, galleries and fishing boats." },
    ],
  },
  {
    slug: "florentin-street-art",
    title: "Florentin street art and markets",
    titleHe: "פלורנטין: גרפיטי ושווקים",
    dek: "Murals, workshops, the Levinsky spice market and the bars that wake up at night.",
    cover: "city:florentin",
    color: "#e8590c",
    stops: [
      { name: "Florentin Street", nameHe: "רחוב פלורנטין", lat: 32.0567, lon: 34.7698, text: "The neighbourhood's spine, with murals down every side street." },
      { name: "Vital Street", nameHe: "רחוב ויטל", lat: 32.0559, lon: 34.7685, text: "Some of the biggest and most photographed walls in the city." },
      { name: "Abarbanel Street", nameHe: "רחוב אברבנאל", lat: 32.0569, lon: 34.7716, text: "Workshops by day and some of the area's best-loved bars by night." },
      { name: "Levinsky Market", nameHe: "שוק לוינסקי", lat: 32.059, lon: 34.7733, text: "Spice shops, dried fruit, Balkan delis and old-school cafés. Taste as you go." },
    ],
  },
  {
    slug: "carmel-market-food-walk",
    title: "A food walk through the Carmel Market",
    titleHe: "סיור אוכל בשוק הכרמל",
    dek: "Fresh juice, burekas, hummus and the Yemenite Quarter's hidden lanes.",
    cover: "city:carmel",
    color: "#ff5a4e",
    stops: [
      { name: "Magen David Square", nameHe: "כיכר מגן דוד", lat: 32.0683, lon: 34.7697, text: "Six streets meet here at the market's entrance. Start with a fresh juice." },
      { name: "Carmel Market", nameHe: "שוק הכרמל", lat: 32.0672, lon: 34.7687, text: "The city's biggest market: fruit, spices, cheese, street food and a lot of noise." },
      { name: "Kerem HaTeimanim", nameHe: "כרם התימנים", lat: 32.0682, lon: 34.7664, text: "The Yemenite Quarter: narrow lanes of small family restaurants." },
      { name: "Nahalat Binyamin", nameHe: "נחלת בנימין", lat: 32.0665, lon: 34.7705, text: "A pedestrian street with an arts and crafts fair on Tuesdays and Fridays." },
    ],
  },
  {
    slug: "the-promenade",
    title: "The promenade, port to Jaffa",
    titleHe: "הטיילת, מהנמל ליפו",
    dek: "Five kilometres of seafront, past every central beach, ending at sunset in Jaffa.",
    cover: "city:promenade",
    color: "#0c8599",
    stops: [
      { name: "Tel Aviv Port", nameHe: "נמל תל אביב", lat: 32.0985, lon: 34.7737, text: "Wooden decks, restaurants and the Friday farmers' market." },
      { name: "Hilton Beach", nameHe: "חוף הילטון", lat: 32.088, lon: 34.769, text: "Surfers, a dog beach and a breakwater with views back to the city." },
      { name: "Gordon Beach", nameHe: "חוף גורדון", lat: 32.0839, lon: 34.7678, text: "Lively, central, with a saltwater pool and beach volleyball." },
      { name: "Frishman Beach", nameHe: "חוף פרישמן", lat: 32.0806, lon: 34.767, text: "Matkot players, cafés and some of the best sunset spots." },
      { name: "Charles Clore Park", nameHe: "גן צ'ארלס קלור", lat: 32.0638, lon: 34.7612, text: "Lawns by the sea, ideal for a picnic before Jaffa." },
      { name: "Old Jaffa", nameHe: "יפו העתיקה", lat: 32.0538, lon: 34.7525, text: "Finish on the hill for the classic view of the Tel Aviv skyline at sunset." },
    ],
  },
];
