import { useMemo, useState } from "react";
import { LocateFixed } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { distanceMeters, TLV_CENTER, walkMinutes } from "@/lib/live/geo";
import { usePlaces } from "@/lib/live/hooks";
import { openStateAt } from "@/lib/live/openingHours";
import { placeKindLabel } from "@/lib/live/places";

type Origin = { lat: number; lon: number; exact: boolean };

export const OpenNearby = () => {
  const { t, lang } = useI18n();
  const [origin, setOrigin] = useState<Origin | null>(null);
  const places = usePlaces(origin != null);

  const locate = () => {
    if (!navigator.geolocation) return setOrigin({ ...TLV_CENTER, exact: false });
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude, exact: true }),
      () => setOrigin({ ...TLV_CENTER, exact: false }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
    );
  };

  const list = useMemo(() => {
    if (!origin || !places.data) return [];
    const now = new Date();
    return places.data
      .filter((p) => p.kind !== "bicycle_rental")
      .map((p) => ({ p, state: openStateAt(p.hours, now), d: distanceMeters(origin, p) }))
      .filter((x) => x.state.status === "open")
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);
  }, [origin, places.data]);

  return (
    <section aria-labelledby="open-h">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="open-h" className="text-lg font-medium">{t("now.openNear")}</h2>
          <p className="text-[13px] text-muted-foreground">{t("now.openNearBody")}</p>
        </div>
        {!origin && (
          <button
            onClick={locate}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 h-9 text-[14px] font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2"
          >
            <LocateFixed className="h-4 w-4" aria-hidden />
            {t("now.useLocation")}
          </button>
        )}
      </div>

      {origin && !origin.exact && <p className="mt-3 text-[13px] text-muted-foreground">{t("now.locationDenied")}</p>}
      {origin && places.isLoading && <p className="mt-3 text-[14px] text-muted-foreground">{t("now.locating")}</p>}
      {origin && places.isError && <p className="mt-3 text-[14px] text-muted-foreground">{t("common.error")}</p>}

      {list.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {list.map(({ p, state, d }) => (
            <li key={p.id} className="py-2.5 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] truncate">{(lang === "en" && p.nameEn) || p.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {placeKindLabel(p.kind, lang)}
                  {state.until && <> · {t("now.closesAt")} {state.until}</>}
                </p>
              </div>
              <span className="shrink-0 text-[13px] tabular text-muted-foreground">
                {walkMinutes(d)} {t("now.walk")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {origin && <p className="mt-2 text-[11px] text-muted-foreground">© OpenStreetMap contributors</p>}
    </section>
  );
};
