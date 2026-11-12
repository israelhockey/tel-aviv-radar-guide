import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { addressEn, fetchActivity, nearestAddress, stageEn, streetNames, typeEn } from "@/lib/live/build";
import { IMPACT_STYLE, impactOf } from "@/lib/live/buildInsight";
import { summarize } from "@/lib/live/summary";
import { neighbourhoodOf } from "@/lib/live/geo";
import { KIND_COLOR } from "@/components/build/ActivityMap";
import { shareLink } from "@/lib/live/saved";

// A one-page summary of an address, made to be printed, saved as a PDF or sent to a landlord,
// a partner or a lawyer. Everything comes from the same city data as the full map.

const KIND_LABEL: Record<string, { en: string; he: string }> = {
  permit: { en: "Permit", he: "היתר" }, site: { en: "Building site", he: "אתר בניה" }, night: { en: "Night works", he: "עבודות לילה" },
  road: { en: "Road works", he: "עבודות כביש" }, rail: { en: "Light rail", he: "רכבת קלה" }, business: { en: "New business", he: "עסק חדש" },
  danger: { en: "Dangerous building", he: "מבנה מסוכן" }, plan: { en: "Town plan", he: "תב״ע" }, zone: { en: "Nightlife zone", he: "אזור בילוי" },
};

const Report = () => {
  const { lang } = useI18n();
  const he = lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const [params] = useSearchParams();
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const radius = [100, 250, 500].includes(Number(params.get("r"))) ? Number(params.get("r")) : 250;
  const valid = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat - 32.08) < 0.12 && Math.abs(lon - 34.79) < 0.12;
  const near = useQuery({ queryKey: ["nearest", lat, lon], queryFn: () => nearestAddress(lat, lon), enabled: valid && !params.get("a") });
  const label = params.get("a") || (near.data ? (he ? near.data.label : near.data.labelEn ?? near.data.label) : "");
  const streets = useQuery({ queryKey: ["street-names"], queryFn: streetNames, staleTime: Infinity, enabled: !he });
  const q = useQuery({ queryKey: ["activity", lat, lon, radius], queryFn: () => fetchActivity(lat, lon, radius), enabled: valid, staleTime: 10 * 60_000 });
  const sum = useMemo(() => (q.data ? summarize(q.data) : null), [q.data]);
  const hood = valid ? neighbourhoodOf({ lat, lon }) : null;
  const today = new Intl.DateTimeFormat(he ? "he-IL" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem" }).format(new Date());
  const fmt = (ms?: number) => (ms ? new Intl.DateTimeFormat(he ? "he-IL" : "en-GB", { month: "short", year: "numeric", timeZone: "Asia/Jerusalem" }).format(new Date(ms)) : null);
  const checkUrl = `/check?lat=${lat}&lon=${lon}&r=${radius}${label ? `&a=${encodeURIComponent(label)}` : ""}`;

  useEffect(() => { document.title = `${L("Address report", "דוח כתובת")}: ${label || "…"} · Discover Tel Aviv`; }, [label, lang]);

  if (!valid) return <SiteLayout><div className="container-page py-16"><p className="text-[18px]">{L("Pick an address first.", "בחרו כתובת קודם.")} <Link to="/check" className="text-sea font-bold underline">{L("Check an address", "בדיקת כתובת")}</Link></p></div></SiteLayout>;
  const style = sum ? IMPACT_STYLE[sum.level] : IMPACT_STYLE.none;

  return (
    <SiteLayout>
      <div className="container-page max-w-[880px] py-8 print:py-0 print:max-w-none">
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Link to={checkUrl} className="h-10 rounded-md bg-secondary px-4 font-bold inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />{L("Full map", "למפה המלאה")}</Link>
          <button onClick={() => window.print()} className="ms-auto h-10 rounded-md bg-foreground text-background px-4 font-bold inline-flex items-center gap-2"><Printer className="h-4 w-4" aria-hidden />{L("Print or save as PDF", "הדפסה או שמירה כ-PDF")}</button>
          <button onClick={() => shareLink(window.location.href, document.title)} className="h-10 rounded-md bg-sea text-sea-foreground px-4 font-bold inline-flex items-center gap-2"><Share2 className="h-4 w-4" aria-hidden />{L("Share", "שיתוף")}</button>
        </div>

        <header className="mt-8 border-b-[3px] border-foreground pb-5 print:mt-0">
          <p className="text-[13px] font-extrabold uppercase tracking-wider text-[#0057ff]">{L("Address report · construction and noise", "דוח כתובת · בניה ורעש")}</p>
          <h1 className="mt-1 font-display text-[40px] sm:text-[60px] leading-[0.95]" dir="auto">{label || "…"}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">{[hood && (he ? hood.he : hood.en), L(`within ${radius} m`, `ברדיוס ${radius} מ'`), L(`city data as of ${today}`, `נתוני העירייה נכון ל-${today}`)].filter(Boolean).join(" · ")}</p>
        </header>

        {q.isLoading || !sum ? (
          <div className="mt-8 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-[10px] bg-secondary animate-pulse" />)}</div>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-[auto,1fr] items-center break-inside-avoid">
              <div className="rounded-[10px] px-6 py-4 text-center" style={{ background: style.bg, color: style.fg }}>
                <p className="font-poster text-[64px] leading-none">{sum.score}</p>
                <p className="text-[12px] font-extrabold uppercase">{L("out of 10", "מתוך 10")}</p>
              </div>
              <div>
                <p className="font-display text-[28px] leading-tight">{he ? sum.headline.he : sum.headline.en}</p>
                <p className="mt-1 text-[15px] text-muted-foreground">{L("Our estimate of building noise and disruption, from what's planned, permitted and active nearby and how close it is.", "ההערכה שלנו לרעש ולהפרעה מבניה, לפי מה שמתוכנן, אושר ופעיל בסביבה ועד כמה הוא קרוב.")}</p>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 break-inside-avoid">
              {[
                { n: sum.review, en: "Permit requests under review", he: "בקשות היתר בבדיקה" },
                { n: sum.building, en: "Buildings going up", he: "בניינים בבניה" },
                { n: sum.nearestBuild != null ? `${sum.nearestBuild} m` : "–", en: "Nearest active building work", he: "עבודת הבניה הקרובה" },
                { n: sum.counts.night + sum.counts.road, en: "Night and road works", he: "עבודות לילה וכביש" },
                { n: sum.counts.rail, en: "Light rail works", he: "עבודות רכבת קלה" },
                { n: sum.bars, en: "New bars, venues or restaurants", he: "ברים ומסעדות חדשים" },
                { n: sum.counts.danger, en: "Dangerous buildings", he: "מבנים מסוכנים" },
                { n: sum.counts.plan, en: "Town plans for this spot", he: "תב״עות במקום" },
              ].map((x) => (
                <div key={x.en} className="rounded-[8px] border-2 border-border p-3">
                  <p className="font-poster text-[34px] leading-none tabular">{x.n}</p>
                  <p className="mt-1 text-[13px] font-semibold leading-snug">{he ? x.he : x.en}</p>
                </div>
              ))}
            </section>

            {(sum.zone || sum.rail) && (
              <section className="mt-6 space-y-2 break-inside-avoid">
                {sum.zone && <p className="rounded-[8px] bg-[#f3d9fa] text-[#0b1a33] p-3 text-[15px]"><b>{L("Nightlife zone.", "אזור בילוי.")}</b> {L(`This address is inside a city nightlife zone (${stageEn(sum.zone.stage) ?? "late opening"}). Bars nearby may legally stay open late.`, `הכתובת בתוך אזור בילוי עירוני (${sum.zone.stage ?? ""}). ברים בסביבה רשאים לפתוח עד שעה מאוחרת.`)}</p>}
                {sum.rail && <p className="rounded-[8px] bg-[#c3fae8] text-[#0b1a33] p-3 text-[15px]"><b>{L("Light rail.", "רכבת קלה.")}</b> {L(`${typeEn(sum.rail.title)} works pass ${sum.rail.distance} m away. Light rail works run for years and include night work.`, `עבודות ${sum.rail.title} עוברות ${sum.rail.distance} מ' מכאן. עבודות הרכבת נמשכות שנים וכוללות עבודות לילה.`)}</p>}
              </section>
            )}

            <section className="mt-8">
              <h2 className="font-display text-[28px] border-b-2 border-foreground pb-1">{L("What matters most", "מה הכי חשוב לדעת")}</h2>
              {sum.top.length === 0 ? <p className="mt-3">{L("Nothing active within this radius.", "אין פעילות ברדיוס הזה.")}</p> : (
                <ol className="mt-3 divide-y divide-border">
                  {sum.top.map((a) => {
                    const imp = impactOf(a);
                    const st = IMPACT_STYLE[imp.level];
                    const when = [a.opened && `${L("requested", "הוגשה")} ${fmt(a.opened)}`, a.start && `${L("from", "מ-")} ${fmt(a.start)}`, a.end && `${L("until", "עד")} ${fmt(a.end)}`].filter(Boolean).join(" · ");
                    return (
                      <li key={a.id} className="py-3 flex gap-3 break-inside-avoid">
                        <span className="h-10 w-10 shrink-0 rounded-[6px] font-poster text-[22px] flex items-center justify-center" style={{ background: st.bg, color: st.fg }}>{imp.score}</span>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: KIND_COLOR[a.kind] }}>{he ? KIND_LABEL[a.kind].he : KIND_LABEL[a.kind].en} · {a.distance} {L("m", "מ'")}</p>
                          <p className="font-bold leading-snug" dir="auto">{he ? a.title : typeEn(a.title)}</p>
                          <p className="text-[14px] text-muted-foreground" dir="auto">{[he ? a.address : addressEn(a.address, streets.data) ?? a.address, he ? a.stage : stageEn(a.stage), when].filter(Boolean).join(" · ")}</p>
                          <p className="text-[13px]">{imp.reasons.slice(0, 2).map((r) => (he ? r.he : r.en)).join(". ")}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section className="mt-8 grid gap-4 sm:grid-cols-2 break-inside-avoid">
              <div className="rounded-[10px] bg-secondary p-4">
                <h2 className="font-display text-[22px]">{L("Questions to ask before you sign", "שאלות לפני שחותמים")}</h2>
                <ul className="mt-2 list-disc ps-5 space-y-1 text-[14px]">
                  <li>{L("Is the building itself planning TAMA 38 or demolition and rebuilding?", "האם בבניין עצמו מתוכנן תמ״א 38 או פינוי-בינוי?")}</li>
                  <li>{L("Which windows face the sites on this list, and are they double-glazed?", "אילו חלונות פונים לאתרים ברשימה, והאם יש בהם זיגוג כפול?")}</li>
                  <li>{L("Can the rent or lease reflect works that start after you move in?", "האם אפשר לעגן בחוזה עבודות שיתחילו אחרי הכניסה?")}</li>
                  <li>{L("Where is parking during the works, and will the street be closed?", "איפה חונים בזמן העבודות, והאם הרחוב ייסגר?")}</li>
                </ul>
              </div>
              <div className="rounded-[10px] bg-[#fff4c2] text-[#0b1a33] p-4">
                <h2 className="font-display text-[22px]">{L("Your rights on noise", "הזכויות שלך ברעש")}</h2>
                <p className="mt-2 text-[14px]">{L("Noisy building machinery is banned 19:00 to 07:00, and on Shabbat and holidays from 17:00 the day before. Night works need a special city approval. To complain, call the city hotline 106.", "הפעלת מכונות בניה רועשות אסורה בין 19:00 ל-07:00, ובשבתות וחגים מ-17:00 ערב קודם. עבודת לילה מחייבת אישור מיוחד מהעירייה. לתלונה: מוקד 106.")}</p>
                <Link to="/construction-noise-rules" className="mt-2 inline-block font-bold underline print:no-underline">{L("The full rules", "הכללים המלאים")}</Link>
              </div>
            </section>
          </>
        )}

        <footer className="mt-8 border-t border-border pt-3 text-[12px] text-muted-foreground">
          <p>{L("Source: City of Tel Aviv-Yafo open map data, updated nightly. The score is our estimate, not an official assessment. Check official documents on the city's building archive.", "מקור: המידע הפתוח של עיריית תל אביב-יפו, מתעדכן מדי לילה. הציון הוא הערכה שלנו ולא חוות דעת רשמית. למסמכים רשמיים ראו את ארכיון הבניין העירוני.")}</p>
          <p className="mt-1">Discover Tel Aviv · {typeof window !== "undefined" ? window.location.href : ""}</p>
        </footer>
      </div>
    </SiteLayout>
  );
};

export default Report;
