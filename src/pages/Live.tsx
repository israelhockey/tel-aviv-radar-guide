import { useEffect, useMemo, useRef, useState } from "react";
import { Bike, CalendarDays, CloudRain, LocateFixed, Plane, Bus as BusIcon, UtensilsCrossed, Waves, X } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { BEACHES, TLV_CENTER } from "@/lib/live/geo";
import { useAircraft, useBeaches, useBuses, useEventsFeed, usePlaces, useRain } from "@/lib/live/hooks";
import { inRange } from "@/lib/live/when";
import { loadMapLibre, MAP_STYLE, type MapLibre } from "@/lib/live/maplibre";
import { busIcon, planeIcon } from "@/lib/live/mapIcons";
import { openStateAt } from "@/lib/live/openingHours";
import { placeKindLabel } from "@/lib/live/places";
import { seaState, type Aircraft, type Bus, type FeedEvent, type Place } from "@/lib/live/sources";
import { fmtClock, minutesAgo } from "@/lib/live/format";

type LayerId = "events" | "buses" | "flights" | "food" | "bikes" | "beaches" | "rain";

const LAYERS: { id: LayerId; key: StringKey; icon: typeof BusIcon; color: string }[] = [
  { id: "events", key: "live.events", icon: CalendarDays, color: "#7048e8" },
  { id: "buses", key: "live.buses", icon: BusIcon, color: "#0b63e5" },
  { id: "flights", key: "live.flights", icon: Plane, color: "#ff5a1f" },
  { id: "food", key: "live.food", icon: UtensilsCrossed, color: "#e8590c" },
  { id: "bikes", key: "live.bikes", icon: Bike, color: "#2f9e44" },
  { id: "beaches", key: "live.beaches", icon: Waves, color: "#0f8a9d" },
  { id: "rain", key: "live.rain", icon: CloudRain, color: "#5c7cfa" },
];

// Map layer ids that belong to each toggle.
const MAP_LAYERS: Record<LayerId, string[]> = {
  events: ["events-halo", "events"],
  buses: ["buses-dot", "buses-icon", "buses-label"],
  flights: ["flights-icon", "flights-label"],
  food: ["food-closed", "food-open"],
  bikes: ["bikes"],
  beaches: ["beaches", "beaches-label"],
  rain: ["rain"],
};

type Selected =
  | { kind: "bus"; bus: Bus }
  | { kind: "plane"; plane: Aircraft }
  | { kind: "place"; place: Place }
  | { kind: "beach"; id: string }
  | { kind: "event"; event: FeedEvent };

const fc = (features: unknown[]) => ({ type: "FeatureCollection", features });
const pt = (lon: number, lat: number, properties: Record<string, unknown>) => ({
  type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties,
});

const Live = () => {
  const { t, lang } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [on, setOn] = useState<Record<LayerId, boolean>>({
    events: true, buses: true, flights: true, food: true, bikes: false, beaches: true, rain: false,
  });
  const [selected, setSelected] = useState<Selected | null>(null);
  const [tick, setTick] = useState(0); // re-evaluates "open now" every minute

  const buses = useBuses(on.buses);
  const aircraft = useAircraft(on.flights);
  const places = usePlaces(on.food || on.bikes);
  const beaches = useBeaches();
  const rain = useRain(on.rain);
  const eventsFeed = useEventsFeed();

  useEffect(() => {
    document.title = lang === "he" ? "מפה חיה · TLV Radar" : "Live map · TLV Radar";
  }, [lang]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Full objects behind each feature id, for the detail panel.
  const lookup = useRef({ buses: new Map<string, Bus>(), planes: new Map<string, Aircraft>(), places: new Map<string, Place>(), events: new Map<string, FeedEvent>() });

  /* ---------- create the map once ---------- */
  useEffect(() => {
    let cancelled = false;
    let map: MapLibre | null = null;
    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;
        map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [TLV_CENTER.lon, TLV_CENTER.lat],
          zoom: 12.4,
          minZoom: 9,
          maxZoom: 18,
          attributionControl: { compact: true },
          cooperativeGestures: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }), "bottom-right");

        map.on("load", () => {
          if (cancelled) return;
          // Prefixed names: the base map style ships its own "bus" icon (a bus-stop sign).
          map.addImage("radar-bus", busIcon("#0b63e5"), { pixelRatio: 2 });
          map.addImage("radar-plane", planeIcon("#ff5a1f"), { pixelRatio: 2 });

          const empty = fc([]);
          for (const id of ["events", "buses", "flights", "food", "bikes", "beaches", "me"]) map.addSource(id, { type: "geojson", data: empty });

          map.addLayer({
            id: "food-closed", type: "circle", source: "food", filter: ["!=", ["get", "state"], "open"], minzoom: 13,
            paint: { "circle-radius": 2.5, "circle-color": "#adb5bd", "circle-opacity": 0.6 },
          });
          map.addLayer({
            id: "food-open", type: "circle", source: "food", filter: ["==", ["get", "state"], "open"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2.5, 15, 6],
              "circle-color": "#e8590c", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1,
            },
          });
          map.addLayer({
            id: "bikes", type: "circle", source: "bikes",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 15, 6],
              "circle-color": "#2f9e44", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5,
            },
          });
          map.addLayer({
            id: "events-halo", type: "circle", source: "events",
            paint: { "circle-radius": 14, "circle-color": "#7048e8", "circle-opacity": 0.18 },
          });
          map.addLayer({
            id: "events", type: "circle", source: "events",
            paint: { "circle-radius": 6.5, "circle-color": "#7048e8", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
          });
          map.addLayer({
            id: "beaches", type: "circle", source: "beaches",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 14, 9],
              "circle-color": "#0f8a9d", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2,
            },
          });
          map.addLayer({
            id: "beaches-label", type: "symbol", source: "beaches", minzoom: 13.3,
            layout: {
              "text-field": ["get", "label"], "text-font": ["Noto Sans Regular"], "text-size": 12,
              "text-offset": [-1.2, 0], "text-anchor": "right", "text-allow-overlap": false,
            },
            paint: { "text-color": "#0b4f5a", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
          });
          // City-wide view: buses as small dots, so the map stays readable with ~1,000 of them.
          map.addLayer({
            id: "buses-dot", type: "circle", source: "buses", maxzoom: 14,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1.4, 13.9, 3],
              "circle-color": "#0b63e5", "circle-opacity": 0.75,
            },
          });
          map.addLayer({
            id: "buses-icon", type: "symbol", source: "buses", minzoom: 14,
            layout: {
              "icon-image": "radar-bus", "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.7, 17, 1],
              "icon-rotate": ["get", "bearing"], "icon-rotation-alignment": "map",
              "icon-allow-overlap": true, "icon-ignore-placement": true,
            },
          });
          map.addLayer({
            id: "buses-label", type: "symbol", source: "buses", minzoom: 14.5,
            layout: {
              "text-field": ["get", "line"], "text-font": ["Noto Sans Regular"], "text-size": 11,
              "text-offset": [0, 1.4], "text-anchor": "top",
            },
            paint: { "text-color": "#0b3d91", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
          });
          map.addLayer({
            id: "flights-icon", type: "symbol", source: "flights",
            layout: {
              "icon-image": "radar-plane", "icon-size": 0.9,
              "icon-rotate": ["get", "track"], "icon-rotation-alignment": "map",
              "icon-allow-overlap": true, "icon-ignore-placement": true,
            },
          });
          map.addLayer({
            id: "flights-label", type: "symbol", source: "flights", minzoom: 11,
            layout: {
              "text-field": ["get", "callsign"], "text-font": ["Noto Sans Regular"], "text-size": 11,
              "text-offset": [0, 1.6], "text-anchor": "top",
            },
            paint: { "text-color": "#7a2a0a", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
          });
          map.addLayer({
            id: "me", type: "circle", source: "me",
            paint: { "circle-radius": 7, "circle-color": "#0b63e5", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
          });

          const pick = (layer: string, fn: (props: Record<string, unknown>) => void) => {
            map.on("click", layer, (e: { features?: { properties: Record<string, unknown> }[] }) => {
              const f = e.features?.[0];
              if (f) fn(f.properties);
            });
            map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
          };
          // Feature properties come back flattened; the full objects are kept in a lookup.
          pick("buses-dot", (p) => { const b = lookup.current.buses.get(String(p.id)); if (b) setSelected({ kind: "bus", bus: b }); });
          pick("buses-icon", (p) => { const b = lookup.current.buses.get(String(p.id)); if (b) setSelected({ kind: "bus", bus: b }); });
          pick("flights-icon", (p) => { const a = lookup.current.planes.get(String(p.id)); if (a) setSelected({ kind: "plane", plane: a }); });
          pick("food-open", (p) => { const pl = lookup.current.places.get(String(p.id)); if (pl) setSelected({ kind: "place", place: pl }); });
          pick("food-closed", (p) => { const pl = lookup.current.places.get(String(p.id)); if (pl) setSelected({ kind: "place", place: pl }); });
          pick("bikes", (p) => { const pl = lookup.current.places.get(String(p.id)); if (pl) setSelected({ kind: "place", place: pl }); });
          pick("beaches", (p) => setSelected({ kind: "beach", id: String(p.id) }));
          pick("events", (p) => { const ev = lookup.current.events.get(String(p.id)); if (ev) setSelected({ kind: "event", event: ev }); });

          setReady(true);
        });
        map.on("error", () => { /* individual tile errors are non-fatal */ });
      })
      .catch(() => setMapError(true));

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  /* ---------- push data into the map ---------- */
  useEffect(() => {
    if (!ready || !buses.data) return;
    lookup.current.buses = new Map(buses.data.buses.map((b) => [b.id, b]));
    mapRef.current?.getSource("buses")?.setData(
      fc(buses.data.buses.map((b) => pt(b.lon, b.lat, { id: b.id, bearing: b.bearing, line: b.line ?? "" }))),
    );
  }, [ready, buses.data]);

  useEffect(() => {
    if (!ready || !aircraft.data) return;
    lookup.current.planes = new Map(aircraft.data.map((a) => [a.id, a]));
    mapRef.current?.getSource("flights")?.setData(
      fc(aircraft.data.map((a) => pt(a.lon, a.lat, { id: a.id, track: a.track, callsign: a.callsign }))),
    );
  }, [ready, aircraft.data]);

  const foodCounts = useMemo(() => {
    if (!places.data) return { open: 0, bikes: 0, features: [] as unknown[], bikeFeatures: [] as unknown[] };
    const now = new Date();
    let open = 0;
    const features: unknown[] = [];
    const bikeFeatures: unknown[] = [];
    for (const p of places.data) {
      if (p.kind === "bicycle_rental") {
        bikeFeatures.push(pt(p.lon, p.lat, { id: p.id }));
        continue;
      }
      const state = openStateAt(p.hours, now).status;
      if (state === "open") open++;
      features.push(pt(p.lon, p.lat, { id: p.id, state }));
    }
    return { open, bikes: bikeFeatures.length, features, bikeFeatures };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.data, tick]);

  useEffect(() => {
    if (!ready || !places.data) return;
    lookup.current.places = new Map(places.data.map((p) => [p.id, p]));
    mapRef.current?.getSource("food")?.setData(fc(foodCounts.features));
    mapRef.current?.getSource("bikes")?.setData(fc(foodCounts.bikeFeatures));
  }, [ready, places.data, foodCounts]);

  useEffect(() => {
    if (!ready) return;
    mapRef.current?.getSource("beaches")?.setData(
      fc(BEACHES.map((b) => {
        const c = beaches.data?.find((d) => d.id === b.id);
        const temp = c?.seaTemp != null ? ` ${Math.round(c.seaTemp)}°` : "";
        const wave = c?.waveHeight != null ? ` · ${c.waveHeight.toFixed(1)} m` : "";
        return pt(b.lon, b.lat, { id: b.id, label: `${lang === "he" ? b.he : b.en}${temp}${wave}` });
      })),
    );
  }, [ready, beaches.data, lang]);

  // Tonight's events with a known venue location.
  const tonightEvents = useMemo(
    () => (eventsFeed.data?.events ?? []).filter((e) => e.lat != null && e.lon != null && inRange(e.start, e.end, "tonight")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventsFeed.data, tick],
  );

  useEffect(() => {
    if (!ready) return;
    lookup.current.events = new Map(tonightEvents.map((e) => [e.id, e]));
    // Several shows at one venue share a point; offset them slightly so each stays tappable.
    const seen = new Map<string, number>();
    mapRef.current?.getSource("events")?.setData(
      fc(tonightEvents.map((e) => {
        const k = `${e.lat},${e.lon}`;
        const n = seen.get(k) ?? 0;
        seen.set(k, n + 1);
        return pt(e.lon! + n * 0.00018, e.lat!, { id: e.id });
      })),
    );
  }, [ready, tonightEvents]);

  /* ---------- rain radar raster ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (map.getLayer("rain")) map.removeLayer("rain");
    if (map.getSource("rain")) map.removeSource("rain");
    if (on.rain && rain.data) {
      map.addSource("rain", {
        type: "raster", tiles: [rain.data.url], tileSize: 256, maxzoom: 7,
        attribution: '<a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a>',
      });
      // Draw rain under the moving layers.
      map.addLayer({ id: "rain", type: "raster", source: "rain", paint: { "raster-opacity": 0.6 } }, "food-closed");
    }
  }, [ready, on.rain, rain.data]);

  /* ---------- layer visibility ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (Object.keys(MAP_LAYERS) as LayerId[]).forEach((id) => {
      for (const layer of MAP_LAYERS[id]) {
        if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", on[id] ? "visible" : "none");
      }
    });
  }, [ready, on, rain.data]);

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.getSource("me")?.setData(fc([pt(longitude, latitude, {})]));
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 15.5 });
        setOn((s) => ({ ...s, food: true }));
      },
      () => undefined,
      { timeout: 8000, maximumAge: 60000 },
    );
  };

  const status = (id: LayerId): string => {
    const q = { events: eventsFeed, buses, flights: aircraft, food: places, bikes: places, beaches, rain }[id];
    if (!on[id]) return "";
    if (q.isError && !q.data) return "!";
    if (id === "rain") return q.isLoading ? "…" : "";
    if (q.isLoading || !q.data) return "…";
    if (id === "events") return String(tonightEvents.length);
    if (id === "buses") return String(buses.data!.buses.length);
    if (id === "flights") return String(aircraft.data!.length);
    if (id === "food") return String(foodCounts.open);
    if (id === "bikes") return String(foodCounts.bikes);
    if (id === "beaches") return String(BEACHES.length);
    return "";
  };

  const busAge = buses.data?.newest ? minutesAgo(buses.data.newest) : null;

  return (
    <SiteLayout fill>
      {/* MapLibre's stylesheet sets its container to position:relative, so size it via a wrapper. */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" aria-label={t("nav.live")} role="region" />
      </div>

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[15px] text-muted-foreground">
          {t("common.error")}
        </div>
      )}

      {/* Layer chips */}
      <div className="absolute top-3 inset-x-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {LAYERS.map((l) => {
          const active = on[l.id];
          const s = status(l.id);
          return (
            <button
              key={l.id}
              onClick={() => setOn((prev) => ({ ...prev, [l.id]: !prev[l.id] }))}
              aria-pressed={active}
              className={`shrink-0 inline-flex items-center gap-2 h-9 rounded-full px-3.5 text-[13px] border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${
                active ? "bg-background border-foreground/20 text-foreground" : "bg-background/80 border-border text-muted-foreground"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: active ? l.color : "transparent", border: `1.5px solid ${l.color}` }} aria-hidden />
              {t(l.key)}
              {s && <span className={`tabular ${s === "!" ? "text-destructive" : "text-muted-foreground"}`} title={s === "!" ? t("live.unavailable") : undefined}>{s}</span>}
            </button>
          );
        })}
      </div>

      {/* Freshness + locate */}
      <div className="absolute top-14 start-3 flex flex-col items-start gap-2">
        {on.buses && busAge != null && (
          <span className="rounded-full bg-background/90 border border-border px-3 py-1 text-[12px] text-muted-foreground shadow-sm">
            {t("live.buses")}: {lang === "he" ? `${t("live.updated")} ${t("live.ago")} ${busAge} ${t("live.minutes")}` : `${t("live.updated")} ${busAge} ${t("live.minutes")} ${t("live.ago")}`}
          </span>
        )}
        <button
          onClick={locate}
          className="inline-flex items-center gap-2 h-9 rounded-full bg-foreground text-background px-3.5 text-[13px] font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2"
        >
          <LocateFixed className="h-4 w-4" aria-hidden />
          {t("live.locate")}
        </button>
      </div>

      {selected && <DetailPanel selected={selected} onClose={() => setSelected(null)} beaches={beaches.data} />}
    </SiteLayout>
  );
};

const DetailPanel = ({
  selected, onClose, beaches,
}: { selected: Selected; onClose: () => void; beaches: ReturnType<typeof useBeaches>["data"] }) => {
  const { t, lang } = useI18n();

  let title = "";
  const rows: [string, string][] = [];
  let link: string | null = null;

  if (selected.kind === "event") {
    const e = selected.event;
    title = e.title;
    rows.push(["", `${fmtClock(e.start, lang)}${e.end ? `–${fmtClock(e.end, lang)}` : ""}`]);
    if (e.venue) rows.push(["", e.venue]);
    if (e.address) rows.push(["", e.address]);
    if (e.free) rows.push(["", t("on.free")]);
    else if (e.priceFrom != null) rows.push(["", `${t("on.from")}${lang === "he" ? "" : " "}₪${Math.round(e.priceFrom)}`]);
    link = e.url;
  } else if (selected.kind === "bus") {
    const b = selected.bus;
    title = b.line ? `${t("live.line")} ${b.line}` : t("live.buses");
    if (b.to) rows.push(["", b.to]);
    if (b.agency) rows.push(["", b.agency]);
    rows.push([t("live.speed"), `${Math.round(b.speed)} km/h`]);
    rows.push([t("live.position"), `${minutesAgo(b.recordedAt)} ${t("live.minutes")}`]);
  } else if (selected.kind === "plane") {
    const a = selected.plane;
    title = a.callsign || a.id;
    if (a.type) rows.push(["", a.type]);
    if (a.altFt != null) rows.push([t("live.altitude"), `${a.altFt.toLocaleString()} ft`]);
    if (a.speedKt != null) rows.push([t("live.speed"), `${Math.round(a.speedKt)} kt`]);
    link = `https://globe.adsb.lol/?icao=${a.id}`;
  } else if (selected.kind === "place") {
    const p = selected.place;
    title = (lang === "en" && p.nameEn) || p.name || t("live.dockBikes");
    rows.push(["", placeKindLabel(p.kind, lang)]);
    if (p.kind !== "bicycle_rental") {
      const s = openStateAt(p.hours);
      rows.push([
        s.status === "open" ? t("live.open") : s.status === "closed" ? t("live.closed") : t("live.hoursUnknown"),
        s.status === "open" && s.until ? `${t("now.closesAt")} ${s.until}` : s.opensAt ? `→ ${s.opensAt}` : "",
      ]);
      if (p.hours) rows.push([t("live.hours"), p.hours]);
    }
    if (p.cuisine) rows.push(["", p.cuisine.replace(/;/g, ", ").replace(/_/g, " ")]);
    if (p.kosher === "yes" || p.kosher === "only") rows.push(["", t("live.kosher")]);
    if (p.vegan === "yes" || p.vegan === "only") rows.push(["", t("live.vegan")]);
    if (p.street) rows.push(["", `${p.street}${p.number ? ` ${p.number}` : ""}`]);
    link = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
  } else {
    const b = BEACHES.find((x) => x.id === selected.id)!;
    const c = beaches?.find((d) => d.id === selected.id);
    title = lang === "he" ? b.he : b.en;
    const st = seaState(c?.waveHeight ?? null);
    if (st) rows.push(["", t(`sea.${st}` as const)]);
    if (c?.waveHeight != null) rows.push([t("now.waves"), `${c.waveHeight.toFixed(1)} m${c.wavePeriod ? ` · ${Math.round(c.wavePeriod)} s` : ""}`]);
    if (c?.seaTemp != null) rows.push([t("now.sea"), `${Math.round(c.seaTemp)}°`]);
    rows.push(["", t("now.beachesNote")]);
    link = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`;
  }

  return (
    <div className="absolute inset-x-3 bottom-3 md:inset-x-auto md:start-3 md:bottom-6 md:w-[340px] rounded-2xl bg-background border border-border shadow-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-medium leading-snug" dir="auto">{title}</h2>
        <button onClick={onClose} aria-label={t("live.close")} className="-m-1 p-1 rounded-full hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea">
          <X className="h-4 w-4" />
        </button>
      </div>
      <dl className="mt-2 space-y-1 text-[14px]">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex gap-2">
            {k && <dt className="text-muted-foreground shrink-0">{k}</dt>}
            <dd className="min-w-0 break-words" dir="auto">{v}</dd>
          </div>
        ))}
      </dl>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[14px] font-medium text-sea hover:underline underline-offset-4">
          {selected.kind === "plane" ? "adsb.lol" : selected.kind === "event" ? `${t("on.tickets")} · ${selected.event.source}` : t("live.directions")}
        </a>
      )}
    </div>
  );
};

export default Live;
