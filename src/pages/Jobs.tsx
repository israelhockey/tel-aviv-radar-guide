import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useJobs } from "@/lib/live/hooks";
import { relTime } from "@/components/radar/NewsCard";

// Rough job families from the title, for quick filtering.
const FAMILIES: { id: string; en: string; he: string; re: RegExp }[] = [
  { id: "eng", en: "Engineering", he: "פיתוח", re: /engineer|developer|devops|architect|sre|backend|frontend|full.?stack|software|qa|data engineer|mobile|security researcher/i },
  { id: "data", en: "Data & AI", he: "דאטה ו-AI", re: /data|analyst|machine learning|ml |ai |scientist|bi /i },
  { id: "product", en: "Product & design", he: "מוצר ועיצוב", re: /product|design|ux|ui/i },
  { id: "sales", en: "Sales & marketing", he: "מכירות ושיווק", re: /sales|account|marketing|growth|business development|bdr|sdr|partner|customer success|content|seo/i },
  { id: "ops", en: "Operations & finance", he: "תפעול וכספים", re: /finance|account(ant|ing)|legal|counsel|hr|people|talent|recruit|operations|office|admin|payroll|controller/i },
];

const Jobs = () => {
  const { t, lang } = useI18n();
  const { data, isLoading, isError } = useJobs();
  const [q, setQ] = useState("");
  const [fam, setFam] = useState<string | null>(null);
  const [tlvOnly, setTlvOnly] = useState(false);

  useEffect(() => {
    document.title = lang === "he" ? "משרות · Discover Tel Aviv" : "Jobs · Discover Tel Aviv";
  }, [lang]);

  const list = useMemo(() => {
    const f = FAMILIES.find((x) => x.id === fam);
    const n = q.trim().toLowerCase();
    return (data?.jobs ?? []).filter((j) =>
      (!f || f.re.test(j.title)) &&
      (!tlvOnly || /tel[\s-]?aviv|תל אביב/i.test(j.location)) &&
      (!n || `${j.title} ${j.company} ${j.dept ?? ""}`.toLowerCase().includes(n)));
  }, [data, q, fam, tlvOnly]);

  const companies = new Set((data?.jobs ?? []).map((j) => j.company)).size;
  const chip = (active: boolean) => `h-9 rounded-md px-3.5 text-[14px] border transition-colors ${active ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`;

  return (
    <SiteLayout>
      <section className="bg-[#5f3dc4] text-white">
        <div className="container-page py-10 sm:py-14">
          <h1 className="font-display text-[44px] sm:text-[68px] leading-[0.95]">{t("jobs.title")}</h1>
          <p className="mt-2 text-[17px] text-white/90">{data ? `${data.jobs.length} ${t("jobs.open")} ${companies} ${t("jobs.companies")}` : "…"}</p>
          <label className="mt-5 flex max-w-lg items-center gap-2 h-12 rounded-lg bg-white text-[hsl(230_35%_10%)] px-4">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("jobs.search")} className="flex-1 bg-transparent outline-none text-[15px]" />
          </label>
        </div>
      </section>
      <div className="container-page">
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => setFam(null)} aria-pressed={fam === null} className={chip(fam === null)}>{t("food.all")}</button>
          {FAMILIES.map((f) => <button key={f.id} onClick={() => setFam(fam === f.id ? null : f.id)} aria-pressed={fam === f.id} className={chip(fam === f.id)}>{lang === "he" ? f.he : f.en}</button>)}
          <label className="ms-auto inline-flex items-center gap-2 text-[14px]"><input type="checkbox" checked={tlvOnly} onChange={(e) => setTlvOnly(e.target.checked)} className="h-4 w-4" />{t("jobs.tlvOnly")}</label>
        </div>
        {isError && <p className="mt-6 text-[14px] text-muted-foreground">{t("jobs.none")}</p>}
        {isLoading && <div className="mt-6 h-40 rounded-lg bg-secondary animate-pulse" />}
        <ul className="mt-5 divide-y divide-border border-y border-border">
          {list.slice(0, 200).map((j) => (
            <li key={j.id}>
              <a href={j.url} target="_blank" rel="noopener noreferrer" className="group grid sm:grid-cols-[1fr,auto] gap-1 sm:gap-6 py-4 px-1 hover:bg-secondary/50">
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold group-hover:text-[#5f3dc4]">{j.title}</span>
                  <span className="block text-[14px] text-muted-foreground">{[j.company, j.dept, j.location].filter(Boolean).join(", ")}</span>
                </span>
                <span className="text-[13px] text-muted-foreground sm:text-end tabular">{j.posted ? relTime(j.posted, lang) : ""}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-10 rounded-lg bg-[#0f1530] text-white p-6 sm:flex sm:items-center sm:justify-between gap-6">
          <div>
            <p className="font-display text-[24px] leading-tight">{t("jobs.postTitle")}</p>
            <p className="mt-1 text-[14px] text-white/80">{t("jobs.postBody")}</p>
          </div>
          <Link to="/submit?kind=job" className="mt-4 sm:mt-0 shrink-0 inline-flex h-11 items-center rounded-lg bg-[#ffc233] text-[#1f1400] px-5 text-[14px] font-semibold">{t("jobs.post")}</Link>
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">{t("jobs.source")}</p>
      </div>
    </SiteLayout>
  );
};

export default Jobs;
