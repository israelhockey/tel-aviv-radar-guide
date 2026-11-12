import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BellRing, ChevronDown, ExternalLink, Share2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { fetchActivity, isLive, nearestAddress, stageEn, typeEn, type Activity, type ActivityKind } from "@/lib/live/build";
import { neighbourhoodOf } from "@/lib/live/geo";
import { hoodSlug } from "@/lib/areas";
import { AddressSearch } from "@/components/build/AddressSearch";
import { ActivityMap, KIND_COLOR } from "@/components/build/ActivityMap";

const KINDS: { id: ActivityKind; en: string; he: string }[] = [
  { id: "permit", en: "Permit requests and permits", he: "בקשות והיתרי בניה" },
  { id: "site", en: "Active building sites", he: "אתרי בניה פעילים" },
  { id: "night", en: "Night works", he: "עבודות לילה" },
  { id: "road", en: "Road works and closures", he: "עבודות כביש וחסימות" },
  { id: "danger", en: "Dangerous buildings", he: "מבנים מסוכנים" },
  { id: "plan", en: "Town plans covering this spot", he: "תכניות בניין עיר במקום" },
];
const RADII = [100, 250, 500];

const fmtDate = (ms: number | undefined, lang: string) =>
  ms ? new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jerusalem" }).format(new Date(ms)) : null;

const ItemCard = ({ a, open, onToggle }: { a: Activity; open: boolean; onToggle: () => void }) => {
  const { lang } = useI18n();
  const he = lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const kind = KINDS.find((k) => k.id === a.kind)!;
  const title = he ? a.title : typeEn(a.title);
  const stage = he ? a.stage : stageEn(a.stage);
  const dates = [
    a.opened && [L("Requested", "הוגשה"), fmtDate(a.opened, lang)],
    a.start && [a.kind === "plan" ? L("Deposited", "הופקדה") : L("From", "מ-"), fmtDate(a.start, lang)],
    a.end && [a.kind === "plan" ? L("In force since", "בתוקף מ-") : a.kind === "permit" ? L("Permit valid until", "תוקף ההיתר עד") : L("Until", "עד"), fmtDate(a.end, lang)],
  ].filter(Boolean) as [string, string][];
  return (
    <li id={`item-${a.id}`} className={`rounded-[10px] border-2 bg-card transition-colors ${open ? "border-foreground" : "border-border"}`}>
      <button onClick={onToggle} aria-expanded={open} className="w-full text-start p-4 flex gap-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: KIND_COLOR[a.kind] }} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold uppercase tracking-wider" style={{ color: KIND_COLOR[a.kind] }}>
            {he ? kind.he : kind.en}
            <span className="text-muted-foreground normal-case tracking-normal font-semibold tabular">{a.distance} {L("m away", "מ' ממך")}</span>
          </span>
          <span className="mt-1 block font-display text-[19px] leading-snug" dir="auto">{title}</span>
          {a.address && <span className="mt-0.5 block text-[14px] text-muted-foreground" dir="rtl">{a.address}</span>}
          <span className="mt-2 flex flex-wrap gap-1.5">
            {stage && <span className="rounded-[4px] bg-secondary px-2 py-0.5 text-[12px] font-semibold" dir="auto">{stage}</span>}
            {a.tama38 && a.kind === "permit" && <span className="rounded-[4px] bg-[#ffcb05] text-[#0b1a33] px-2 py-0.5 text-[12px] font-bold">{L("TAMA 38", "תמ״א 38")}</span>}
            {a.units ? <span className="rounded-[4px] bg-[#d6e4ff] text-[#0b1a33] px-2 py-0.5 text-[12px] font-semibold">{a.units} {L("homes", "יח״ד")}</span> : null}
            {a.hours && <span className="rounded-[4px] bg-[#f3d9fa] text-[#0b1a33] px-2 py-0.5 text-[12px] font-semibold" dir="auto">{a.hours}</span>}
          </span>
        </span>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="px-4 pb-4 ps-10 text-[14px]">
          {dates.length > 0 && <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">{dates.flatMap(([k, v]) => [<dt key={`${k}-t`} className="text-muted-foreground">{k}</dt>, <dd key={`${k}-d`} className="font-semibold tabular">{v}</dd>])}</dl>}
          {!he && a.title !== title && <p className="mt-3 text-[13px] text-muted-foreground" dir="rtl">{a.title}</p>}
          {a.detail && <p className="mt-3 whitespace-pre-line leading-relaxed" dir="rtl">{a.detail.length > 900 ? `${a.detail.slice(0, 900)}…` : a.detail}</p>}
          {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 font-bold text-sea hover:underline"><ExternalLink className="h-4 w-4" aria-hidden />{a.kind === "plan" ? L("Plan documents (city site)", "מסמכי התכנית (אתר העירייה)") : L("Drawings on the city's building archive", "תכניות בארכיון הבניין העירוני")}</a>}
        </div>
      )}
    </li>
  );
};

const AlertSignup = ({ lat, lon, label, radius }: { lat: number; lon: number; label: string; radius: number }) => {
  const { lang } = useI18n();
  const he = lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "dupe" | "error">("idle");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setState("busy");
    const { error } = await supabase.from("subscribers").insert({
      email: email.trim().toLowerCase(), source: "build-alerts",
      preferences: { lang, alerts: [{ label, lat, lon, radius, kinds: ["permit", "site", "night", "road", "danger"], created: new Date().toISOString() }] },
    } as never);
    setState(!error ? "done" : error.code === "23505" ? "dupe" : "error");
  };
  return (
    <section className="rounded-[10px] bg-[#ffcb05] text-[#0b1a33] p-5 sm:p-6">
      <p className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider"><BellRing className="h-4 w-4" aria-hidden />{L("Free alerts", "התראות חינם")}</p>
      <h2 className="mt-2 font-display text-[26px] sm:text-[30px] leading-tight">{L(`Tell me when something new starts within ${radius} m`, `עדכנו אותי כשמשהו חדש מתחיל ברדיוס ${radius} מ'`)}</h2>
      <p className="mt-2 text-[15px]">{L("New permit requests, approvals, building sites, night works and road closures near this address, by email. No spam, unsubscribe any time.", "בקשות היתר חדשות, אישורים, אתרי בניה, עבודות לילה וחסימות כביש ליד הכתובת, במייל. בלי ספאם, אפשר להסיר בכל עת.")}</p>
      {state === "done" ? (
        <p className="mt-4 rounded-md bg-white px-4 py-3 font-semibold" role="status">{L("You're on the list. We'll email you when something changes near this address.", "נרשמתם. נשלח מייל כשמשהו משתנה ליד הכתובת.")}</p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2">
          <label htmlFor="alert-email" className="sr-only">{L("Email", "אימייל")}</label>
          <input id="alert-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={L("you@example.com", "you@example.com")} dir="ltr" className="flex-1 h-12 rounded-md bg-white px-4 text-[16px] outline-none focus-visible:ring-4 focus-visible:ring-[#0b1a33]/30" />
          <button disabled={state === "busy"} className="h-12 rounded-md bg-[#0b1a33] text-white px-6 font-extrabold disabled:opacity-60">{state === "busy" ? "…" : L("Alert me", "עדכנו אותי")}</button>
        </form>
      )}
      {state === "dupe" && <p className="mt-2 text-[14px] font-semibold" role="status">{L("That email is already signed up. Watching more than one address is coming soon.", "המייל הזה כבר רשום. מעקב אחרי כמה כתובות יגיע בקרוב.")}</p>}
      {state === "error" && <p className="mt-2 text-[14px] font-semibold" role="status">{L("Something went wrong. Please try again.", "משהו השתבש. נסו שוב.")}</p>}
      <p className="mt-3 text-[12px] opacity-80">{L("We only use your email for these alerts.", "נשתמש במייל רק להתראות האלה.")} <Link to="/about#privacy" className="underline">{L("Privacy", "פרטיות")}</Link></p>
    </section>
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
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => { setLabel(params.get("a") ?? ""); }, [params]);
  useEffect(() => {
    if (valid && !params.get("a")) nearestAddress(lat, lon).then((a) => a && setLabel(he ? a.label : a.labelEn ?? a.label)).catch(() => undefined);
  }, [lat, lon, valid]);
  useEffect(() => { document.title = `${label || L("Your address", "הכתובת שלך")}: ${L("construction and permits nearby", "בניה והיתרים בסביבה")} · Discover Tel Aviv`; }, [label, lang]);

  const q = useQuery({ queryKey: ["activity", lat, lon, radius], queryFn: () => fetchActivity(lat, lon, radius), enabled: valid, staleTime: 10 * 60_000 });
  const all = useMemo(() => (q.data ?? []).filter((a) => finished || isLive(a)), [q.data, finished]);
  const counts = useMemo(() => Object.fromEntries(KINDS.map((k) => [k.id, all.filter((a) => a.kind === k.id).length])) as Record<ActivityKind, number>, [all]);
  const list = all.filter((a) => show === "all" || a.kind === show);
  const finishedCount = (q.data ?? []).length - (q.data ?? []).filter(isLive).length;
  const hood = valid ? neighbourhoodOf({ lat, lon }) : null;
  const inReview = all.filter((a) => a.kind === "permit" && /בתהליך/.test(a.stage ?? "")).length;
  const building = all.filter((a) => (a.kind === "permit" && /בבניה|קיים היתר/.test(a.stage ?? "")) || a.kind === "site").length;

  const setRadius = (r: number) => { const p = new URLSearchParams(params); p.set("r", String(r)); setParams(p, { replace: true }); };
  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: document.title, url }).catch(() => undefined);
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${document.title} ${url}`)}`, "_blank", "noopener");
  };
  const select = (id: string) => { setSel(id); window.setTimeout(() => document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50); };

  return (
    <SiteLayout>
      <section className="bg-[#0057ff] text-white">
        <div className="container-page pt-8 pb-8">
          <AddressSearch />
          {valid && (
            <>
              <p className="mt-8 text-[15px] font-bold text-white/85">{L("Construction and permits near", "בניה והיתרים ליד")}</p>
              <h1 className="font-display text-[40px] sm:text-[72px] leading-[0.92]" dir="auto">{label || "…"}</h1>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {RADII.map((r) => (
                  <button key={r} onClick={() => setRadius(r)} aria-pressed={r === radius} className={`h-10 rounded-md px-4 text-[15px] font-bold ${r === radius ? "bg-[#ffcb05] text-[#0b1a33]" : "bg-white/15 hover:bg-white/25"}`}>{r} {L("m", "מ'")}</button>
                ))}
                <button onClick={share} className="ms-auto h-10 rounded-md bg-white/15 px-4 text-[15px] font-bold inline-flex items-center gap-2 hover:bg-white/25"><Share2 className="h-4 w-4" aria-hidden />{L("Share", "שיתוף")}</button>
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
              {q.isLoading ? (
                <div className="mt-5 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-[10px] bg-secondary animate-pulse" />)}</div>
              ) : list.length === 0 ? (
                <p className="mt-6 text-[17px]">{L(`Nothing active within ${radius} m right now. That's good news. Try a wider radius, or sign up and we'll tell you when that changes.`, `אין כרגע פעילות ברדיוס ${radius} מ'. אלה חדשות טובות. נסו רדיוס רחב יותר, או הירשמו ונעדכן כשמשהו ישתנה.`)}</p>
              ) : (
                <ul className="mt-5 space-y-3">{list.slice(0, 120).map((a) => <ItemCard key={a.id} a={a} open={sel === a.id} onToggle={() => setSel(sel === a.id ? null : a.id)} />)}</ul>
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
              <AlertSignup lat={lat} lon={lon} label={label} radius={radius} />
            </div>
          </div>

          <section className="mt-14">
            <div className="border-b-[3px] border-foreground pb-2"><h2 className="font-display text-[30px] sm:text-[36px] leading-none">{L("Also around here", "עוד בסביבה")}</h2></div>
            <div className="mt-5 flex flex-wrap gap-2">
              {hood && <Link to={`/area/${hoodSlug(hood)}`} className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{he ? hood.he : hood.en}: {L("places and events", "מקומות ואירועים")}</Link>}
              <Link to="/live?layers=parking" className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{L("Parking near here", "חניה בסביבה")}</Link>
              <Link to="/live?layers=traffic" className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{L("Live traffic", "תנועה עכשיו")}</Link>
              <Link to="/events" className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{L("What's on tonight", "מה קורה הערב")}</Link>
              <Link to="/guide" className="h-11 inline-flex items-center rounded-md bg-secondary px-4 font-bold">{L("Nearest shelters", "מקלטים קרובים")}</Link>
            </div>
          </section>
          <p className="mt-8 text-[12px] text-muted-foreground">{L("Source: City of Tel Aviv-Yafo open map data (building permits, building sites, night works, road works, dangerous buildings and town plans), updated by the city every night. Locations and details are as published by the city; check the city's building archive for official documents.", "מקור: המידע הפתוח של עיריית תל אביב-יפו (היתרי בניה, אתרי בניה, עבודות לילה, עבודות כביש, מבנים מסוכנים ותב״עות), מתעדכן מדי לילה. המיקומים והפרטים כפי שפורסמו בידי העירייה; למסמכים רשמיים ראו את ארכיון הבניין העירוני.")}</p>
        </div>
      )}
    </SiteLayout>
  );
};

export default Check;
