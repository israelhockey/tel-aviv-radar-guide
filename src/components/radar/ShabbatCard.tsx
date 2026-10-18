import { useI18n } from "@/lib/i18n";
import { useShabbat } from "@/lib/live/hooks";
import { fmtClock, fmtWeekday } from "@/lib/live/format";

export const ShabbatCard = () => {
  const { t, lang } = useI18n();
  const { data } = useShabbat(lang);
  if (!data?.candles && !data?.havdalah) return null;

  return (
    <section aria-labelledby="shabbat-h" className="rounded-2xl border border-border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="shabbat-h" className="text-lg font-medium">{t("shabbat.title")}</h2>
        {(data.holiday || data.parasha) && <span className="text-[13px] text-muted-foreground">{data.holiday ?? data.parasha}</span>}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {data.candles && (
          <div>
            <dt className="text-[12px] text-muted-foreground">{t("shabbat.candles")}</dt>
            <dd className="mt-1 text-2xl font-medium tabular">{fmtClock(data.candles, lang)}</dd>
            <dd className="text-[12px] text-muted-foreground">{fmtWeekday(data.candles, lang)}</dd>
          </div>
        )}
        {data.havdalah && (
          <div>
            <dt className="text-[12px] text-muted-foreground">{t("shabbat.ends")}</dt>
            <dd className="mt-1 text-2xl font-medium tabular">{fmtClock(data.havdalah, lang)}</dd>
            <dd className="text-[12px] text-muted-foreground">{fmtWeekday(data.havdalah, lang)}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-[13px] text-muted-foreground leading-snug">{t("shabbat.note")}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">Hebcal.com</p>
    </section>
  );
};
