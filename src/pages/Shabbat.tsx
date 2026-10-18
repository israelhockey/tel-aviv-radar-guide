import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Bus, Car, Landmark, MapPin, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useCityData, useHolidays, usePlaces, useShabbat } from "@/lib/live/hooks";
import { fmtClock, fmtWeekday } from "@/lib/live/format";
import { openStateAt } from "@/lib/live/openingHours";

// Saturday at the given hour, this week (or today if it's Saturday).
const saturdayAt = (hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  d.setHours(hour, 0, 0, 0);
  return d;
};

const Shabbat = () => {
  const { t, lang } = useI18n();
  const shabbat = useShabbat(lang);
  const city = useCityData();
  const holidays = useHolidays(lang);
  const places = usePlaces();

  useEffect(() => {
    document.title = lang === "he" ? "שבת וחגים · TLV Radar" : "Shabbat & holidays · TLV Radar";
  }, [lang]);

  const now = Date.now();
  const candles = shabbat.data?.candles ? new Date(shabbat.data.candles).getTime() : null;
  const havdalah = shabbat.data?.havdalah ? new Date(shabbat.data.havdalah).getTime() : null;
  const isShabbat = candles != null && havdalah != null && now >= candles && now < havdalah;
  const hoursTo = candles && now < candles ? Math.round((candles - now) / 3600_000) : null;

  // The weekend shuttles: one row per line number, both directions together.
  const lines = useMemo(() => {
    const m = new Map<string, { line: string; names: string[]; color: string }>();
    for (const f of city.data?.naimLines ?? []) {
      const p = (f as { properties: { line: string | null; name: string | null; color: string | null } }).properties;
      if (!p.line) continue;
      const row = m.get(p.line) ?? { line: p.line, names: [], color: `#${(p.color ?? "868e96").replace("#", "")}` };
      if (p.name && !row.names.includes(p.name)) row.names.push(p.name);
      m.set(p.line, row);
    }
    return [...m.values()].sort((a, b) => Number(a.line) - Number(b.line));
  }, [city.data]);

  // Food and drink places open on Saturday at 1 pm.
  const openSat = useMemo(() => {
    const at = saturdayAt(13);
    return (places.data ?? []).filter((p) => p.kind !== "bicycle_rental" && openStateAt(p.hours, at).status === "open").length;
  }, [places.data]);

  const culture = (city.data as { culture?: { name: string; kind: string | null; address: string | null; web: string | null; saturday: string | null; at: [number, number] }[] } | undefined)?.culture ?? [];
  const cultureSat = culture.filter((c) => c.saturday && /פתוח/.test(c.saturday));
  const shopping = (city.data as { shabbatShopping?: { name: string; at: [number, number] }[] } | undefined)?.shabbatShopping ?? [];

  const fmtDay = (ymd: string) =>
    new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${ymd.slice(0, 10)}T12:00:00Z`));

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden text-white" style={{ background: "radial-gradient(120% 90% at 80% 10%, #f59f00 0%, #c2255c 28%, #3b1d6e 60%, #10102a 100%)" }}>
        <div className="container-page py-8 sm:py-12">
          <p className="text-[13px] uppercase tracking-wider opacity-85">{t("nav.shabbat")}</p>
          <h1 className="mt-2 font-display text-[40px] sm:text-[64px] leading-[0.95]">
            {isShabbat ? t("shab.now") : hoursTo != null && hoursTo < 48 ? `${t("shab.in")} ${hoursTo} ${t("shab.hours")}` : t("shab.this")}
          </h1>
          {(shabbat.data?.holiday || shabbat.data?.parasha) && <p className="mt-2 text-[17px] opacity-90" dir="auto">{shabbat.data.holiday ?? shabbat.data.parasha}</p>}
          <div className="mt-6 flex flex-wrap gap-6">
            {shabbat.data?.candles && (
              <div>
                <p className="text-[13px] opacity-80">{t("shabbat.candles")}</p>
                <p className="font-display text-[44px] leading-none tabular">{fmtClock(shabbat.data.candles, lang)}</p>
                <p className="text-[13px] opacity-80">{fmtWeekday(shabbat.data.candles, lang)}</p>
              </div>
            )}
            {shabbat.data?.havdalah && (
              <div>
                <p className="text-[13px] opacity-80">{t("shabbat.ends")}</p>
                <p className="font-display text-[44px] leading-none tabular">{fmtClock(shabbat.data.havdalah, lang)}</p>
                <p className="text-[13px] opacity-80">{fmtWeekday(shabbat.data.havdalah, lang)}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link to="/food" className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-4 hover:bg-secondary/50">
            <UtensilsCrossed className="h-5 w-5 text-cat-food" aria-hidden />
            <p className="mt-2 font-display text-[30px] leading-none tabular">{places.data ? openSat : "…"}</p>
            <p className="mt-1 text-[14px]">{t("shab.foodOpen")}</p>
          </Link>
          <a href="#culture" className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-4 hover:bg-secondary/50">
            <Landmark className="h-5 w-5 text-cat-art" aria-hidden />
            <p className="mt-2 font-display text-[30px] leading-none tabular">{city.data ? cultureSat.length : "…"}</p>
            <p className="mt-1 text-[14px]">{t("shab.cultureOpen")}</p>
          </a>
          <a href="#shuttles" className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-4 hover:bg-secondary/50">
            <Bus className="h-5 w-5 text-sea" aria-hidden />
            <p className="mt-2 font-display text-[30px] leading-none tabular">{city.data ? lines.length : "…"}</p>
            <p className="mt-1 text-[14px]">{t("shab.freeLines")}</p>
          </a>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr,340px]">
          <div className="space-y-10 min-w-0">
            {/* Getting around */}
            <section id="shuttles" aria-labelledby="sh-h">
              <h2 id="sh-h" className="font-display text-[26px] leading-none">{t("shab.around")}</h2>
              <p className="mt-2 text-[15px] text-muted-foreground max-w-2xl">{t("shab.naimBody")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/live?layers=shabbat" className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground text-background px-4 text-[14px] font-medium">
                  <MapPin className="h-4 w-4" aria-hidden />{t("shab.onMap")}
                </Link>
                <a href="https://www.tel-aviv.gov.il/Residents/Transportation/Pages/naimbesofash.aspx" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-full border border-border px-4 text-[14px] hover:bg-secondary">{t("shab.cityPage")}</a>
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {lines.map((l) => (
                  <li key={l.line} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <span className="min-w-[46px] h-8 px-2 rounded-lg text-white text-[15px] font-semibold tabular flex items-center justify-center" style={{ background: l.color }}>{l.line}</span>
                    <span className="text-[13px] leading-snug" dir="rtl">{l.names.join(" · ")}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-xl bg-secondary p-4 flex gap-3">
                <Car className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
                <p className="text-[14px] leading-snug">{t("shab.sherut")}</p>
              </div>
            </section>

            {/* Culture open on Saturday */}
            <section id="culture" aria-labelledby="cu-h">
              <h2 id="cu-h" className="font-display text-[26px] leading-none">{t("shab.culture")}</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {cultureSat.slice(0, 40).map((c) => (
                  <li key={`${c.name}-${c.at.join()}`}>
                    <a href={c.web ?? `https://www.google.com/maps/search/?api=1&query=${c.at[1]},${c.at[0]}`} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-border p-3 hover:bg-secondary/60">
                      <span className="block text-[14px] font-medium" dir="rtl">{c.name}</span>
                      <span className="block text-[12px] text-muted-foreground" dir="rtl">{[c.kind, c.address].filter(Boolean).join(" · ")}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-8">
            <section aria-labelledby="shop-h" className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-4">
              <h2 id="shop-h" className="text-[17px] font-medium flex items-center gap-2"><ShoppingBag className="h-4 w-4" aria-hidden />{t("shab.shopping")}</h2>
              <ul className="mt-2 space-y-1.5 text-[14px]">
                {shopping.map((s) => (
                  <li key={s.name}>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${s.at[1]},${s.at[0]}`} target="_blank" rel="noopener noreferrer" className="hover:text-sea" dir="rtl">{s.name}</a>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="hol-h">
              <h2 id="hol-h" className="font-display text-[22px] leading-none">{t("shab.holidays")}</h2>
              <ul className="mt-3 divide-y divide-border">
                {(holidays.data ?? []).slice(0, 14).map((h) => (
                  <li key={`${h.date}-${h.title}`} className="py-2 flex items-baseline justify-between gap-3">
                    <span className="text-[14px]" dir="auto">{h.title}{h.yomtov && <span className="ms-2 rounded-full bg-cat-festival/15 text-cat-festival px-1.5 py-0.5 text-[10px] font-medium">{t("shab.noTransit")}</span>}</span>
                    <span className="shrink-0 text-[12px] tabular text-muted-foreground">{fmtDay(h.date)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">Hebcal.com · {t("shab.sources")}</p>
            </section>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
};

export default Shabbat;
