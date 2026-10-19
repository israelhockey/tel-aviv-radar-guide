// One-off helper for design mockups: downloads images (direct URLs, or the lead photo of a
// Wikipedia article) into ./grab. Used by .github/workflows/grab-assets.yml.
import { mkdir, writeFile } from "node:fs/promises";
const UA = "TLV-Radar/1.0 (free public city guide)";
const items = (process.env.ITEMS || "").split(/\s+/).filter(Boolean);
await mkdir("grab", { recursive: true });
for (const it of items) {
  const [name, ...rest] = it.split("=");
  let url = rest.join("=");
  try {
    if (url.startsWith("wiki:")) {
      const title = decodeURIComponent(url.slice(5));
      const u = new URL("https://en.wikipedia.org/w/api.php");
      for (const [k, v] of Object.entries({ action: "query", format: "json", titles: title, redirects: "1", prop: "pageimages", piprop: "thumbnail|name", pithumbsize: "1600" })) u.searchParams.set(k, v);
      const j = await (await fetch(u, { headers: { "User-Agent": UA } })).json();
      const p = Object.values(j.query.pages)[0];
      url = p.thumbnail?.source;
      console.log(name, "→", p.pageimage);
      if (!url) continue;
    }
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(res.status);
    const ext = (res.headers.get("content-type") || "").includes("webp") ? "webp" : (res.headers.get("content-type") || "").includes("png") ? "png" : "jpg";
    await writeFile(`grab/${name}.${ext}`, Buffer.from(await res.arrayBuffer()));
    console.log("saved", name, ext);
  } catch (e) { console.log("failed", name, String(e)); }
}
