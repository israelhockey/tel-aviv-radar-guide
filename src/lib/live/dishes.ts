import type { Place } from "./sources";

// Which dish photo fits a place, from its OpenStreetMap cuisine, diet tags and kind.
const CUISINE_TO_DISH: [RegExp, string][] = [
  [/coffee/, "coffee"], [/burger/, "burger"], [/pizza/, "pizza"], [/italian|pasta/, "pasta"],
  [/sushi|japanese/, "sushi"], [/ramen|noodle/, "ramen"], [/asian|chinese|thai|vietnam|korean|dim_sum/, "asian"],
  [/hummus/, "hummus"], [/falafel/, "falafel"], [/shawarma|pita|doner/, "shawarma"], [/sabich/, "sabich"],
  [/kebab|grill|meat|barbecue|bbq/, "kebab"], [/steak/, "steak"], [/chicken|schnitzel/, "chicken"],
  [/mexican|taco|burrito/, "mexican"], [/seafood|fish/, "seafood"], [/salad|poke/, "salad"],
  [/breakfast|brunch/, "breakfast"], [/ice_cream|gelato|frozen_yogurt/, "icecream"], [/dessert|cake|chocolate|waffle|crepe|pastry/, "dessert"],
  [/juice|smoothie/, "juice"], [/bubble_tea|tea/, "bubbletea"], [/ethiopian|eritrean/, "ethiopian"], [/indian/, "indian"],
  [/french|bakery|croissant/, "french"], [/bagel/, "bagel"], [/sandwich|hot_dog|deli/, "sandwich"], [/bourekas|burekas/, "bourekas"],
  [/middle_eastern|mediterranean|regional|israeli|local|arab|oriental|turkish|moroccan|greek|georgian|lebanese|yemeni|persian|jewish/, "meze"],
];

export const dishOf = (p: Place): string => {
  const c = (p.cuisine ?? "").toLowerCase();
  for (const [re, dish] of CUISINE_TO_DISH) if (re.test(c)) return dish;
  if (p.vegan === "only") return "vegan";
  switch (p.kind) {
    case "cafe": return "coffee";
    case "bar": return "cocktail";
    case "pub": case "biergarten": return "beer";
    case "ice_cream": return "icecream";
    case "fast_food": return "shawarma";
    default: return "meze";
  }
};

// The same place always gets the same photo of its dish.
export const pickPhoto = <T,>(list: T[] | undefined, seed: string): T | undefined => {
  if (!list?.length) return undefined;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
};

export type Craving = { id: string; en: string; he: string; dishes: string[]; kinds?: string[] };

// What people come looking for, in the order Tel Aviv eats.
export const CRAVINGS: Craving[] = [
  { id: "coffee", en: "Coffee", he: "קפה", dishes: ["coffee"], kinds: ["cafe"] },
  { id: "hummus", en: "Hummus", he: "חומוס", dishes: ["hummus", "falafel", "sabich"] },
  { id: "breakfast", en: "Brunch", he: "בראנץ׳", dishes: ["breakfast", "shakshuka", "bagel", "french"] },
  { id: "street", en: "Street food", he: "אוכל רחוב", dishes: ["shawarma", "kebab", "falafel", "sabich", "sandwich", "bourekas"] },
  { id: "pizza", en: "Pizza", he: "פיצה", dishes: ["pizza"] },
  { id: "burger", en: "Burgers", he: "המבורגר", dishes: ["burger"] },
  { id: "sushi", en: "Sushi & Asian", he: "סושי ואסייתי", dishes: ["sushi", "ramen", "asian"] },
  { id: "pasta", en: "Italian", he: "איטלקי", dishes: ["pasta"] },
  { id: "meze", en: "Mediterranean", he: "ים תיכוני", dishes: ["meze", "salad", "seafood", "steak"] },
  { id: "cocktail", en: "Cocktails", he: "קוקטיילים", dishes: ["cocktail"], kinds: ["bar"] },
  { id: "beer", en: "Beer", he: "בירה", dishes: ["beer"], kinds: ["pub", "biergarten"] },
  { id: "icecream", en: "Ice cream & sweets", he: "גלידה ומתוקים", dishes: ["icecream", "dessert"], kinds: ["ice_cream"] },
  { id: "vegan", en: "Vegan", he: "טבעוני", dishes: ["vegan"] },
];

// The photo that stands for each craving on its tile.
export const CRAVING_PHOTO: Record<string, string> = {
  coffee: "coffee", hummus: "hummus", breakfast: "shakshuka", street: "shawarma", pizza: "pizza", burger: "burger",
  sushi: "sushi", pasta: "pasta", meze: "meze", cocktail: "cocktail", beer: "beer", icecream: "icecream", vegan: "vegan",
};

export const matchesCraving = (p: Place, c: Craving) =>
  (c.id === "vegan" ? p.vegan === "yes" || p.vegan === "only" : false) ||
  c.dishes.includes(dishOf(p)) || (c.kinds ?? []).includes(p.kind);
