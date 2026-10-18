import { Link } from "react-router-dom";
import { Car, Clapperboard, SquareParking, UtensilsCrossed, Waves, Flame } from "lucide-react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useBeachForecast, useCinema, useParking, usePlaces, useShabbat, useTraffic } from "@/lib/live/hooks";
import { openStateAt } from "@/lib/live/openingHours";
import { nightKey } from "@/lib/live/when";
import { fmtClock } from "@/lib/live/format";

const verdict = (s: number): StringKey => (s >= 8 ? "beach.v5" : s >= 6.5 ? "beach.v4" : s >= 4.5 ? "beach.v3" : s >= 2.5 ? "beach.v2" : "beach.v1");

// One glance at the city: a row of live tiles that each open their own page.
export const CityTiles = () => {
  const { t, lang } = useI18n();
  const beach = useBeachForecast();
  const places = usePlaces();
  const traffic = useTraffic();
  const parking = useParking();
  const cinema = useCinema();
  const shabbat = useShabbat(lang);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const beachToday = (beach.data ?? []).filter((h) => h.time.startsWith(today) && h.isDay);
  const beachScore = beachToday.length ? Math.max(...beachToday.map((h) => h.score)) : null;
  const now = new Date();
  const openNow = places.data?.filter((p) => p.kind !== "bicycle_rental" && openStateAt(p.hours, now).status === "open").length ?? null;
  const jams = traffic.data?.jams.filter((j) => j.level >= 3).length ?? null;
  const lots = parking.data?.filter((k) => k.status === "free" || k.status === "few").length ?? null;
  const tonight = nightKey(now.toISOString());
  const films = cinema.data?.films.filter((f) => f.shows.some((s) => nightKey(s.at) === tonight)).length ?? null;
  const dow = now.getDay();
  const showShabbat = (dow === 4 || dow === 5 || dow === 6) && shabbat.data?.candles;

  const tiles: { to: string; icon: typeof Waves; n: string | number | null; label: string; bg: string }[] = [
    { to: "/beach", icon: Waves, n: beachScore != null ? beachScore.toFixed(1) : null, label: beachScore != null ? t(verdict(beachScore)) : t("nav.beach"), bg: "linear-gradient(140deg,#0b7285,#15aabf)" },
    { to: "/food", icon: UtensilsCrossed, n: openNow, label: t("food.openNow"), bg: "linear-gradient(140deg,#c2255c,#e8590c)" },
    { to: "/live?layers=traffic", icon: Car, n: jams, label: t("go.jams"), bg: "linear-gradient(140deg,#d9480f,#f59f00)" },
    { to: "/live?layers=parking", icon: SquareParking, n: lots, label: t("go.lots"), bg: "linear-gradient(140deg,#1864ab,#4dabf7)" },
    { to: "/cinema", icon: Clapperboard, n: films, label: t("tiles.films"), bg: "linear-gradient(140deg,#5f3dc4,#c2255c)" },
  ];
  if (showShabbat) tiles.push({ to: "/shabbat", icon: Flame, n: fmtClock(shabbat.data!.candles!, lang), label: t("shabbat.candles"), bg: "linear-gradient(140deg,#3b1d6e,#f59f00)" });

  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2 snap-x [scrollbar-width:none]">
      {tiles.map((x) => (
        <Link key={x.to} to={x.to} className="snap-start shrink-0 w-[150px] sm:w-[170px] rounded-[var(--radius)] p-3.5 text-white shadow-[var(--shadow-card)] hover:brightness-110 transition" style={{ background: x.bg }}>
          <x.icon className="h-4 w-4 opacity-90" aria-hidden />
          <p className="mt-2 font-display text-[30px] leading-none tabular">{x.n ?? "…"}</p>
          <p className="mt-1 text-[12px] leading-snug opacity-95">{x.label}</p>
        </Link>
      ))}
    </div>
  );
};
