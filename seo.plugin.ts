import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { build, type Plugin } from "vite";

// After the normal build, write a real HTML page for every route (see src/seo/render.ts),
// plus sitemap.xml and robots.txt. Uses only Vite itself, so nothing extra to install.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const readJson = (file: string, fallback: unknown) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

export const seoPages = (): Plugin => {
  let root = "";
  let outDir = "";
  return {
    name: "discover-seo-pages",
    apply: "build",
    configResolved(c) {
      root = c.root;
      outDir = path.resolve(c.root, c.build.outDir);
    },
    async closeBundle() {
      if (process.env.DISCOVER_SEO_INNER) return;
      const started = Date.now();
      try {
        const tmp = path.join(root, "node_modules", ".discover-seo");
        process.env.DISCOVER_SEO_INNER = "1";
        await build({
          configFile: false, root, logLevel: "warn", publicDir: false,
          resolve: { alias: { "@": path.resolve(root, "src") } },
          build: { ssr: path.resolve(root, "src/seo/render.ts"), outDir: tmp, emptyOutDir: true, minify: false, rollupOptions: { output: { format: "es", entryFileNames: "render.mjs" } } },
        });
        delete process.env.DISCOVER_SEO_INNER;
        const mod = await import(`${pathToFileURL(path.join(tmp, "render.mjs")).href}?t=${Date.now()}`);
        const { SITE_URL } = mod as { SITE_URL?: string };
        const data = path.join(root, "public", "data");
        const now = new Date().toISOString();
        const pages = mod.renderSite({
          places: readJson(path.join(data, "places.json"), { places: [] }).places ?? [],
          hotels: readJson(path.join(data, "hotels.json"), { hotels: [] }).hotels ?? [],
          events: readJson(path.join(data, "events.json"), { events: [] }).events ?? [],
          photos: readJson(path.join(data, "food-photos.json"), { dishes: {}, city: {} }),
          now,
        }) as {
          path: string; title: string; description: string; image?: string; type?: string; jsonld: object[]; body: string;
          priority?: number; changefreq?: string; lastmod?: string;
        }[];
        const site = SITE_URL ?? "";
        const template = fs.readFileSync(path.join(outDir, "index.html"), "utf8");
        const seen = new Set<string>();
        for (const p of pages) {
          if (seen.has(p.path)) continue;
          seen.add(p.path);
          const url = `${site}${p.path}`;
          const image = p.image || `${site}/og.png`;
          const head = [
            `<title>${esc(p.title)}</title>`,
            `<meta name="description" content="${esc(p.description)}" />`,
            `<link rel="canonical" href="${esc(url)}" />`,
            `<meta property="og:site_name" content="Discover Tel Aviv" />`,
            `<meta property="og:title" content="${esc(p.title)}" />`,
            `<meta property="og:description" content="${esc(p.description)}" />`,
            `<meta property="og:type" content="${p.type ?? "website"}" />`,
            `<meta property="og:url" content="${esc(url)}" />`,
            `<meta property="og:image" content="${esc(image)}" />`,
            `<meta name="twitter:card" content="summary_large_image" />`,
            `<meta name="twitter:image" content="${esc(image)}" />`,
            ...p.jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`),
          ].join("\n    ");
          const html = template
            .replace(/<title>[\s\S]*?<\/title>/, "")
            .replace(/<meta (name|property)="(description|og:[a-z_]+|twitter:[a-z]+)"[^>]*>\s*/g, "")
            .replace("</head>", `    ${head}\n  </head>`)
            .replace('<div id="root"></div>', `<div id="root">${p.body}</div>`);
          const file = p.path === "/" ? path.join(outDir, "index.html") : path.join(outDir, p.path, "index.html");
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, html);
        }
        const day = now.slice(0, 10);
        const unique = pages.filter((p, i) => pages.findIndex((x) => x.path === p.path) === i);
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique
          .map((p) => `  <url><loc>${esc(`${site}${p.path}`)}</loc><lastmod>${p.lastmod ?? day}</lastmod>${p.changefreq ? `<changefreq>${p.changefreq}</changefreq>` : ""}${p.priority != null ? `<priority>${p.priority.toFixed(1)}</priority>` : ""}</url>`)
          .join("\n")}\n</urlset>\n`;
        fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap);
        fs.writeFileSync(path.join(outDir, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /auth\n\nSitemap: ${site}/sitemap.xml\n`);
        console.log(`[seo] wrote ${seen.size} pages and sitemap.xml in ${Date.now() - started} ms`);
      } catch (err) {
        // Never break the site build over SEO pages.
        delete process.env.DISCOVER_SEO_INNER;
        console.warn("[seo] skipped:", err);
      }
    },
  };
};
