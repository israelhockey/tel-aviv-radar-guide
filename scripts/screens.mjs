// Screenshots of the built site for design review. Used by .github/workflows/screens.yml.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:4173";
const routes = (process.env.ROUTES || "/").split(/\s+/).filter(Boolean);
const sizes = [["mobile", 390, 844], ["desktop", 1440, 900]];
await mkdir("screens", { recursive: true });
const browser = await chromium.launch();
for (const [name, width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: name === "mobile" ? 2 : 1 });
  for (const r of routes) {
    await page.goto(BASE + r, { waitUntil: "networkidle", timeout: 45000 }).catch(() => undefined);
    await page.waitForTimeout(4000);
    const slug = r === "/" ? "home" : r.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    await page.screenshot({ path: `screens/${slug}-${name}.png`, fullPage: process.env.FULL === "1" });
    console.log("shot", slug, name);
  }
  await page.close();
}
await browser.close();
