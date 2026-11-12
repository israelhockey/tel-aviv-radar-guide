import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BellRing, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { fetchData } from "@/lib/live/sources";
import { fetchActivity, isLive, stageEn, typeEn, type Activity } from "@/lib/live/build";
import { IMPACT_STYLE, impactOf } from "@/lib/live/buildInsight";
import { summarize } from "@/lib/live/summary";
import { neighbourhoodOf } from "@/lib/live/geo";
import { hoodSlug } from "@/lib/areas";
import { nearbyStreets, numbersOn, streetIndex, streetName, streetPath, type Street } from "@/lib/streets";
import { checkUrl } from "@/components/build/AddressSearch";
import { KIND_COLOR } from "@/components/build/ActivityMap";

// "/street/dizengoff": everything the city lists on one street, live.

const useStreets = () => useQuery({
  queryKey: ["streets"], staleTime: Infinity,
  queryFn: async () => ((await (await fetchData("streets.json")).json()).streets ?? []) as Street[],
});

const Row = ({ a, street, he }: { a: Activity; street: Street; he: boolean }) => {
  const imp = impactOf(a);
  const st = IMPACT_STYLE[imp.level];
  const nums = numbersOn(a.address, street.he);
  const when = a.kind === "permit" ? (a.start ?? a.permitted ?? a.opened) : a.start ?? a.opened;
  const fmt = (ms?: number) => (ms ? new Intl.DateTimeFormat(he ? "he-IL" : "en-GB", { month: "short", year: "numeric", timeZone: "Asia/Jerusalem" }).format(new Date(ms)) : null);
  const label = `${he ? street.he : streetName(street)} ${nums[0] ?? ""}`.trim();
  return (
    <li>
      <Link to={`${checkUrl(a.lat, a.lon, label, 100)}&item=${encodeURIComponent(a.id)}`} className="flex gap-3 py-3 border-b border-border hover:bg-secondary/50 -mx-2 px-2 rounded">
        <span className="w-14 shrink-0 font-poster text-[22px] leading-tight tabular" dir="auto">{nums.length ? nums.slice(0, 2).join(", ") : "–"}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug" dir="auto">{he ? a.title : typeEn(a.title)}</span>
          <span className="mt-1 flex flex-wrap gap-1.5 text-[12px]">
            {a.stage && <span className="rounded bg-secondary px-2 py-0.5 font-semibold" dir="auto">{he ? a.stage : stageEn(a.stage)}</span>}
            {a.tama38 && a.kind === "permit" && <span className="rounded bg-[#ffcb05] text-[#0b1a33] px-2 py-0.5 font-bold">{he ? "תמ״א 38" : "TAMA 38"}</span>}
            {a.units ? <span className="rounded bg-[#d6e4ff] text-[#0b1a33] px-2 py-0.5 font-semibold">{a.units} {he ? "יח״ד" : "homes"}</span> : null}
            {when && <span className="text-muted-foreground font-semibold py-0.5">{fmt(when)}</span>}
          </span>
        </span>
        <span className="h-9 w-9 shrink-0 rounded-[6px] font-poster text-[18px] flex items-center justify-center" style={{ background: st.bg, color: st.fg }} title={he ? st.he : st.en}>{imp.score}</span>
      </Link>
    </li>
  );
};

/** "/street": every street with a page, A to Z, with a filter box. */
const StreetIndex = () => {
  const { lang } = useI18n();
  const he = lang === "he";
  const streets = useStreets();
  const [f, setF] = useState("");
  const list = useMemo(() => [...streetIndex(streets.data ?? []).values()]
    .filter((s) => !f || s.he.includes(f) || (streetName(s) ?? "").toLowerCase().includes(f.toLowerCase()))
    .sort((a, b) => (he ? a.he.localeCompare(b.he, "he") : (streetName(a) ?? "").localeCompare(streetName(b) ?? ""))), [streets.data, f, he]);
  useEffect(() => { document.title = he ? "בניה לפי רחוב בתל אביב · Discover Tel Aviv" : "Construction by street in Tel Aviv · Discover Tel Aviv"; }, [he]);
  return (
    <SiteLayout>
      <section className="bg-[#0057ff] text-white">
        <div className="container-page py-10">
          <h1 className="font-display text-[40px] sm:text-[64px] leading-[0.95]">{he ? "בניה לפי רחוב" : "Construction by street"}</h1>
          <p className="mt-3 max-w-[640px] text-[17px] text-white/90">{he ? "היתרי בניה, אתרי בניה ועבודות בכל רחוב בתל אביב-יפו." : "Building permits, building sites and works on every street in Tel Aviv-Yafo."}</p>
          <input value={f} onChange={(e) => setF(e.target.value)} dir="auto" placeholder={he ? "חפשו רחוב" : "Find a street"} className="mt-5 h-12 w-full max-w-[420px] rounded-md bg-white px-4 text-[#0b1a33] text-[16px] outline-none" />
        </div>
      </section>
      <div className="container-page py-8">
        {streets.isLoading ? <div className="h-60 rounded-xl bg-secondary animate-pulse" /> : (
          <ul className="columns-2 sm:columns-3 lg:columns-4 gap-6 text-[15px]">
            {list.map((s) => <li key={s.he} className="break-inside-avoid py-1"><Link to={streetPath(s)} className="hover:text-[#ff5a4e]" dir="auto">{he ? s.he : streetName(s)}</Link></li>)}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
};

const StreetPage = () => {
  const { slug = "" } = useParams();
  const { pathname } = useLocation();
  const { lang, setLang } = useI18n();
  // A Hebrew street link (from Google, say) should open the site in Hebrew.
  useEffect(() => { if (pathname.startsWith("/he/") && lang !== "he") setLang("he"); }, [pathname]);
  const he = pathname.startsWith("/he/") || lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const streets = useStreets();
  const index = useMemo(() => streetIndex(streets.data ?? []), [streets.data]);
  const street = index.get(slug);
  const name = street ? (he ? street.he : streetName(street) ?? street.he) : "";
  const q = useQuery({ queryKey: ["street-activity", street?.he], enabled: !!street, staleTime: 10 * 60_000, queryFn: () => fetchActivity(street!.lat, street!.lon, 0, street!.he) });
  const [finished, setFinished] = useState(false);
  const live = useMemo(() => (q.data ?? []).filter(isLive), [q.data]);
  const sum = useMemo(() => (q.data ? summarize(q.data) : null), [q.data]);
  const hood = street ? neighbourhoodOf(street) : null;

  useEffect(() => {
    if (street) document.title = he ? `בניה ברחוב ${street.he}, תל אביב: היתרים ואתרי בניה · Discover Tel Aviv` : `Construction on ${streetName(street)}, Tel Aviv: permits and building sites · Discover Tel Aviv`;
  }, [street, he]);

  if (streets.isLoading) return <SiteLayout><div className="container-page py-16"><div className="h-60 rounded-xl bg-secondary animate-pulse" /></div></SiteLayout>;
  if (!street) return <SiteLayout><div className="container-page py-20"><h1 className="font-display text-[36px]">{L("We couldn't find that street", "לא מצאנו את הרחוב")}</h1><Link to="/check" className="mt-4 inline-block text-sea underline">{L("Check an address", "בדיקת כתובת")}</Link></div></SiteLayout>;

  const groups: { id: string; en: string; he: string; list: Activity[] }[] = [
    { id: "review", en: "Permit requests under review", he: "בקשות להיתר בבדיקה", list: live.filter((a) => a.kind === "permit" && /בתהליך/.test(a.stage ?? "")) },
    { id: "approved", en: "Approved, not started yet", he: "אושרו, טרם התחילו", list: live.filter((a) => a.kind === "permit" && /קיים היתר/.test(a.stage ?? "")) },
    { id: "building", en: "Being built now", he: "בבניה עכשיו", list: live.filter((a) => (a.kind === "permit" && /בבניה/.test(a.stage ?? "")) || a.kind === "site") },
    { id: "works", en: "Night works and road works", he: "עבודות לילה ועבודות כביש", list: live.filter((a) => a.kind === "night" || a.kind === "road") },
    { id: "biz", en: "New businesses (last 12 months)", he: "עסקים חדשים (12 חודשים)", list: live.filter((a) => a.kind === "business") },
    { id: "danger", en: "Dangerous buildings", he: "מבנים מסוכנים", list: live.filter((a) => a.kind === "danger") },
  ].filter((g) => g.list.length);
  const done = (q.data ?? []).filter((a) => !isLive(a) && a.kind === "permit");
  const near = nearbyStreets(street, streets.data ?? [], 10);
  const tama = live.filter((a) => a.tama38 && a.kind === "permit").length;

  return (
    <SiteLayout>
      <section className="bg-[#0057ff] text-white">
        <div className="container-page py-10 sm:py-14">
          <p className="text-[14px] font-bold text-white/85">
            <Link to="/check" className="underline underline-offset-4">{L("Construction checker", "בודק הבניה")}</Link>
            {hood && <> · <Link to={`/area/${hoodSlug(hood)}`} className="underline underline-offset-4">{he ? hood.he : hood.en}</Link></>}
          </p>
          <h1 className="mt-2 font-display text-[40px] sm:text-[68px] leading-[0.95]" dir="auto">{L(`Construction on ${name}`, `בניה ברחוב ${name}`)}</h1>
          <p className="mt-3 max-w-[720px] text-[17px] text-white/90">
            {sum ? L(
              `${sum.review} permit requests under review, ${sum.building} buildings going up${tama ? ` (${tama} TAMA 38)` : ""}, ${sum.counts.night + sum.counts.road} night and road works. From the City of Tel Aviv-Yafo's records, updated nightly.`,
              `${sum.review} בקשות להיתר בבדיקה, ${sum.building} בניינים בבניה${tama ? ` (${tama} תמ״א 38)` : ""}, ${sum.counts.night + sum.counts.road} עבודות לילה וכביש. לפי רישומי עיריית תל אביב-יפו, מתעדכן מדי לילה.`,
            ) : L("Loading the city's records…", "טוען את רישומי העירייה…")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to={checkUrl(street.lat, street.lon, name, 250)} className="h-11 inline-flex items-center gap-2 rounded-md bg-[#ffcb05] px-5 font-extrabold text-[#0b1a33]"><MapPin className="h-4 w-4" aria-hidden />{L("See it on the map", "לצפייה במפה")}</Link>
            <Link to={checkUrl(street.lat, street.lon, name, 250)} className="h-11 inline-flex items-center gap-2 rounded-md bg-white/15 px-5 font-bold hover:bg-white/25"><BellRing className="h-4 w-4" aria-hidden />{L("Get alerts for this street", "התראות לרחוב הזה")}</Link>
          </div>
        </div>
      </section>

      <div className="container-page max-w-[900px] py-8">
        {q.isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-secondary animate-pulse" />)}</div>
        ) : q.isError ? (
          <p className="rounded-md bg-secondary p-4">{L("The city's map service didn't answer. Please try again in a moment.", "שירות המפות של העירייה לא ענה. נסו שוב בעוד רגע.")}</p>
        ) : groups.length === 0 ? (
          <p className="text-[18px]">{L(`Nothing active on ${name} right now.`, `אין כרגע פעילות ברחוב ${name}.`)}</p>
        ) : (
          groups.map((g) => (
            <section key={g.id} className="mt-8 first:mt-0">
              <h2 className="font-display text-[26px] sm:text-[30px] leading-none border-b-[3px] border-foreground pb-2 flex items-baseline justify-between gap-3">
                <span>{he ? g.he : g.en}</span><span className="font-poster text-[26px] tabular" style={{ color: KIND_COLOR[g.list[0].kind] }}>{g.list.length}</span>
              </h2>
              <ul className="mt-1">{g.list.map((a) => <Row key={a.id} a={a} street={street} he={he} />)}</ul>
            </section>
          ))
        )}
        {done.length > 0 && (
          <section className="mt-8">
            <button onClick={() => setFinished(!finished)} className="h-10 rounded-md border border-border px-4 font-semibold">{finished ? L("Hide finished projects", "הסתרת פרויקטים שהסתיימו") : L(`Show ${done.length} finished or older projects`, `הצגת ${done.length} פרויקטים שהסתיימו או ישנים`)}</button>
            {finished && <ul className="mt-2">{done.map((a) => <Row key={a.id} a={a} street={street} he={he} />)}</ul>}
          </section>
        )}

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[10px] bg-[#fff4c2] text-[#0b1a33] p-5">
            <h2 className="font-display text-[22px]">{L("Living on this street?", "גרים ברחוב?")}</h2>
            <p className="mt-1 text-[15px]">{L("Building work is allowed 07:00 to 19:00, not on Shabbat or holidays. Night work needs a special approval.", "מותר לבנות 07:00–19:00, לא בשבת ובחגים. עבודת לילה מחייבת אישור מיוחד.")}</p>
            <Link to="/construction-noise-rules" className="mt-2 inline-block font-bold underline">{L("Noise rules and how to complain", "כללי רעש ואיך מתלוננים")}</Link>
          </div>
          <div className="rounded-[10px] bg-secondary p-5">
            <h2 className="font-display text-[22px]">{L("Looking at a flat here?", "שוקלים דירה ברחוב?")}</h2>
            <p className="mt-1 text-[15px]">{L("Check the exact building and compare it with other addresses.", "בדקו את הבניין המדויק והשוו לכתובות אחרות.")}</p>
            <div className="mt-2 flex flex-wrap gap-3 font-bold">
              <Link to="/compare" className="underline">{L("Compare apartments", "השוואת דירות")}</Link>
              <Link to={he ? "/magazine/he-renting-an-apartment-tel-aviv" : "/magazine/renting-an-apartment-tel-aviv"} className="underline">{L("Renting guide", "מדריך שכירות")}</Link>
              <Link to={he ? "/magazine/he-tama-38-explained" : "/magazine/tama-38-explained"} className="underline">{L("TAMA 38 explained", "תמ״א 38 בהסבר פשוט")}</Link>
            </div>
          </div>
        </section>

        {near.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-[24px]">{L("Nearby streets", "רחובות סמוכים")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {near.map((s) => <Link key={s.he} to={streetPath(s, pathname.startsWith("/he/"))} className="h-9 inline-flex items-center rounded-md bg-secondary px-3 text-[14px] font-semibold" dir="auto">{he ? s.he : streetName(s)}</Link>)}
            </div>
          </section>
        )}
        <p className="mt-10 text-[12px] text-muted-foreground">{L("Source: City of Tel Aviv-Yafo open map data, updated nightly. Scores are our estimate of noise and disruption.", "מקור: המידע הפתוח של עיריית תל אביב-יפו, מתעדכן מדי לילה. הציונים הם הערכה שלנו לרעש ולהפרעה.")}</p>
      </div>
    </SiteLayout>
  );
};

const Street = () => (useParams().slug ? <StreetPage /> : <StreetIndex />);
export default Street;
