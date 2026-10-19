import { useEffect, useMemo, useState } from "react";
import { Clapperboard, Film as FilmIcon, Play } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useCinema } from "@/lib/live/hooks";
import { fmtClock } from "@/lib/live/format";
import { nightKey } from "@/lib/live/when";
import type { Film } from "@/lib/live/sources";

const CINEMA_BG: Record<string, string> = { cinematheque: "bg-cat-theatre", "planet-ayalon": "bg-cat-talk" };

const Poster = ({ f }: { f: Film }) => {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`relative aspect-[2/3] overflow-hidden ${f.poster && !broken ? "bg-muted" : CINEMA_BG[f.cinema] ?? "bg-cat-other"}`}>
      {f.poster && !broken ? (
        <img src={f.poster} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : (
        <span className="absolute inset-0 p-3 flex items-end font-display text-[20px] leading-tight text-white" dir="auto">{f.title}</span>
      )}
    </div>
  );
};

const CinemaPage = () => {
  const { t, lang } = useI18n();
  const { data, isLoading, isError } = useCinema();
  const [day, setDay] = useState(0);
  const [cinema, setCinema] = useState<string>("all");

  useEffect(() => {
    document.title = lang === "he" ? "קולנוע · Discover Tel Aviv" : "Cinema · Discover Tel Aviv";
  }, [lang]);

  const days = useMemo(() => [0, 1, 2].map((d) => nightKey(new Date(Date.now() + d * 86400_000).toISOString())), []);
  const dayLabel = (i: number) =>
    i === 0 ? t("news.today") : i === 1 ? t("on.tomorrow")
      : new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(`${days[i]}T12:00:00Z`));

  const shown = (data?.films ?? [])
    .filter((f) => cinema === "all" || f.cinema === cinema)
    .map((f) => ({ f, shows: f.shows.filter((s) => nightKey(s.at) === days[day]) }))
    .filter((x) => x.shows.length);

  const cinemaName = (id: string) => {
    const c = data?.cinemas.find((x) => x.id === id);
    return c ? (lang === "he" ? c.name : c.nameEn) : id;
  };

  const chip = (active: boolean) =>
    `h-9 rounded-full px-4 text-[14px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${active ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`;

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #1a1033 0%, #5f3dc4 50%, #c2255c 100%)" }}>
        <div className="container-page py-8 sm:py-12">
          <h1 className="font-display text-[42px] sm:text-[64px] leading-[0.95] flex items-center gap-3"><Clapperboard className="h-10 w-10 sm:h-14 sm:w-14" aria-hidden />{t("cin.title")}</h1>
          <p className="mt-2 text-[17px] text-white/90">{data ? <><span className="font-semibold tabular">{shown.length}</span> {t("cin.films")} {dayLabel(day).toLowerCase()}</> : "…"}</p>
        </div>
      </section>

      <div className="container-page">
        <div className="mt-6 flex flex-wrap gap-2">
          {[0, 1, 2].map((i) => <button key={i} onClick={() => setDay(i)} aria-pressed={day === i} className={chip(day === i)}>{dayLabel(i)}</button>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={() => setCinema("all")} aria-pressed={cinema === "all"} className={chip(cinema === "all")}>{t("food.all")}</button>
          {(data?.cinemas ?? []).map((c) => (
            <button key={c.id} onClick={() => setCinema(c.id)} aria-pressed={cinema === c.id} className={chip(cinema === c.id)}>{lang === "he" ? c.name : c.nameEn}</button>
          ))}
        </div>

        {isError && <p className="mt-6 text-[14px] text-muted-foreground">{t("common.error")}</p>}
        {!isLoading && !isError && shown.length === 0 && <p className="mt-6 text-[15px] text-muted-foreground">{t("cin.none")}</p>}

        <ul className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {shown.map(({ f, shows }) => (
            <li key={`${f.cinema}-${f.id}`} className="group rounded-[var(--radius)] overflow-hidden bg-card shadow-[var(--shadow-card)] flex flex-col">
              <a href={f.link} target="_blank" rel="noopener noreferrer" className="relative block">
                <Poster f={f} />
                <span className={`absolute top-2 start-2 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${CINEMA_BG[f.cinema] ?? "bg-cat-other"}`}>{cinemaName(f.cinema)}</span>
                {f.trailer && <span className="absolute bottom-2 end-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center"><Play className="h-4 w-4" aria-hidden /></span>}
              </a>
              <div className="p-3 flex-1 flex flex-col">
                <a href={f.link} target="_blank" rel="noopener noreferrer" className="text-[15px] font-medium leading-snug line-clamp-2 hover:text-sea" dir="auto">{f.title}</a>
                {f.minutes && <p className="mt-0.5 text-[12px] text-muted-foreground"><FilmIcon className="inline h-3 w-3 me-1 -mt-0.5" aria-hidden />{f.minutes} {t("live.minutes")}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {shows.map((s) => (
                    <a key={s.at} href={s.booking} target="_blank" rel="noopener noreferrer" className="rounded-md border border-border px-2 py-1 text-[13px] tabular hover:bg-foreground hover:text-background transition-colors">{fmtClock(s.at, lang)}</a>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[12px] text-muted-foreground">{t("cin.source")}</p>
      </div>
    </SiteLayout>
  );
};

export default CinemaPage;
