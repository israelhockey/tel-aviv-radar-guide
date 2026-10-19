// The magazine: articles are Markdown files in src/content/articles, with a small header
// ("front matter") of key: value lines. They're bundled with the site, so no database is needed
// and every change is reviewed in git.

export type ArticleCategory =
  | "food" | "drink" | "nightlife" | "culture" | "outdoors" | "neighbourhoods" | "holidays" | "newcomers" | "tourists" | "family";

export type Article = {
  slug: string;
  title: string;
  dek: string;
  category: ArticleCategory;
  cover?: string;      // "dish:<key>", "city:<key>", or an image URL
  date: string;        // YYYY-MM-DD
  updated?: string;
  author: string;
  tags: string[];
  featured: boolean;
  lang: "en" | "he";
  body: string;
  readMinutes: number;
  pair?: string;       // slug of the same article in the other language
};

const files = import.meta.glob("/src/content/articles/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const parse = (path: string, raw: string): Article => {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw.replace(/\r\n/g, "\n"));
  const meta: Record<string, string> = {};
  const body = m ? m[2] : raw;
  if (m) {
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  const slug = meta.slug || path.split("/").pop()!.replace(/\.md$/, "");
  const words = body.split(/\s+/).length;
  return {
    slug,
    title: meta.title || slug,
    dek: meta.dek || "",
    category: (meta.category as ArticleCategory) || "tourists",
    cover: meta.cover,
    date: meta.date || "2026-10-19",
    updated: meta.updated,
    author: meta.author || "Discover Tel Aviv",
    tags: (meta.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
    featured: meta.featured === "true",
    lang: meta.lang === "he" ? "he" : "en",
    body,
    readMinutes: Math.max(2, Math.round(words / 220)),
    pair: meta.pair || undefined,
  };
};

export const ARTICLES: Article[] = Object.entries(files)
  .map(([path, raw]) => parse(path, raw))
  .sort((a, b) => (b.updated ?? b.date).localeCompare(a.updated ?? a.date));

export const articleBySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);

/** The same article in another language, if we have it. */
export const translationOf = (a: Article, lang: "en" | "he") =>
  a.lang === lang ? a : ARTICLES.find((x) => x.lang === lang && (x.pair === a.slug || a.pair === x.slug));

/** What to list for a reader: their language, plus articles not yet translated. */
export const articlesFor = (lang: "en" | "he") => ARTICLES.filter((a) => a.lang === lang || !translationOf(a, lang));

export const CATEGORY_LABEL: Record<ArticleCategory, { en: string; he: string; color: string }> = {
  food: { en: "Food", he: "אוכל", color: "#e8590c" },
  drink: { en: "Drinks", he: "שתייה", color: "#d6336c" },
  nightlife: { en: "Nightlife", he: "חיי לילה", color: "#7048e8" },
  culture: { en: "Culture", he: "תרבות", color: "#1971c2" },
  outdoors: { en: "Outdoors", he: "בחוץ", color: "#0c8599" },
  neighbourhoods: { en: "Neighbourhoods", he: "שכונות", color: "#2f9e44" },
  holidays: { en: "Holidays", he: "חגים", color: "#f08c00" },
  newcomers: { en: "Living here", he: "לגור כאן", color: "#5f3dc4" },
  tourists: { en: "Visiting", he: "ביקור", color: "#0b7285" },
  family: { en: "Family", he: "משפחה", color: "#c2255c" },
};
