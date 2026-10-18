import { useI18n } from "@/lib/i18n";
import { BEACHES } from "@/lib/live/geo";
import { useBeaches } from "@/lib/live/hooks";
import { seaState, type SeaState } from "@/lib/live/sources";

const STATE_STYLE: Record<SeaState, string> = {
  calm: "bg-surf/10 text-surf",
  light: "bg-surf/10 text-surf",
  choppy: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  rough: "bg-destructive/10 text-destructive",
};

// Wave height drawn as a bar against a 2 m scale, so the coastline reads at a glance.
const MAX_WAVE = 2;

export const BeachList = () => {
  const { t, lang } = useI18n();
  const { data, isLoading, isError } = useBeaches();

  return (
    <section aria-labelledby="beaches-h">
      <h2 id="beaches-h" className="text-lg font-medium">{t("now.beaches")}</h2>
      {isError && <p className="mt-3 text-sm text-muted-foreground">{t("common.error")}</p>}
      <ul className="mt-3 divide-y divide-border">
        {BEACHES.map((b) => {
          const c = data?.find((d) => d.id === b.id);
          const state = seaState(c?.waveHeight ?? null);
          const pct = c?.waveHeight != null ? Math.min(100, (c.waveHeight / MAX_WAVE) * 100) : 0;
          return (
            <li key={b.id} className="py-2.5 grid grid-cols-[1fr,auto] items-center gap-x-3 gap-y-1.5">
              <span className="text-[15px]">{lang === "he" ? b.he : b.en}</span>
              <span className="text-[13px] tabular text-muted-foreground">
                {c?.waveHeight != null ? `${c.waveHeight.toFixed(1)} m` : isLoading ? "…" : "–"}
                {c?.seaTemp != null && <span className="ms-2 text-foreground">{Math.round(c.seaTemp)}°</span>}
              </span>
              <span className="relative h-1.5 rounded-full bg-secondary overflow-hidden" aria-hidden>
                <span className="absolute inset-y-0 start-0 rounded-full bg-surf" style={{ width: `${pct}%` }} />
              </span>
              {state ? (
                <span className={`justify-self-end rounded-full px-2 py-0.5 text-[11px] font-medium ${STATE_STYLE[state]}`}>
                  {t(`sea.${state}` as const)}
                </span>
              ) : <span />}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[12px] text-muted-foreground">{t("now.beachesNote")}</p>
    </section>
  );
};
