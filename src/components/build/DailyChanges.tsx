import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchData } from "@/lib/live/sources";
import { useI18n } from "@/lib/i18n";
import { stageEn, typeEn } from "@/lib/live/build";
import { KIND_COLOR } from "./ActivityMap";
import { checkUrl } from "./AddressSearch";

// "What changed since yesterday": the nightly comparison of the city's building records
// (scripts/fetch-build.mjs), shown on the home page so there's something new every morning.

type Change = {
  date: string; change: "new" | "stage"; kind: "permit" | "site" | "night" | "road"; key: string;
  lat: number; lon: number; title?: string; address?: string; stage?: string; from?: string; units?: number; tama38?: boolean;
};

const GROUPS: { id: string; en: string; he: string; test: (c: Change) => boolean }[] = [
  { id: "requested", en: "New permit requests", he: "בקשות היתר חדשות", test: (c) => c.kind === "permit" && c.change === "new" },
  { id: "approved", en: "Permits approved", he: "היתרים שאושרו", test: (c) => c.kind === "permit" && c.change === "stage" && /קיים היתר/.test(c.stage ?? "") },
  { id: "started", en: "Construction started", he: "בניה שהתחילה", test: (c) => (c.kind === "permit" && c.change === "stage" && /בבניה/.test(c.stage ?? "")) || (c.kind === "site" && c.change === "new") },
  { id: "finished", en: "Finished", he: "הסתיימו", test: (c) => c.kind === "permit" && c.change === "stage" && /גמר|אכלוס/.test(c.stage ?? "") },
  { id: "works", en: "New night works and road works", he: "עבודות לילה ועבודות כביש חדשות", test: (c) => (c.kind === "night" || c.kind === "road") && c.change === "new" },
];

export const DailyChanges = () => {
  const { lang } = useI18n();
  const he = lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const q = useQuery({
    queryKey: ["build-changes"],
    queryFn: async () => (await (await fetchData("build-changes.json")).json()) as { updated: string; changes: Change[] },
    staleTime: 30 * 60_000,
  });
  const days = useMemo(() => [...new Set((q.data?.changes ?? []).map((c) => c.date))].sort().reverse(), [q.data]);
  const [day, setDay] = useState<string | null>(null);
  const current = day ?? days[0];
  const list = (q.data?.changes ?? []).filter((c) => c.date === current);
  const prevDay = days[days.indexOf(current) + 1];
  const prevCount = (q.data?.changes ?? []).filter((c) => c.date === prevDay).length;
  const [open, setOpen] = useState<string>("requested");

  const fmtDay = (d: string) => new Intl.DateTimeFormat(he ? "he-IL" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

  return (
    <section className="container-page pt-14">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-foreground pb-2">
        <div>
          <p className="text-[15px] font-bold text-accent">{L("Updated every morning from the city's records", "מתעדכן כל בוקר מנתוני העירייה")}</p>
          <h2 className="font-display text-[34px] sm:text-[52px] leading-[1]">{L("What changed since yesterday", "מה השתנה מאתמול")}</h2>
        </div>
        {days.length > 1 && (
          <label className="text-[14px] font-semibold">
            <span className="sr-only">{L("Day", "יום")}</span>
            <select value={current} onChange={(e) => setDay(e.target.value)} className="h-10 rounded-md border border-border bg-background px-3">
              {days.slice(0, 30).map((d) => <option key={d} value={d}>{fmtDay(d)}</option>)}
            </select>
          </label>
        )}
      </div>

      {q.isLoading ? (
        <div className="mt-6 h-40 rounded-[10px] bg-secondary animate-pulse" />
      ) : !current ? (
        <p className="mt-6 max-w-2xl text-[17px]">{L("We took the first full snapshot of every permit, building site, night work and road work in the city today. From tomorrow morning, everything new or changed overnight will appear here.", "צילמנו היום לראשונה את כל ההיתרים, אתרי הבניה, עבודות הלילה ועבודות הכביש בעיר. מחר בבוקר יופיע כאן כל מה שחדש או השתנה בלילה.")}</p>
      ) : (
        <>
          <p className="mt-4 text-[17px]">
            <span className="font-semibold">{fmtDay(current)}:</span> {list.length} {L("changes across Tel Aviv-Yafo", "שינויים בתל אביב-יפו")}
            {prevDay ? <span className="text-muted-foreground"> ({L(`${prevCount} the day before`, `${prevCount} ביום הקודם`)})</span> : null}
          </p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {GROUPS.map((g, i) => {
              const n = list.filter(g.test).length;
              return (
                <button key={g.id} onClick={() => setOpen(g.id)} aria-pressed={open === g.id}
                  className={`text-start rounded-[10px] p-4 text-[#0b1a33] border-t-[3px] border-dashed border-[#0b1a33] transition-transform ${open === g.id ? "ring-4 ring-[#0057ff]" : "hover:-translate-y-0.5"}`}
                  style={{ background: ["#d6e4ff", "#d3f9d8", "#ffd9d4", "#fff4c2", "#f3d9fa"][i] }}>
                  <span className="block font-poster text-[48px]">{n}</span>
                  <span className="block text-[14px] font-semibold leading-snug">{he ? g.he : g.en}</span>
                </button>
              );
            })}
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {list.filter(GROUPS.find((g) => g.id === open)!.test).slice(0, 40).map((c) => (
              <li key={`${c.key}-${c.change}`}>
                <Link to={checkUrl(c.lat, c.lon, c.address?.split(",")[0])} className="flex gap-3 rounded-[10px] border-2 border-border p-3 hover:border-foreground">
                  <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ background: KIND_COLOR[c.kind] }} aria-hidden />
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug" dir="rtl">{c.address ?? "—"}</span>
                    <span className="block text-[14px] text-muted-foreground" dir="auto">
                      {he ? c.title : typeEn(c.title)}
                      {c.change === "stage" && c.from ? ` · ${he ? c.from : stageEn(c.from)} → ${he ? c.stage : stageEn(c.stage)}` : ""}
                      {c.units ? ` · ${c.units} ${L("homes", "יח״ד")}` : ""}{c.tama38 ? ` · ${L("TAMA 38", "תמ״א 38")}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {list.filter(GROUPS.find((g) => g.id === open)!.test).length === 0 && <p className="mt-4 text-muted-foreground">{L("Nothing in this group that day.", "אין שינויים מהסוג הזה באותו יום.")}</p>}
        </>
      )}
    </section>
  );
};
