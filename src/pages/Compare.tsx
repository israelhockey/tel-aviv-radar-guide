import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { Share2, X } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { fetchActivity, typeEn } from "@/lib/live/build";
import { IMPACT_STYLE } from "@/lib/live/buildInsight";
import { summarize, type Summary } from "@/lib/live/summary";
import { AddressSearch } from "@/components/build/AddressSearch";
import { COMPARE, getList, onChange, removeFrom, shareLink, type Spot } from "@/lib/live/saved";

// Two or three apartments side by side: which one will be quieter over the next couple of years?
// The list lives in this browser; a shared link carries its own list in the URL.

const encode = (l: Spot[]) => l.map((s) => `${s.lat.toFixed(5)},${s.lon.toFixed(5)},${s.r ?? 250},${encodeURIComponent(s.label)}`).join("|");
const decode = (v: string | null): Spot[] | null => {
  if (!v) return null;
  const out = v.split("|").map((p) => { const [lat, lon, r, ...rest] = p.split(","); return { lat: +lat, lon: +lon, r: +r || 250, label: decodeURIComponent(rest.join(",")) }; })
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon)).slice(0, 3);
  return out.length ? out : null;
};

const Compare = () => {
  const { lang } = useI18n();
  const he = lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const [params] = useSearchParams();
  const shared = useMemo(() => decode(params.get("p")), [params]);
  const [saved, setSaved] = useState<Spot[]>(() => getList(COMPARE));
  useEffect(() => onChange(COMPARE, () => setSaved(getList(COMPARE))), []);
  const list = shared ?? saved;
  const results = useQueries({ queries: list.map((s) => ({ queryKey: ["activity", s.lat, s.lon, s.r ?? 250], queryFn: () => fetchActivity(s.lat, s.lon, s.r ?? 250), staleTime: 10 * 60_000 })) });
  const sums = results.map((r) => (r.data ? summarize(r.data) : null));
  const ready = sums.every(Boolean) && sums.length > 1;
  const scores = ready ? sums.map((x) => x!.score) : [];
  // Only call one "quietest" when it's clearly ahead of the rest.
  const best = ready && Math.min(...scores) <= [...scores].sort((a, b) => a - b)[1] - 0.3 ? scores.indexOf(Math.min(...scores)) : -1;

  useEffect(() => { document.title = `${L("Compare apartments: construction and noise", "השוואת דירות: בניה ורעש")} · Discover Tel Aviv`; }, [lang]);

  const rows: { en: string; he: string; v: (s: Summary) => string | number }[] = [
    { en: "Permit requests under review", he: "בקשות היתר בבדיקה", v: (s) => s.review },
    { en: "Buildings going up", he: "בניינים בבניה", v: (s) => s.building },
    { en: "Nearest active building work", he: "עבודת הבניה הקרובה", v: (s) => (s.nearestBuild != null ? `${s.nearestBuild} m` : "–") },
    { en: "Night works", he: "עבודות לילה", v: (s) => s.counts.night },
    { en: "Road works", he: "עבודות כביש", v: (s) => s.counts.road },
    { en: "Light rail works", he: "עבודות רכבת קלה", v: (s) => (s.rail ? `${s.rail.distance} m` : "–") },
    { en: "New bars, venues, restaurants", he: "ברים ומסעדות חדשים", v: (s) => s.bars },
    { en: "In a nightlife zone", he: "באזור בילוי", v: (s) => (s.zone ? L("Yes", "כן") : L("No", "לא")) },
    { en: "Dangerous buildings", he: "מבנים מסוכנים", v: (s) => s.counts.danger },
  ];

  return (
    <SiteLayout>
      <section className="bg-[#0057ff] text-white">
        <div className="container-page py-8">
          <p className="text-[15px] font-bold text-white/85">{L("Apartment hunting?", "מחפשים דירה?")}</p>
          <h1 className="font-display text-[40px] sm:text-[64px] leading-[0.95]">{L("Compare the construction around them", "השוו את הבניה סביבן")}</h1>
          <p className="mt-3 max-w-[640px] text-[17px] text-white/90">{L("Up to three addresses side by side: permits, building sites, night works, light rail and new bars nearby, with a noise score for each.", "עד שלוש כתובות זו לצד זו: היתרים, אתרי בניה, עבודות לילה, רכבת קלה וברים חדשים בסביבה, עם ציון רעש לכל אחת.")}</p>
          {list.length < 3 && !shared && (
            <div className="mt-6">
              <p className="mb-2 text-[14px] font-semibold text-white/85">{L("Add an address: search it, then tap Compare on its page.", "הוספת כתובת: חפשו אותה ולחצו על 'השוואה' בעמוד שלה.")}</p>
              <AddressSearch />
            </div>
          )}
        </div>
      </section>

      <div className="container-page py-8">
        {list.length === 0 ? (
          <p className="text-[18px]">{L("Nothing to compare yet. Check an address and tap Compare to add it here.", "עדיין אין מה להשוות. בדקו כתובת ולחצו 'השוואה' כדי להוסיף אותה.")}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {shared && <p className="text-[15px] font-semibold">{L("Someone shared this comparison with you.", "מישהו שיתף איתך את ההשוואה הזו.")}</p>}
              <button onClick={() => shareLink(`${window.location.origin}/compare?p=${encode(list)}`, document.title)} className="ms-auto h-10 rounded-md bg-foreground text-background px-4 font-bold inline-flex items-center gap-2"><Share2 className="h-4 w-4" aria-hidden />{L("Share this comparison", "שיתוף ההשוואה")}</button>
            </div>
            <div className="mt-5 overflow-x-auto -mx-4 px-4">
              <table className="w-full min-w-[560px] border-separate border-spacing-x-2 text-[15px]">
                <thead>
                  <tr>
                    <th className="w-[30%]" />
                    {list.map((s, i) => (
                      <th key={`${s.lat},${s.lon}`} className="text-start align-bottom pb-2">
                        <span className="flex items-start gap-2">
                          <Link to={`/check?lat=${s.lat}&lon=${s.lon}&r=${s.r ?? 250}&a=${encodeURIComponent(s.label)}`} className="font-display text-[22px] leading-tight hover:underline" dir="auto">{s.label || `${L("Address", "כתובת")} ${i + 1}`}</Link>
                          {!shared && <button onClick={() => removeFrom(COMPARE, s)} aria-label={L("Remove", "הסרה")} className="mt-1 h-7 w-7 shrink-0 rounded-md hover:bg-secondary inline-flex items-center justify-center"><X className="h-4 w-4" aria-hidden /></button>}
                        </span>
                        <span className="block text-[12px] font-semibold text-muted-foreground">{L(`within ${s.r ?? 250} m`, `ברדיוס ${s.r ?? 250} מ'`)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="text-start font-semibold py-2">{L("Noise and disruption score", "ציון רעש והפרעה")}</th>
                    {sums.map((s, i) => {
                      const st = IMPACT_STYLE[s?.level ?? "none"];
                      return (
                        <td key={i} className="py-2">
                          {s ? (
                            <span className="inline-flex items-center gap-3">
                              <span className="rounded-[8px] px-3 py-1 font-poster text-[36px] leading-none tabular" style={{ background: st.bg, color: st.fg }}>{s.score.toFixed(1)}</span>
                              {i === best && <span className="rounded-[4px] bg-[#2f9e44] text-white px-2 py-0.5 text-[12px] font-extrabold uppercase">{L("Quietest", "הכי שקט")}</span>}
                            </span>
                          ) : <span className="inline-block h-10 w-16 rounded bg-secondary animate-pulse" />}
                          {s && <span className="mt-1 block text-[13px] leading-snug">{he ? s.headline.he : s.headline.en}</span>}
                        </td>
                      );
                    })}
                  </tr>
                  {rows.map((r) => (
                    <tr key={r.en} className="[&>*]:border-t [&>*]:border-border">
                      <th className="text-start font-semibold py-2.5">{he ? r.he : r.en}</th>
                      {sums.map((s, i) => <td key={i} className="py-2.5 font-poster text-[22px] tabular">{s ? r.v(s) : "…"}</td>)}
                    </tr>
                  ))}
                  <tr className="[&>*]:border-t [&>*]:border-border align-top">
                    <th className="text-start font-semibold py-2.5">{L("Loudest nearby", "הכי רועש בסביבה")}</th>
                    {sums.map((s, i) => (
                      <td key={i} className="py-2.5">
                        <ul className="space-y-1 text-[13px]">{s?.top.slice(0, 3).map((a) => <li key={a.id} dir="auto"><b className="tabular">{a.impact}</b> · {he ? a.title : typeEn(a.title)} <span className="text-muted-foreground">({a.distance} {L("m", "מ'")})</span></li>)}</ul>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-6 text-[12px] text-muted-foreground">{L("Scores are our estimate from City of Tel Aviv-Yafo open data. A quieter score today can change when new permits are approved, so sign up for alerts on the address you pick.", "הציונים הם הערכה שלנו לפי המידע הפתוח של עיריית תל אביב-יפו. ציון שקט היום יכול להשתנות כשמאשרים היתרים חדשים, אז כדאי להירשם להתראות על הכתובת שבחרתם.")}</p>
          </>
        )}
      </div>
    </SiteLayout>
  );
};

export default Compare;
