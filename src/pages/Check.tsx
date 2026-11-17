import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Check as CheckIcon, ChevronDown, ExternalLink, FileText, Link2, Scale, Share2, SquareStack } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { addressEn, fetchActivity, isLive, nearestAddress, stageEn, streetNames, titleEn, typeEn, type Activity, type ActivityKind } from "@/lib/live/build";
import { IMPACT_STYLE, PERMIT_STEPS, canTranslateOnDevice, googleTranslateUrl, impactOf, permitStep, requestFacts, requestSections, statusCheck, translateOnDevice } from "@/lib/live/buildInsight";
import { neighbourhoodOf } from "@/lib/live/geo";
import { hoodSlug } from "@/lib/areas";
import { AddressSearch, NeighbourhoodChips } from "@/components/build/AddressSearch";
import { ActivityMap, KIND_COLOR } from "@/components/build/ActivityMap";
import { english, txLookup, useTx } from "@/lib/live/tx";
import { SearchNudge, SignupModal, WatchBox } from "@/components/build/Signup";
import { countSearch } from "@/lib/live/member";
import { COMPARE, MAX_COMPARE, WATCHED, addTo, getList, has, onChange, removeFrom, shareLink, type Spot } from "@/lib/live/saved";

const KINDS: { id: ActivityKind; en: string; he: string }[] = [
  { id: "permit", en: "Permit requests and permits", he: "בקשות והיתרי בניה" },
  { id: "site", en: "Active building sites", he: "אתרי בניה פעילים" },
  { id: "night", en: "Night works", he: "עבודות לילה" },
  { id: "road", en: "Road works and closures", he: "עבודות כביש וחסימות" },
  { id: "rail", en: "Light rail construction", he: "עבודות הרכבת הקלה" },
  { id: "business", en: "New businesses (last 12 months)", he: "עסקים חדשים (12 חודשים)" },
  { id: "zone", en: "Nightlife zone", he: "אזור בילוי" },
  { id: "danger", en: "Dangerous buildings", he: "מבנים מסוכנים" },
  { id: "plan", en: "Town plans covering this spot", he: "תכניות בניין עיר במקום" },
];
const RADII = [100, 250, 500];

const itemUrl = (id: string) => { const u = new URL(window.location.href); u.searchParams.set("item", id); return u.toString(); };

const fmtDate = (ms: number | undefined, lang: string) =>
  ms ? new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jerusalem" }).format(new Date(ms)) : null;

const ItemCard = ({ a, open, onToggle, streets }: { a: Activity; open: boolean; onToggle: () => void; streets?: { he: string; en?: string }[] }) => {
  const { lang } = useI18n();
  const he = lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const T = (x: { en: string; he: string }) => (he ? x.he : x.en);
  const kind = KINDS.find((k) => k.id === a.kind)!;
  // English side: our own wording first, then the nightly machine translation of the city's text.
  useTx([a.title, a.stage, a.detail, a.hours, a.address], !he);
  const hoursEn = (x?: string) => x?.replace("אישור לעבודת לילה", "Night work approved").replace("עבודות יום", "day works").replace("עבודות לילה", "night works");
  // Names (businesses, plans) and addresses are kept as names, never machine-translated.
  const title = he ? a.title : a.kind === "business" || a.kind === "plan" ? titleEn(a) : english(a.title, typeEn);
  const stage = he ? a.stage : english(a.stage, stageEn);
  const address = he ? a.address : addressEn(a.address, streets) ?? a.address;
  const hours = he ? a.hours : english(a.hours, hoursEn);
  const detailEn = !he && a.kind !== "business" ? txLookup(a.detail) : undefined;
  const impact = impactOf(a);
  const style = IMPACT_STYLE[impact.level];
  const flags = statusCheck(a);
  const facts = requestFacts(a.detail);
  const sections = requestSections(a.detail);
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const dates = [
    a.opened && [L("Requested", "הוגשה"), fmtDate(a.opened, lang)],
    a.permitted && [L("Permit granted", "ההיתר ניתן"), fmtDate(a.permitted, lang)],
    a.kind === "permit" && a.start && [L("Construction started", "תחילת בניה"), fmtDate(a.start, lang)],
    a.expires && [L("Deadline to start work", "תוקף ההיתר"), fmtDate(a.expires, lang)],
    a.kind !== "permit" && a.start && [a.kind === "plan" ? L("Deposited", "הופקדה") : L("From", "מ-"), fmtDate(a.start, lang)],
    a.end && [a.kind === "plan" ? L("In force since", "בתוקף מ-") : L("Until", "עד"), fmtDate(a.end, lang)],
  ].filter(Boolean) as [string, string][];
  const step = a.kind === "permit" ? permitStep(a) : -1;
  const [copied, setCopied] = useState(false);
  const shareThis = () => shareLink(itemUrl(a.id), `${title}${address ? ` · ${address}` : ""}`, () => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); });
  const noisy = a.kind === "site" || a.kind === "night" || a.kind === "road" || a.kind === "rail";
  const translate = async () => {
    if (!a.detail) return;
    setTranslating(true);
    const r = await translateOnDevice(a.detail);
    setTranslating(false);
    if (r) setTranslated(r);
    else window.open(googleTranslateUrl(a.detail), "_blank", "noopener");
  };
  return (
    <li id={`item-${a.id}`} className={`relative scroll-mt-24 rounded-[10px] border-2 bg-card transition-colors ${open ? "border-foreground" : "border-border"}`}>
      <button onClick={shareThis} aria-label={L("Share this one", "שיתוף הפריט הזה")} title={L("Share this one", "שיתוף הפריט הזה")}
        className="absolute bottom-3 end-12 h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground">
        {copied ? <CheckIcon className="h-4 w-4 text-[#2f9e44]" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
      </button>
      {copied && <span className="absolute bottom-12 end-4 rounded bg-foreground text-background px-2 py-1 text-[12px] font-semibold" role="status">{L("Link copied", "הקישור הועתק")}</span>}
      <button onClick={onToggle} aria-expanded={open} className="w-full text-start p-4 flex gap-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: KIND_COLOR[a.kind] }} aria-hidden />
        <span className="min-w-0 flex-1 pe-8">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold uppercase tracking-wider" style={{ color: KIND_COLOR[a.kind] }}>
            {he ? kind.he : kind.en}
            <span className="text-muted-foreground normal-case tracking-normal font-semibold tabular">{a.distance} {L("m away", "מ' ממך")}</span>
          </span>
          <span className="mt-1 block font-display text-[19px] leading-snug" dir="auto">{title}</span>
          {address && <span className="mt-0.5 block text-[14px] text-muted-foreground" dir="auto">{address}</span>}
          <span className="mt-2 flex flex-wrap gap-1.5">
            {stage && <span className="rounded-[4px] bg-secondary px-2 py-0.5 text-[12px] font-semibold" dir="auto">{stage}</span>}
            {a.tama38 && a.kind === "permit" && <span className="rounded-[4px] bg-[#ffcb05] text-[#0b1a33] px-2 py-0.5 text-[12px] font-bold">{L("TAMA 38", "תמ״א 38")}</span>}
            {a.units ? <span className="rounded-[4px] bg-[#d6e4ff] text-[#0b1a33] px-2 py-0.5 text-[12px] font-semibold">{a.units} {L("homes", "יח״ד")}</span> : null}
            {hours && <span className="rounded-[4px] bg-[#f3d9fa] text-[#0b1a33] px-2 py-0.5 text-[12px] font-semibold" dir="auto">{hours}</span>}
            {flags.some((f) => f.downgrade) && <span className="rounded-[4px] border border-[#f59f00] text-[#f59f00] px-2 py-0.5 text-[12px] font-bold">{L("Status may be out of date", "ייתכן שהסטטוס לא עדכני")}</span>}
          </span>
        </span>
        <span className="shrink-0 flex flex-col items-end gap-2">
          <span className="rounded-[6px] px-2 py-1 text-center leading-none" style={{ background: style.bg, color: style.fg }} title={T(style)}>
            <span className="block font-poster text-[26px]">{impact.score}</span>
            <span className="block text-[10px] font-bold uppercase">{L("impact", "השפעה")}</span>
          </span>
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-5 ps-10 text-[14px] space-y-4">
          {step >= 0 && (
            <ol className="flex items-center gap-1" aria-label={L("Progress", "התקדמות")}>
              {PERMIT_STEPS.map((x, i) => (
                <li key={x.en} className="flex-1">
                  <span className={`block h-2 rounded-full ${i <= step ? "bg-[#0057ff]" : "bg-secondary"}`} />
                  <span className={`mt-1 block text-[12px] ${i === step ? "font-bold" : "text-muted-foreground"}`}>{T(x)}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="rounded-[8px] p-3" style={{ background: `${style.bg}22` }}>
            <p className="font-bold">{T(style)}: {impact.score}/10</p>
            <ul className="mt-1 list-disc ps-5 space-y-0.5">{impact.reasons.map((r) => <li key={r.en}>{T(r)}</li>)}</ul>
          </div>

          {flags.map((f) => (
            <p key={f.en} className={`rounded-[8px] p-3 ${f.tone === "warn" ? "bg-[#fff4c2] text-[#0b1a33]" : "bg-secondary"}`}>{T(f)}</p>
          ))}

          {dates.length > 0 && <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">{dates.flatMap(([k, v]) => [<dt key={`${k}-t`} className="text-muted-foreground">{k}</dt>, <dd key={`${k}-d`} className="font-semibold tabular">{v}</dd>])}</dl>}

          {facts.length > 0 && (
            <div>
              <p className="font-bold">{L("What's planned", "מה מתוכנן")}</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">{facts.map((f) => <li key={f.en} className="rounded-[4px] bg-secondary px-2 py-1 font-semibold">{T(f)}</li>)}</ul>
            </div>
          )}
          {!he && a.kind === "plan" && <p><span className="text-muted-foreground">Plan name: </span><span dir="rtl" className="font-semibold">{a.title}</span></p>}
          {!he && a.kind === "business" && <p><span className="text-muted-foreground">Business name: </span><span dir="rtl" className="font-semibold">{a.title}</span></p>}
          {!he && !detailEn && sections.length > 0 && (
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
              {sections.flatMap((x) => [<dt key={`${x.label.en}-t`} className="text-muted-foreground">{x.label.en}</dt>, <dd key={`${x.label.en}-d`} dir={x.en ? "ltr" : "rtl"}>{x.en ?? x.items}</dd>])}
            </dl>
          )}

          {a.detail && a.kind !== "business" && (
            he ? <p className="whitespace-pre-line leading-relaxed">{a.detail.length > 900 ? `${a.detail.slice(0, 900)}…` : a.detail}</p> : (
              <div>
                {detailEn || translated ? (
                  <div>
                    <p className="font-bold">{a.kind === "permit" || a.kind === "site" ? "What's requested" : a.id.startsWith("pnight-") ? "Carried out by" : "Details"}</p>
                    <p className="mt-1 whitespace-pre-line leading-relaxed">{detailEn ?? translated}</p>
                    <button onClick={() => setShowOriginal(!showOriginal)} className="mt-2 text-[13px] font-semibold text-muted-foreground underline underline-offset-2">{showOriginal ? "Hide the Hebrew" : "Machine-translated. Show the original Hebrew"}</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={translate} disabled={translating} className="h-9 rounded-md bg-sea text-sea-foreground px-3 font-bold">{translating ? "…" : canTranslateOnDevice() ? "Translate the full description" : "Translate the full description (Google)"}</button>
                    <button onClick={() => setShowOriginal(!showOriginal)} className="h-9 rounded-md border border-border px-3 font-semibold">{showOriginal ? "Hide the Hebrew" : "Show the original Hebrew"}</button>
                  </div>
                )}
                {showOriginal && <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground" dir="rtl">{a.detail.length > 900 ? `${a.detail.slice(0, 900)}…` : a.detail}</p>}
              </div>
            )
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={shareThis} className="h-9 rounded-md bg-foreground text-background px-3 font-bold inline-flex items-center gap-1.5"><Share2 className="h-4 w-4" aria-hidden />{L("Share this one", "שיתוף")}</button>
            <button onClick={() => navigator.clipboard?.writeText(itemUrl(a.id)).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }).catch(() => undefined)} className="h-9 rounded-md border border-border px-3 font-semibold inline-flex items-center gap-1.5"><Link2 className="h-4 w-4" aria-hidden />{copied ? L("Copied", "הועתק") : L("Copy link", "העתקת קישור")}</button>
            {noisy && <Link to="/construction-noise-rules" className="h-9 rounded-md border border-border px-3 font-semibold inline-flex items-center gap-1.5"><Scale className="h-4 w-4" aria-hidden />{L("Your rights: noise hours", "הזכויות שלך: שעות רעש")}</Link>}
            {noisy && <a href="tel:106" className="h-9 rounded-md border border-border px-3 font-semibold inline-flex items-center">{L("Complain: call 106", "תלונה: חייגו 106")}</a>}
          </div>
          {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-bold text-sea hover:underline"><ExternalLink className="h-4 w-4" aria-hidden />{a.kind === "plan" ? L("Plan documents (city site, Hebrew)", "מסמכי התכנית (אתר העירייה)") : L("Drawings on the city's building archive (Hebrew)", "תכניות בארכיון הבניין העירוני")}</a>}
        </div>
      )}
    </li>
  );
};

/** Keep up to 3 addresses to see side by side on /compare. */
const CompareButton = ({ spot }: { spot: Spot }) => {
  const { lang } = useI18n();
  const L = (en: string, h: string) => (lang === "he" ? h : en);
  const [list, setList] = useState<Spot[]>(() => getList(COMPARE));
  useEffect(() => onChange(COMPARE, () => setList(getList(COMPARE))), []);
  const inList = has(COMPARE, spot) && list.length > 0;
  return (
    <span className="inline-flex gap-2">
      <button onClick={() => (inList ? removeFrom(COMPARE, spot) : addTo(COMPARE, spot, MAX_COMPARE))} aria-pressed={inList}
        className={`h-10 rounded-md px-4 text-[15px] font-bold inline-flex items-center gap-2 ${inList ? "bg-white text-[#0057ff]" : "bg-white/15 hover:bg-white/25"}`}>
        <SquareStack className="h-4 w-4" aria-hidden />{inList ? L("In your comparison", "ברשימת ההשוואה") : L("Compare", "השוואה")}
      </button>
      {list.length >= 2 && <Link to="/compare" className="h-10 rounded-md bg-[#ffcb05] text-[#0b1a33] px-4 text-[15px] font-extrabold inline-flex items-center">{L(`Compare ${list.length}`, `השוואת ${list.length}`)}</Link>}
    </span>
  );
};

const Check = () => {
  const { lang } = useI18n();
  const he = lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const [params, setParams] = useSearchParams();
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const radius = RADII.includes(Number(params.get("r"))) ? Number(params.get("r")) : 250;
  const valid = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat - 32.08) < 0.12 && Math.abs(lon - 34.79) < 0.12;
  const [label, setLabel] = useState(params.get("a") ?? "");
  const [show, setShow] = useState<ActivityKind | "all">("all");
  const [finished, setFinished] = useState(false);
  const [sel, setSel] = useState<string | null>(params.get("item"));

  useEffect(() => { setLabel(params.get("a") ?? ""); }, [params]);
  useEffect(() => {
    if (valid && !params.get("a")) nearestAddress(lat, lon).then((a) => a && setLabel(he ? a.label : a.labelEn ?? a.label)).catch(() => undefined);
  }, [lat, lon, valid]);
  useEffect(() => { document.title = `${label || L("Your address", "הכתובת שלך")}: ${L("construction and permits nearby", "בניה והיתרים בסביבה")} · Discover Tel Aviv`; }, [label, lang]);

  const streets = useQuery({ queryKey: ["street-names"], queryFn: streetNames, staleTime: Infinity, enabled: lang === "en" });
  const [sort, setSort] = useState<"near" | "impact">("impact");
  const q = useQuery({ queryKey: ["activity", lat, lon, radius], queryFn: () => fetchActivity(lat, lon, radius), enabled: valid, staleTime: 10 * 60_000 });
  const all = useMemo(() => (q.data ?? []).filter((a) => finished || isLive(a)), [q.data, finished]);
  const counts = useMemo(() => Object.fromEntries(KINDS.map((k) => [k.id, all.filter((a) => a.kind === k.id).length])) as Record<ActivityKind, number>, [all]);
  const list = all.filter((a) => show === "all" || a.kind === show).slice().sort((x, y) => sort === "impact" ? impactOf(y).score - impactOf(x).score || x.distance - y.distance : x.distance - y.distance);
  const finishedCount = (q.data ?? []).length - (q.data ?? []).filter(isLive).length;
  const hood = valid ? neighbourhoodOf({ lat, lon }) : null;
  const inReview = all.filter((a) => a.kind === "permit" && /בתהליך/.test(a.stage ?? "")).length;
  const building = all.filter((a) => (a.kind === "permit" && /בבניה|קיים היתר/.test(a.stage ?? "")) || a.kind === "site").length;

  const setRadius = (r: number) => { const p = new URLSearchParams(params); p.set("r", String(r)); setParams(p, { replace: true }); };
  const share = () => { const u = new URL(window.location.href); u.searchParams.delete("item"); shareLink(u.toString(), document.title); };
  // A shared link to one item: open it, make sure it's in the list, and scroll to it once loaded.
  const wanted = params.get("item");
  useEffect(() => {
    if (!wanted || !q.data) return;
    const it = q.data.find((a) => a.id === wanted);
    if (!it) return;
    if (!isLive(it)) setFinished(true);
    setShow("all");
    setSel(wanted);
    window.setTimeout(() => document.getElementById(`item-${wanted}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }, [wanted, q.data]);
  const spot: Spot = { label, lat, lon, r: radius };
  const [watchOpen, setWatchOpen] = useState(false);
  const [searches, setSearches] = useState(0);
  useEffect(() => { if (valid) setSearches(countSearch(lat, lon)); }, [lat, lon, valid]);
  const reportUrl = `/report?lat=${lat}&lon=${lon}&r=${radius}${label ? `&a=${encodeURIComponent(label)}` : ""}`;
  const select = (id: string) => { setSel(id); window.setTimeout(() => document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50); };

  return (
    <SiteLayout>
      {valid && <SearchNudge count={searches} spot={spot} />}
      <SignupModal open={watchOpen} onClose={() => setWatchOpen(false)} spot={spot} source="watch-top"
        title={L("Watch this address", "עקבו אחרי הכתובת")}
        body={L("Free email alerts when anything new is filed, approved or starts nearby.", "התראות חינם במייל כשמשהו חדש מוגש, מאושר או מתחיל בסביבה.")} />
      <section className="bg-[#0057ff] text-white">
        <div className="container-page pt-8 pb-8">
          <AddressSearch />
          <details className="mt-3"><summary className="cursor-pointer text-[14px] font-semibold text-white/85">{L("Browse by neighbourhood", "חיפוש לפי שכונה")}</summary><NeighbourhoodChips className="mt-3" active={label} /></details>
          {valid && (
            <>
              <p className="mt-8 text-[15px] font-bold text-white/85">{L("Construction and permits near", "בניה והיתרים ליד")}</p>
              <h1 className="font-display text-[40px] sm:text-[72px] leading-[0.92]" dir="auto">{label || "…"}</h1>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {RADII.map((r) => (
                  <button key={r} onClick={() => setRadius(r)} aria-pressed={r === radius} className={`h-10 rounded-md px-4 text-[15px] font-bold ${r === radius ? "bg-[#ffcb05] text-[#0b1a33]" : "bg-white/15 hover:bg-white/25"}`}>{r} {L("m", "מ'")}</button>
                ))}
                <button onClick={() => setWatchOpen(true)} className="h-10 rounded-md bg-[#ffcb05] text-[#0b1a33] px-4 text-[15px] font-extrabold inline-flex items-center gap-2"><BellRing className="h-4 w-4" aria-hidden />{L("Watch this address", "עקבו אחרי הכתובת")}</button>
                <span className="ms-auto inline-flex flex-wrap gap-2">
                <CompareButton spot={spot} />
                <Link to={reportUrl} className="h-10 rounded-md bg-white/15 px-4 text-[15px] font-bold inline-flex items-center gap-2 hover:bg-white/25"><FileText className="h-4 w-4" aria-hidden />{L("Address report", "דוח לכתובת")}</Link>
                <button onClick={share} className="h-10 rounded-md bg-white/15 px-4 text-[15px] font-bold inline-flex items-center gap-2 hover:bg-white/25"><Share2 className="h-4 w-4" aria-hidden />{L("Share", "שיתוף")}</button>
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      {!valid ? (
        <div className="container-page py-16"><p className="text-[18px]">{L("Type an address above to see what's being built around it.", "הקלידו כתובת למעלה כדי לראות מה נבנה סביבה.")}</p></div>
      ) : (
        <div className="container-page">
          {/* The headline numbers */}
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { n: inReview, en: "Permit requests under review", he: "בקשות היתר בבדיקה", c: "#d6e4ff" },
              { n: building, en: "Approved or being built", he: "אושרו או בבניה", c: "#ffd9d4" },
              { n: counts.night, en: "Night works", he: "עבודות לילה", c: "#f3d9fa" },
              { n: counts.road, en: "Road works and closures", he: "עבודות כביש וחסימות", c: "#fff4c2" },
            ].map((x) => (
              <div key={x.en} className="rounded-[10px] p-4 text-[#0b1a33] border-t-[3px] border-dashed border-[#0b1a33]" style={{ background: x.c }}>
                <p className="font-poster text-[56px]">{q.isLoading ? "…" : x.n}</p>
                <p className="text-[14px] font-semibold leading-snug">{he ? x.he : x.en}</p>
              </div>
            ))}
          </div>
          {!q.isLoading && (
            <button onClick={() => setWatchOpen(true)} className="mt-4 w-full rounded-[10px] bg-[#0b1a33] text-white px-5 py-4 text-start flex items-center gap-3 hover:bg-[#13284d]">
              <BellRing className="h-6 w-6 shrink-0 text-[#ffcb05]" aria-hidden />
              <span className="min-w-0 flex-1"><span className="block font-extrabold text-[17px]">{L("Get alerts for this address, free", "קבלו התראות לכתובת הזו, חינם")}</span><span className="block text-[14px] text-white/80">{L("Know before the scaffolding goes up: new permit requests, building sites, night works and road closures.", "דעו לפני שהפיגומים עולים: בקשות היתר חדשות, אתרי בניה, עבודות לילה וחסימות.")}</span></span>
              <span className="hidden sm:inline-flex h-10 items-center rounded-md bg-[#ffcb05] text-[#0b1a33] px-4 font-extrabold">{L("Watch this address", "עקבו אחרי הכתובת")}</span>
            </button>
          )}
          {q.isError && <p className="mt-6 rounded-md bg-secondary p-4">{L("The city's map service didn't answer. Please try again in a moment.", "שירות המפות של העירייה לא ענה. נסו שוב בעוד רגע.")}</p>}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,minmax(380px,46%)] items-start">
            <div className="order-2 lg:order-1 min-w-0">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShow("all")} aria-pressed={show === "all"} className={`h-9 rounded-md px-3.5 text-[14px] font-bold border ${show === "all" ? "bg-foreground text-background border-foreground" : "border-border"}`}>{L("Everything", "הכל")} <span className="tabular opacity-70">{all.length}</span></button>
                {KINDS.filter((k) => counts[k.id] > 0).map((k) => (
                  <button key={k.id} onClick={() => setShow(k.id)} aria-pressed={show === k.id} className={`h-9 rounded-md px-3.5 text-[14px] font-bold border inline-flex items-center gap-2 ${show === k.id ? "bg-foreground text-background border-foreground" : "border-border"}`}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k.id] }} aria-hidden />{he ? k.he : k.en} <span className="tabular opacity-70">{counts[k.id]}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[14px]">
                <span className="text-muted-foreground">{L("Sort by", "מיון לפי")}</span>
                {([["impact", L("Most disruptive", "הכי משפיע")], ["near", L("Nearest", "הכי קרוב")]] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setSort(k)} aria-pressed={sort === k} className={`h-8 rounded-md px-3 font-bold ${sort === k ? "bg-foreground text-background" : "bg-secondary"}`}>{label}</button>
                ))}
              </div>
              {q.isLoading ? (
                <div className="mt-5 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-[10px] bg-secondary animate-pulse" />)}</div>
              ) : list.length === 0 ? (
                <p className="mt-6 text-[17px]">{L(`Nothing active within ${radius} m right now. That's good news. Try a wider radius, or sign up and we'll tell you when that changes.`, `אין כרגע פעילות ברדיוס ${radius} מ'. אלה חדשות טובות. נסו רדיוס רחב יותר, או הירשמו ונעדכן כשמשהו ישתנה.`)}</p>
              ) : (
                <ul className="mt-5 space-y-3">{list.slice(0, 120).map((a) => <ItemCard key={a.id} a={a} streets={streets.data} open={sel === a.id} onToggle={() => setSel(sel === a.id ? null : a.id)} />)}</ul>
              )}
              {finishedCount > 0 && (
                <label className="mt-5 flex items-center gap-2 text-[14px]">
                  <input type="checkbox" checked={finished} onChange={(e) => setFinished(e.target.checked)} className="h-4 w-4" />
                  {L(`Also show ${finishedCount} finished or older projects`, `הצגת עוד ${finishedCount} פרויקטים שהסתיימו או ישנים`)}
                </label>
              )}
            </div>
            <div className="order-1 lg:order-2 lg:sticky lg:top-20 space-y-4">
              <ActivityMap lat={lat} lon={lon} radius={radius} items={list} selected={sel} onSelect={select} className="h-[340px] sm:h-[460px]" />
              <WatchBox spot={spot} />
            </div>
          </div>

          <section className="mt-14">
            <div className="border-b-[3px] border-foreground pb-2"><h2 className="font-display text-[30px] sm:text-[36px] leading-none">{L("Also around here", "עוד בסביבה")}</h2></div>
            <div className="mt-5 flex flex-wrap gap-2">
              {hood && <Link to={`/area/${hoodSlug(hood)}`} className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{he ? hood.he : hood.en}: {L("places and events", "מקומות ואירועים")}</Link>}
              <Link to="/construction-noise-rules" className="h-11 inline-flex items-center rounded-md bg-[#fff4c2] text-[#0b1a33] px-4 font-bold">{L("Noise rules and how to complain", "כללי רעש ואיך מתלוננים")}</Link>
              <Link to="/compare" className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{L("Compare apartments", "השוואת דירות")}</Link>
              <Link to="/street" className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{L("Construction by street", "בניה לפי רחוב")}</Link>
              <Link to="/live?layers=parking" className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{L("Parking near here", "חניה בסביבה")}</Link>
              <Link to="/live?layers=traffic" className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{L("Live traffic", "תנועה עכשיו")}</Link>
              <Link to="/events" className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{L("What's on tonight", "מה קורה הערב")}</Link>
              <Link to="/guide" className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{L("Nearest shelters", "מקלטים קרובים")}</Link>
            </div>
          </section>
          <p className="mt-8 text-[12px] text-muted-foreground">{L("Source: City of Tel Aviv-Yafo open map data (building permits, building sites, night works, road works, light rail works, business licences, nightlife zones, dangerous buildings and town plans), updated by the city every night. Locations and details are as published by the city; check the city's building archive for official documents.", "מקור: המידע הפתוח של עיריית תל אביב-יפו (היתרי בניה, אתרי בניה, עבודות לילה, עבודות כביש, הרכבת הקלה, רישוי עסקים, אזורי בילוי, מבנים מסוכנים ותב״עות), מתעדכן מדי לילה. המיקומים והפרטים כפי שפורסמו בידי העירייה; למסמכים רשמיים ראו את ארכיון הבניין העירוני.")}</p>
        </div>
      )}
    </SiteLayout>
  );
};

export default Check;
