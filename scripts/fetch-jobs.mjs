// Jobs in Tel Aviv from companies' public job boards (Greenhouse, Lever, SmartRecruiters).
// These boards publish openings in a public format for anyone to list. Writes public/data/jobs.json.
// Run nightly by .github/workflows/refresh-city.yml.
import { readFile, writeFile } from "node:fs/promises";

const UA = "Discover-Tel-Aviv/1.0 (free public city guide)";
// Company board names to try. Unknown names simply return nothing.
const COMPANIES = [
  "lemonade", "riskified", "snyk", "wiz", "wizinc", "gongio", "axonius", "orcasecurity", "catonetworks", "yotpo", "lightricks",
  "appsflyer", "hibob", "papaya", "papayaglobal", "tipalti", "pagaya", "melio", "rapyd", "forter", "transmitsecurity", "armis",
  "fireblocks", "jfrog", "payoneer", "taboola", "outbrain", "similarweb", "via", "ridewithvia", "nuvei", "playtika", "moonactive",
  "fiverr", "monday", "wix", "lusha", "honeybook", "vastdata", "run-ai", "torq", "cyera", "aqua", "aquasecurity", "checkmarx",
  "redis", "redislabs", "obligo", "elementor", "bigid", "sentinelone", "cybereason", "deel", "atera", "connecteam", "nanit",
  "hailo", "datarails", "tabnine", "lumen", "zesty", "apiiro", "coralogix", "komodor", "spot", "pecan", "unit", "duda",
];
const TLV = /tel[\s-]?aviv|תל אביב|ramat gan|herzliya|israel/i;
const TLV_STRICT = /tel[\s-]?aviv|תל אביב/i;

const get = async (u) => {
  const res = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
};

const jobs = [];
const report = [];
for (const c of COMPANIES) {
  let n = 0;
  const gh = await get(`https://boards-api.greenhouse.io/v1/boards/${c}/jobs`);
  for (const j of gh?.jobs ?? []) {
    const loc = j.location?.name ?? "";
    if (!TLV.test(loc)) continue;
    jobs.push({ id: `gh:${c}:${j.id}`, title: j.title, company: gh.meta?.name ?? c, location: loc, url: j.absolute_url, posted: j.updated_at ?? null, dept: j.departments?.[0]?.name ?? null, source: "Greenhouse" });
    n++;
  }
  const lv = await get(`https://api.lever.co/v0/postings/${c}?mode=json`);
  for (const j of Array.isArray(lv) ? lv : []) {
    const loc = j.categories?.location ?? "";
    if (!TLV.test(loc)) continue;
    jobs.push({ id: `lv:${c}:${j.id}`, title: j.text, company: c, location: loc, url: j.hostedUrl, posted: j.createdAt ? new Date(j.createdAt).toISOString() : null, dept: j.categories?.team ?? null, source: "Lever" });
    n++;
  }
  const sr = await get(`https://api.smartrecruiters.com/v1/companies/${c}/postings?limit=100`);
  for (const j of sr?.content ?? []) {
    const loc = [j.location?.city, j.location?.country].filter(Boolean).join(", ");
    if (!TLV.test(loc)) continue;
    jobs.push({ id: `sr:${c}:${j.id}`, title: j.name, company: j.company?.name ?? c, location: loc, url: `https://jobs.smartrecruiters.com/${j.company?.identifier ?? c}/${j.id}`, posted: j.releasedDate ?? null, dept: j.department?.label ?? null, source: "SmartRecruiters" });
    n++;
  }
  if (n) report.push(`${c}:${n}`);
}

// Keep Tel Aviv first; Israel-wide roles (often remote or hybrid near Tel Aviv) after.
jobs.sort((a, b) => Number(TLV_STRICT.test(b.location)) - Number(TLV_STRICT.test(a.location)) || String(b.posted ?? "").localeCompare(String(a.posted ?? "")));
const company = (s) => s.replace(/(^|[\s-])\w/g, (m) => m.toUpperCase());
for (const j of jobs) if (j.company === j.company.toLowerCase()) j.company = company(j.company);

console.log(`::notice::jobs: ${jobs.length} from ${report.length} companies (${report.join(", ")})`);
if (jobs.length < 20) {
  console.log("Too few jobs found; keeping the previous file.");
  process.exit(0);
}
try {
  const prev = JSON.parse(await readFile("public/data/jobs.json", "utf8"));
  if (JSON.stringify(prev.jobs) === JSON.stringify(jobs)) process.exit(0);
} catch { /* first run */ }
await writeFile("public/data/jobs.json", JSON.stringify({ updated: new Date().toISOString(), jobs }) + "\n");
