import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bike, CalendarDays, Car, SquareParking, CloudRain, LocateFixed, Plane, Search, Bus as BusIcon, TrainFront, UtensilsCrossed, Waves, X } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { BEACHES, TLV_CENTER } from "@/lib/live/geo";
import { useAircraft, useBeaches, useBuses, useCityData, useEventsFeed, useParking, usePlaces, useRail, useRain, useTelofan, useTraffic } from "@/lib/live/hooks";
import { inRange } from "@/lib/live/when";
import { loadMapLibre, type MapLibre } from "@/lib/live/maplibre";
import { liveColors, mapStyleFor } from "@/lib/live/mapStyle";
import { createTweener } from "@/lib/live/tween";
import { useTheme } from "@/lib/theme";
import { busIcon, planeIcon } from "@/lib/live/mapIcons";
import { openStateAt } from "@/lib/live/openingHours";
import { placeKindLabel } from "@/lib/live/places";
import { isEveningOut, fetchBusTrip, fetchFlightInfo, lineRoutePath, seaState, type Aircraft, type Bus, type BusTrip, type FeedEvent, type FlightInfo, type Place, type CarPark, type BikeDock, type Jam, type RoadReport } from "@/lib/live/sources";
import { WhereTo, type WhereResult } from "@/components/radar/WhereTo";
import { fmtClock, minutesAgo } from "@/lib/live/format";

type LayerId = "events" | "shabbat" | "traffic" | "buses" | "rail" | "flights" | "food" | "parking" | "bikes" | "beaches" | "rain";

const LAYERS: { id: LayerId; key: StringKey; icon: typeof BusIcon; color: string }[] = [
  { id: "events", key: "live.events", icon: CalendarDays, color: "#7048e8" },
  { id: "traffic", key: "live.traffic", icon: Car, color: "#e8590c" },
  { id: "shabbat", key: "live.shabbat", icon: BusIcon, color: "#7048e8" },
  { id: "buses", key: "live.buses", icon: BusIcon, color: "#0b63e5" },
  { id: "rail", key: "live.rail", icon: TrainFront, color: "#e03131" },
  { id: "flights", key: "live.flights", icon: Plane, color: "#ff5a1f" },
  { id: "food", key: "live.food", icon: UtensilsCrossed, color: "#e8590c" },
  { id: "parking", key: "live.parking", icon: SquareParking, color: "#1971c2" },
  { id: "bikes", key: "live.bikes", icon: Bike, color: "#2f9e44" },
  { id: "beaches", key: "live.beaches", icon: Waves, color: "#0f8a9d" },
  { id: "rain", key: "live.rain", icon: CloudRain, color: "#5c7cfa" },
];

// Map layer ids that belong to each toggle.
const MAP_LAYERS: Record<LayerId, string[]> = {
  events: ["events-halo", "events"],
  rail: ["rail-glow", "rail-train", "rail-line", "rail-stations", "rail-stations-label"],
  buses: ["buses-glow", "buses-dot", "buses-icon", "buses-label", "trip-route", "trip-ahead", "trip-casing", "trip-trail"],
  flights: ["flights-icon", "flights-label"],
  food: ["food-closed", "food-open"],
  bikes: ["bikes", "bikes-count"],
  traffic: ["traffic-casing", "traffic", "traffic-reports"],
  shabbat: ["naim-lines", "naim-stops"],
  parking: ["parking", "parking-label"],
  beaches: ["beaches", "beaches-label"],
  rain: ["rain"],
};

type Selected =
  | { kind: "bus"; bus: Bus }
  | { kind: "plane"; plane: Aircraft }
  | { kind: "place"; place: Place }
  | { kind: "beach"; id: string }
  | { kind: "event"; event: FeedEvent }
  | { kind: "park"; park: CarPark }
  | { kind: "dock"; dock: BikeDock }
  | { kind: "jam"; jam: Jam }
  | { kind: "report"; report: RoadReport };

const fc = (features: unknown[]) => ({ type: "FeatureCollection", features });
const line = (coordinates: [number, number][], properties: Record<string, unknown> = {}) => ({
  type: "Feature", geometry: { type: "LineString", coordinates }, properties,
});

// Points along the great circle between two places, so long flight routes curve like on a globe.
const greatCircle = (a: [number, number], b: [number, number], n = 64): [number, number][] => {
  const r = Math.PI / 180;
  const [l1, p1, l2, p2] = [a[0] * r, a[1] * r, b[0] * r, b[1] * r];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (!d) return [a, b];
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    return [Math.atan2(y, x) / r, Math.atan2(z, Math.sqrt(x * x + y * y)) / r] as [number, number];
  });
};

const SQUAWK_EMERGENCY = new Set(["7500", "7600", "7700"]);
const pt = (lon: number, lat: number, properties: Record<string, unknown>) => ({
  type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties,
});

const Live = () => {
  const { t, lang } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  // ?layers=shabbat,traffic switches layers on from a link; the weekend shuttles show by themselves on Shabbat.
  const linked = new URLSearchParams(window.location.search).get("layers")?.split(",") ?? [];
  const weekend = (() => { const d = new Date(); return (d.getDay() === 5 && d.getHours() >= 14) || (d.getDay() === 6 && d.getHours() < 20); })();
  const [on, setOn] = useState<Record<LayerId, boolean>>({
    shabbat: weekend || linked.includes("shabbat"),
    events: true, traffic: linked.includes("traffic"),
    buses: true, rail: true, flights: true, food: true, parking: linked.includes("parking"), bikes: linked.includes("bikes"), beaches: true, rain: false,
  });
  const [selected, setSelected] = useState<Selected | null>(null);
  const [tick, setTick] = useState(0); // re-evaluates "open now" every minute
  const [whereOpen, setWhereOpen] = useState(() => new URLSearchParams(window.location.search).has("where"));
  const [where, setWhere] = useState<WhereResult | null>(null);
  const [lineFilter, setLineFilter] = useState<number | null>(null);
  const myPos = useRef<{ lat: number; lon: number } | null>(null);

  const buses = useBuses(on.buses);
  const aircraft = useAircraft(on.flights);
  const places = usePlaces(on.food);
  const traffic = useTraffic(on.traffic);
  const parking = useParking(on.parking);
  const docks = useTelofan(on.bikes);
  const city = useCityData();
  const beaches = useBeaches();
  const rain = useRain(on.rain);
  const eventsFeed = useEventsFeed();
  const rail = useRail();
  const { phase } = useTheme();

  useEffect(() => {
    document.title = lang === "he" ? "מפה חיה · TLV Radar" : "Live map · TLV Radar";
  }, [lang]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Buses glide between reported positions; planes too, faster.
  const tweenBuses = useRef(createTweener(2200));
  const tweenPlanes = useRef(createTweener(1200));

  // Full objects behind each feature id, for the detail panel.
  const lookup = useRef({
    buses: new Map<string, Bus>(), planes: new Map<string, Aircraft>(), places: new Map<string, Place>(), events: new Map<string, FeedEvent>(),
    parks: new Map<string, CarPark>(), docks: new Map<string, BikeDock>(), jams: [] as Jam[], reports: [] as RoadReport[],
  });

  /* ---------- create the map (again whenever day turns to night) ---------- */
  useEffect(() => {
    let cancelled = false;
    let map: MapLibre | null = null;
    const C = liveColors(phase);
    setReady(false);
    // Keep the view when the map is rebuilt for a new phase.
    const prev = mapRef.current;
    const view = prev
      ? { center: prev.getCenter(), zoom: prev.getZoom(), pitch: prev.getPitch(), bearing: prev.getBearing() }
      : { center: [TLV_CENTER.lon, TLV_CENTER.lat], zoom: 13.2, pitch: 50, bearing: -24 };
    Promise.all([loadMapLibre(), mapStyleFor(phase)])
      .then(([maplibregl, style]) => {
        if (cancelled || !containerRef.current) return;
        prev?.remove();
        map = new maplibregl.Map({
          container: containerRef.current,
          style,
          ...view,
          minZoom: 9,
          maxZoom: 18,
          maxPitch: 70,
          attributionControl: { compact: true },
          cooperativeGestures: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-right");

        // Some base-style patterns aren't in the sprite; give MapLibre a blank so it stops waiting.
        map.on("styleimagemissing", (e: { id: string }) => {
          if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
        });
        map.once("style.load", () => {
          if (cancelled) return;
          // Prefixed names: the base map style ships its own "bus" icon (a bus-stop sign).
          map.addImage("radar-bus", busIcon(C.bus), { pixelRatio: 2 });
          map.addImage("radar-plane", planeIcon(C.plane), { pixelRatio: 2 });

          const empty = fc([]);
          for (const id of ["events", "buses", "flights", "food", "bikes", "beaches", "me", "rail-lines", "rail-stations", "traffic", "traffic-reports", "parking", "naim-lines", "naim-stops", "trip-route", "trip-ahead", "trip-trail", "sel", "where", "flight-path"]) map.addSource(id, { type: "geojson", data: empty });

          // Traffic jams reported by Waze drivers, shared by the city: yellow slow, red stopped.
          map.addLayer({
            id: "traffic-casing", type: "line", source: "traffic",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": C.halo, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 3, 16, 10], "line-opacity": 0.8 },
          });
          map.addLayer({
            id: "traffic", type: "line", source: "traffic",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": ["step", ["get", "level"], "#fab005", 2, "#fd7e14", 3, "#f03e3e", 4, "#c92a2a", 5, "#862e9c"],
              "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, 6],
            },
          });
          map.addLayer({
            id: "traffic-reports", type: "circle", source: "traffic-reports", minzoom: 12,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 3.5, 16, 7],
              "circle-color": ["match", ["get", "type"], "ROAD_CLOSED", "#c92a2a", "ACCIDENT", "#f03e3e", "JAM", "#fd7e14", "#fab005"],
              "circle-stroke-color": C.halo, "circle-stroke-width": 2,
            },
          });

          // The city's free weekend shuttles, each line in its own colour.
          map.addLayer({
            id: "naim-lines", type: "line", source: "naim-lines",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": ["get", "color"], "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, 5], "line-opacity": 0.85 },
          });
          map.addLayer({
            id: "naim-stops", type: "circle", source: "naim-stops", minzoom: 13.5,
            paint: { "circle-radius": 3.5, "circle-color": C.halo, "circle-stroke-color": "#7048e8", "circle-stroke-width": 2 },
          });

          // Light rail lines in their official colours; heavy rail thinner and dashed.
          map.addLayer({
            id: "rail-glow", type: "line", source: "rail-lines", filter: ["==", ["get", "kind"], "light_rail"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": ["get", "colour"], "line-width": ["interpolate", ["linear"], ["zoom"], 11, 6, 16, 16], "line-opacity": phase === "day" ? 0.15 : 0.3, "line-blur": 6 },
          });
          // line-dasharray can't vary per feature, so trains get their own dashed layer.
          map.addLayer({
            id: "rail-train", type: "line", source: "rail-lines", filter: ["==", ["get", "kind"], "train"],
            paint: { "line-color": phase === "day" ? "#6b7a90" : "#9fb0c8", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1, 16, 2.5], "line-dasharray": [2, 1.5], "line-opacity": 0.8 },
          });
          map.addLayer({
            id: "rail-line", type: "line", source: "rail-lines", filter: ["==", ["get", "kind"], "light_rail"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": ["get", "colour"], "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, 5], "line-opacity": 0.95 },
          });
          map.addLayer({
            id: "rail-stations", type: "circle", source: "rail-stations", minzoom: 12.5,
            paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 12.5, 2.5, 16, 6], "circle-color": C.halo, "circle-stroke-color": C.text, "circle-stroke-width": 1.5 },
          });
          map.addLayer({
            id: "rail-stations-label", type: "symbol", source: "rail-stations", minzoom: 14.5,
            layout: { "text-field": ["get", lang === "he" ? "nameHe" : "name"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1.2], "text-anchor": "top" },
            paint: { "text-color": C.text, "text-halo-color": C.halo, "text-halo-width": 1.5 },
          });

          map.addLayer({
            id: "food-closed", type: "circle", source: "food", filter: ["!=", ["get", "state"], "open"], minzoom: 13,
            paint: { "circle-radius": 2.5, "circle-color": "#adb5bd", "circle-opacity": 0.6 },
          });
          map.addLayer({
            id: "food-open", type: "circle", source: "food", filter: ["==", ["get", "state"], "open"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 1.6, 14, 3, 16, 6],
              "circle-color": C.open, "circle-opacity": 0.85,
              "circle-stroke-color": C.halo, "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 1],
            },
          });
          // Tel-O-Fun docks: green with bikes to take, grey when empty.
          map.addLayer({
            id: "bikes", type: "circle", source: "bikes",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2.5, 14, 5, 16, 9],
              "circle-color": ["case", [">", ["get", "bikes"], 0], C.bike, "#adb5bd"],
              "circle-stroke-color": C.halo, "circle-stroke-width": 1.5,
            },
          });
          map.addLayer({
            id: "bikes-count", type: "symbol", source: "bikes", minzoom: 15,
            layout: { "text-field": ["to-string", ["get", "bikes"]], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-allow-overlap": true },
            paint: { "text-color": "#ffffff" },
          });
          // City car parks with their live sign: free, a few left, full.
          map.addLayer({
            id: "parking", type: "circle", source: "parking",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 15, 10],
              "circle-color": ["match", ["get", "status"], "free", "#2f9e44", "few", "#f08c00", "full", "#e03131", "#868e96"],
              "circle-stroke-color": C.halo, "circle-stroke-width": 2,
            },
          });
          map.addLayer({
            id: "parking-label", type: "symbol", source: "parking",
            layout: { "text-field": "P", "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 11, 8, 15, 13], "text-allow-overlap": true },
            paint: { "text-color": "#ffffff" },
          });
          map.addLayer({
            id: "events-halo", type: "circle", source: "events",
            paint: { "circle-radius": 16, "circle-color": C.event, "circle-opacity": 0.22, "circle-blur": 0.6 },
          });
          map.addLayer({
            id: "events", type: "circle", source: "events",
            paint: { "circle-radius": 6.5, "circle-color": C.event, "circle-stroke-color": C.halo, "circle-stroke-width": 2 },
          });
          map.addLayer({
            id: "beaches", type: "circle", source: "beaches",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 14, 9],
              "circle-color": C.beach, "circle-stroke-color": C.halo, "circle-stroke-width": 2,
            },
          });
          map.addLayer({
            id: "beaches-label", type: "symbol", source: "beaches", minzoom: 13.3,
            layout: {
              "text-field": ["get", "label"], "text-font": ["Noto Sans Regular"], "text-size": 12,
              "text-offset": [-1.2, 0], "text-anchor": "right", "text-allow-overlap": false,
            },
            paint: { "text-color": C.text, "text-halo-color": C.halo, "text-halo-width": 1.5 },
          });
          // A selected bus: the full route faintly, what's still ahead dashed, what it has driven solid.
          map.addLayer({
            id: "trip-route", type: "line", source: "trip-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": C.bus, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 3, 16, 8], "line-opacity": 0.18 },
          });
          map.addLayer({
            id: "trip-ahead", type: "line", source: "trip-ahead",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": C.bus, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, 4], "line-dasharray": [1.2, 1.4], "line-opacity": 0.9 },
          });
          map.addLayer({
            id: "trip-casing", type: "line", source: "trip-trail",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": C.halo, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 5, 16, 10] },
          });
          map.addLayer({
            id: "trip-trail", type: "line", source: "trip-trail",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": C.bus, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 3, 16, 6] },
          });
          map.addLayer({
            id: "flight-done", type: "line", source: "flight-path", filter: ["==", ["get", "part"], "done"],
            paint: { "line-color": C.plane, "line-width": 2, "line-opacity": 0.45 },
          });
          map.addLayer({
            id: "flight-ahead", type: "line", source: "flight-path", filter: ["==", ["get", "part"], "ahead"],
            paint: { "line-color": C.plane, "line-width": 2, "line-dasharray": [2, 2], "line-opacity": 0.9 },
          });
          map.addLayer({
            id: "where", type: "circle", source: "where",
            paint: {
              "circle-radius": 8, "circle-color": ["match", ["get", "kind"], "dest", "#ff5a1f", C.bus],
              "circle-stroke-color": C.halo, "circle-stroke-width": 3,
            },
          });
          // City-wide view: buses as small dots, so the map stays readable with ~1,000 of them.
          map.addLayer({
            id: "buses-glow", type: "circle", source: "buses", maxzoom: 15,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 10],
              "circle-color": C.busGlow, "circle-opacity": phase === "day" ? 0.12 : 0.22, "circle-blur": 1,
            },
          });
          map.addLayer({
            id: "buses-dot", type: "circle", source: "buses", maxzoom: 12.5,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1.8, 12.5, 3.4],
              "circle-color": C.bus, "circle-opacity": 0.9,
            },
          });
          map.addLayer({
            id: "buses-icon", type: "symbol", source: "buses", minzoom: 12.5,
            layout: {
              "icon-image": "radar-bus", "icon-size": ["interpolate", ["linear"], ["zoom"], 12.5, 0.45, 14, 0.7, 17, 1],
              "icon-rotate": ["get", "bearing"], "icon-rotation-alignment": "map",
              "icon-allow-overlap": true, "icon-ignore-placement": true,
            },
          });
          map.addLayer({
            id: "buses-label", type: "symbol", source: "buses", minzoom: 13.8,
            layout: {
              "text-field": ["get", "line"], "text-font": ["Noto Sans Regular"], "text-size": 11,
              "text-offset": [0, 1.4], "text-anchor": "top",
            },
            paint: { "text-color": C.text, "text-halo-color": C.halo, "text-halo-width": 1.5 },
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
            paint: { "text-color": C.plane, "text-halo-color": C.halo, "text-halo-width": 1.5 },
          });
          map.addLayer({
            id: "sel", type: "circle", source: "sel",
            paint: {
              "circle-radius": 17, "circle-color": "transparent",
              "circle-stroke-color": ["match", ["get", "kind"], "plane", C.plane, C.bus], "circle-stroke-width": 3,
            },
          });
          map.addLayer({
            id: "me", type: "circle", source: "me",
            paint: { "circle-radius": 7, "circle-color": C.bus, "circle-stroke-color": C.halo, "circle-stroke-width": 3 },
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
          pick("bikes", (p) => { const d = lookup.current.docks.get(String(p.id)); if (d) setSelected({ kind: "dock", dock: d }); });
          pick("parking", (p) => { const k = lookup.current.parks.get(String(p.id)); if (k) setSelected({ kind: "park", park: k }); });
          pick("traffic", (p) => { const j = lookup.current.jams[Number(p.i)]; if (j) setSelected({ kind: "jam", jam: j }); });
          pick("traffic-reports", (p) => { const r = lookup.current.reports[Number(p.i)]; if (r) setSelected({ kind: "report", report: r }); });
          pick("beaches", (p) => setSelected({ kind: "beach", id: String(p.id) }));
          pick("events", (p) => { const ev = lookup.current.events.get(String(p.id)); if (ev) setSelected({ kind: "event", event: ev }); });

          setReady(true);
        });
        map.on("error", () => { /* individual tile errors are non-fatal */ });
      })
      .catch(() => setMapError(true));

    return () => {
      cancelled = true;
    };
  }, [phase]);

  // Remove the map when leaving the page.
  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  /* ---------- push data into the map ---------- */
  useEffect(() => {
    if (!ready || !buses.data) return;
    lookup.current.buses = new Map(buses.data.buses.map((b) => [b.id, b]));
    tweenBuses.current(mapRef.current, "buses",
      buses.data.buses.map((b) => ({ id: b.id, lon: b.lon, lat: b.lat, props: { bearing: b.bearing, line: b.line ?? "", lineRef: b.lineRef } })));
  }, [ready, buses.data]);

  useEffect(() => {
    if (!ready || !aircraft.data) return;
    lookup.current.planes = new Map(aircraft.data.map((a) => [a.id, a]));
    tweenPlanes.current(mapRef.current, "flights",
      aircraft.data.map((a) => ({ id: a.id, lon: a.lon, lat: a.lat, props: { track: a.track, callsign: a.callsign } })));
  }, [ready, aircraft.data]);

  const foodCounts = useMemo(() => {
    if (!places.data) return { open: 0, features: [] as unknown[] };
    const now = new Date();
    let open = 0;
    const features: unknown[] = [];
    for (const p of places.data) {
      if (p.kind === "bicycle_rental") continue; // live Tel-O-Fun docks are their own layer
      const state = openStateAt(p.hours, now).status;
      if (state === "open") open++;
      features.push(pt(p.lon, p.lat, { id: p.id, state }));
    }
    return { open, features };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.data, tick]);

  useEffect(() => {
    if (!ready || !places.data) return;
    lookup.current.places = new Map(places.data.map((p) => [p.id, p]));
    mapRef.current?.getSource("food")?.setData(fc(foodCounts.features));
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
    () => (eventsFeed.data?.events ?? []).filter((e) => e.lat != null && e.lon != null && isEveningOut(e) && inRange(e.start, e.end, "tonight")),
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

  useEffect(() => {
    if (!ready || !city.data) return;
    mapRef.current?.getSource("naim-lines")?.setData(fc((city.data.naimLines ?? []).map((f) => ({
      ...f, properties: { ...f.properties, color: `#${(f.properties.color ?? "7048e8").replace("#", "")}` },
    }))));
    mapRef.current?.getSource("naim-stops")?.setData(fc((city.data.naimStops ?? []).map((x) => pt(x.at[0], x.at[1], { name: x.name, lines: x.lines }))));
  }, [ready, city.data]);

  useEffect(() => {
    if (!ready || !docks.data) return;
    lookup.current.docks = new Map(docks.data.map((d) => [String(d.id), d]));
    mapRef.current?.getSource("bikes")?.setData(fc(docks.data.map((d) => pt(d.lon, d.lat, { id: String(d.id), bikes: d.bikes + d.ebikes }))));
  }, [ready, docks.data]);

  useEffect(() => {
    if (!ready || !parking.data) return;
    lookup.current.parks = new Map(parking.data.map((k) => [k.id, k]));
    mapRef.current?.getSource("parking")?.setData(fc(parking.data.map((k) => pt(k.lon, k.lat, { id: k.id, status: k.status }))));
  }, [ready, parking.data]);

  useEffect(() => {
    if (!ready || !traffic.data) return;
    lookup.current.jams = traffic.data.jams;
    lookup.current.reports = traffic.data.reports;
    mapRef.current?.getSource("traffic")?.setData(fc(traffic.data.jams.map((j, i) => ({
      type: "Feature", geometry: { type: "MultiLineString", coordinates: j.path }, properties: { i, level: j.level },
    }))));
    mapRef.current?.getSource("traffic-reports")?.setData(fc(traffic.data.reports.map((r, i) => pt(r.lon, r.lat, { i, type: r.type }))));
  }, [ready, traffic.data]);

  useEffect(() => {
    if (!ready || !rail.data) return;
    mapRef.current?.getSource("rail-lines")?.setData(rail.data.lines);
    mapRef.current?.getSource("rail-stations")?.setData(rail.data.stations);
  }, [ready, rail.data]);

  /* ---------- selected bus: its trip, and the line's whole route ---------- */
  const selBus = selected?.kind === "bus" ? selected.bus : null;
  const selPlane = selected?.kind === "plane" ? selected.plane : null;
  const trip = useQuery({
    queryKey: ["bus-trip", selBus?.rideId ?? selBus?.id],
    queryFn: () => fetchBusTrip(selBus!),
    enabled: !!selBus,
    staleTime: 60_000,
  });
  const linePath = useQuery({
    queryKey: ["line-path", lineFilter],
    queryFn: () => lineRoutePath(lineFilter!),
    enabled: lineFilter != null && !selBus,
    staleTime: 30 * 60_000,
  });
  const flight = useQuery({
    queryKey: ["flight-info", selPlane?.id, selPlane?.callsign],
    queryFn: () => fetchFlightInfo(selPlane!.id, selPlane!.callsign),
    enabled: !!selPlane,
    staleTime: 30 * 60_000,
  });

  // The ring around whatever is selected follows it as positions refresh.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const live = selBus ? buses.data?.buses.find((b) => b.id === selBus.id) ?? selBus
      : selPlane ? aircraft.data?.find((a) => a.id === selPlane.id) ?? selPlane : null;
    map.getSource("sel")?.setData(fc(live ? [pt(live.lon, live.lat, { kind: selBus ? "bus" : "plane" })] : []));
  }, [ready, selBus, selPlane, buses.data, aircraft.data]);

  const fitted = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const d = selBus ? trip.data : null;
    const route = d?.route ?? (lineFilter != null && !selBus ? linePath.data?.coords : null) ?? null;
    map.getSource("trip-route")?.setData(fc(route ? [line(route)] : []));
    map.getSource("trip-ahead")?.setData(fc(d?.ahead ? [line(d.ahead)] : []));
    map.getSource("trip-trail")?.setData(fc(d && d.trail.length > 1 ? [line(d.trail)] : []));
    // Frame the route once per selection, leaving room for the panel.
    const key = selBus ? `bus:${selBus.id}` : lineFilter != null ? `line:${lineFilter}` : null;
    const pts = [...(route ?? []), ...(d?.trail ?? [])];
    if (key && pts.length > 1 && fitted.current !== key) {
      fitted.current = key;
      const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
      const wide = window.innerWidth >= 768;
      map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], {
        padding: wide ? { top: 80, bottom: 60, left: 420, right: 60 } : { top: 70, bottom: 330, left: 30, right: 30 },
        maxZoom: 15, duration: 900,
      });
    }
    if (!key) fitted.current = null;
  }, [ready, selBus, trip.data, lineFilter, linePath.data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const f = flight.data;
    const a = selPlane ? aircraft.data?.find((x) => x.id === selPlane.id) ?? selPlane : null;
    const feats: unknown[] = [];
    if (a && f?.origin) feats.push(line(greatCircle([f.origin.lon, f.origin.lat], [a.lon, a.lat]), { part: "done" }));
    if (a && f?.destination) feats.push(line(greatCircle([a.lon, a.lat], [f.destination.lon, f.destination.lat]), { part: "ahead" }));
    map.getSource("flight-path")?.setData(fc(feats));
  }, [ready, selPlane, flight.data, aircraft.data]);

  // "Where to?": pins for both ends, and only the chosen line's buses.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.getSource("where")?.setData(fc(where ? [pt(where.origin.lon, where.origin.lat, { kind: "origin" }), pt(where.dest.lon, where.dest.lat, { kind: "dest" })] : []));
  }, [ready, where]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const lines = lineFilter != null ? [lineFilter] : where?.lines.length ? where.lines.map((l) => l.lineRef) : null;
    const filter = lines ? ["in", ["get", "lineRef"], ["literal", lines]] : null;
    for (const id of ["buses-glow", "buses-dot", "buses-icon", "buses-label"]) if (map.getLayer(id)) map.setFilter(id, filter);
  }, [ready, lineFilter, where]);

  const getOrigin = () =>
    new Promise<{ geo: { lat: number; lon: number; label: string }; mine: boolean }>((resolve) => {
      const centre = () => {
        const c = mapRef.current?.getCenter();
        resolve({ geo: { lat: c?.lat ?? TLV_CENTER.lat, lon: c?.lng ?? TLV_CENTER.lon, label: "" }, mine: false });
      };
      if (myPos.current) return resolve({ geo: { ...myPos.current, label: "" }, mine: true });
      if (!navigator.geolocation) return centre();
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const g = { lat: p.coords.latitude, lon: p.coords.longitude };
          // Outside Gush Dan, a "my location" search makes no sense here; use the map instead.
          if (g.lat < 31.9 || g.lat > 32.25 || g.lon < 34.7 || g.lon > 35) return centre();
          myPos.current = g;
          resolve({ geo: { ...g, label: "" }, mine: true });
        },
        centre,
        { timeout: 6000, maximumAge: 120000 },
      );
    });

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
        myPos.current = { lat: latitude, lon: longitude };
        mapRef.current?.getSource("me")?.setData(fc([pt(longitude, latitude, {})]));
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 15.5 });
        setOn((s) => ({ ...s, food: true }));
      },
      () => undefined,
      { timeout: 8000, maximumAge: 60000 },
    );
  };

  const status = (id: LayerId): string => {
    const q = { events: eventsFeed, shabbat: city, traffic, buses, rail, flights: aircraft, food: places, parking, bikes: docks, beaches, rain }[id];
    if (!on[id]) return "";
    if (q.isError && !q.data) return "!";
    if (id === "rain") return q.isLoading ? "…" : "";
    if (id === "rail") return "";
    if (q.isLoading || !q.data) return "…";
    if (id === "events") return String(tonightEvents.length);
    if (id === "buses") return String(buses.data!.buses.length);
    if (id === "flights") return String(aircraft.data!.length);
    if (id === "food") return String(foodCounts.open);
    if (id === "bikes") return String(docks.data!.reduce((n, d) => n + d.bikes + d.ebikes, 0));
    if (id === "traffic") return String(traffic.data!.jams.length);
    if (id === "shabbat") return "";
    if (id === "parking") return String(parking.data!.filter((k) => k.status === "free" || k.status === "few").length);
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
        {!whereOpen && (
          <button
            onClick={() => { setWhereOpen(true); setSelected(null); setOn((s) => ({ ...s, buses: true })); }}
            className="inline-flex items-center gap-2 h-9 rounded-full bg-background border border-border px-3.5 text-[13px] font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
          >
            <Search className="h-4 w-4" aria-hidden />
            {t("where.button")}
          </button>
        )}
      </div>

      {whereOpen && !selected && (
        <WhereTo
          getOrigin={getOrigin}
          buses={buses.data?.buses ?? []}
          activeLine={lineFilter}
          onResult={setWhere}
          onPickLine={setLineFilter}
          onClose={() => { setWhereOpen(false); setWhere(null); setLineFilter(null); }}
        />
      )}

      {selected && (
        <DetailPanel
          selected={selected}
          onClose={() => setSelected(null)}
          beaches={beaches.data}
          trip={trip.data}
          tripLoading={trip.isLoading}
          flight={flight.data}
          liveBus={selBus ? buses.data?.buses.find((b) => b.id === selBus.id) : undefined}
          livePlane={selPlane ? aircraft.data?.find((a) => a.id === selPlane.id) : undefined}
          lineFilter={lineFilter}
          onLineFilter={setLineFilter}
        />
      )}
    </SiteLayout>
  );
};

type PanelProps = {
  selected: Selected; onClose: () => void; beaches: ReturnType<typeof useBeaches>["data"];
  trip?: BusTrip; tripLoading: boolean; flight?: FlightInfo; liveBus?: Bus; livePlane?: Aircraft;
  lineFilter: number | null; onLineFilter: (l: number | null) => void;
};

const Shell = ({ onClose, children, flush = false }: { onClose: () => void; children: ReactNode; flush?: boolean }) => {
  const { t } = useI18n();
  return (
    <div className={`absolute inset-x-3 bottom-3 md:inset-x-auto md:start-3 md:bottom-6 md:w-[360px] max-h-[62%] overflow-y-auto rounded-2xl bg-background border border-border shadow-lg ${flush ? "" : "p-4"}`}>
      <button onClick={onClose} aria-label={t("live.close")} className="absolute top-2.5 end-2.5 z-10 p-1.5 rounded-full bg-background/90 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea">
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
};

const Rows = ({ rows }: { rows: [string, string][] }) => (
  <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[14px]">
    {rows.map(([k, v], i) => (
      <div key={i} className="contents">
        <dt className="text-muted-foreground">{k}</dt>
        <dd className="min-w-0 break-words" dir="auto">{v}</dd>
      </div>
    ))}
  </dl>
);

const BusPanel = ({ bus, trip, loading, lineFilter, onLineFilter, onClose }: {
  bus: Bus; trip?: BusTrip; loading: boolean; lineFilter: number | null; onLineFilter: (l: number | null) => void; onClose: () => void;
}) => {
  const { t, lang } = useI18n();
  const pct = trip?.doneKm != null && trip.totalKm ? Math.min(100, Math.round((trip.doneKm / trip.totalKm) * 100)) : null;
  const rows: [string, string][] = [];
  rows.push([t("live.speed"), `${Math.round(bus.speed)} km/h`]);
  if (bus.scheduledStart) rows.push([t("bus.scheduled"), fmtClock(bus.scheduledStart, lang)]);
  if (trip?.startedAt) rows.push([t("bus.started"), fmtClock(trip.startedAt, lang)]);
  if (trip?.tripMinutes) rows.push([t("bus.tripTime"), `~${trip.tripMinutes} ${t("live.minutes")}`]);
  rows.push([t("live.position"), `${minutesAgo(bus.recordedAt)} ${t("live.minutes")}`]);
  rows.push([t("bus.vehicle"), bus.id]);
  const only = lineFilter === bus.lineRef;
  return (
    <Shell onClose={onClose}>
      <div className="flex items-center gap-3 pe-8">
        <span className="min-w-[52px] h-11 px-2.5 rounded-xl bg-[#0b63e5] text-white text-[22px] font-semibold tabular flex items-center justify-center shadow-sm">{bus.line ?? "?"}</span>
        <div className="min-w-0">
          <p className="text-[17px] font-medium leading-tight truncate" dir="auto">→ {bus.to ?? t("live.buses")}</p>
          <p className="text-[12px] text-muted-foreground truncate" dir="auto">{[bus.from && `${t("where.from")} ${bus.from}`, bus.agency].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[12px] text-muted-foreground">
          <span>{t("bus.progress")}</span>
          {trip?.doneKm != null && <span className="tabular">{trip.doneKm.toFixed(1)}{trip.totalKm ? ` ${t("bus.of")} ${trip.totalKm.toFixed(1)}` : ""} km</span>}
        </div>
        <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
          <div className={`h-full rounded-full bg-[#0b63e5] transition-[width] duration-700 ${pct == null ? "w-1/3 animate-pulse opacity-40" : ""}`} style={pct != null ? { width: `${Math.max(4, pct)}%` } : undefined} />
        </div>
        <p className="mt-1.5 text-[12px] text-muted-foreground">{loading ? t("bus.loadingRoute") : t("bus.legend")}</p>
      </div>

      <div className="mt-3"><Rows rows={rows} /></div>

      <button
        onClick={() => onLineFilter(only ? null : bus.lineRef)}
        className="mt-3 h-9 rounded-full border border-border px-3.5 text-[13px] font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
      >
        {only ? t("bus.showAll") : t("bus.showLine")}
      </button>
    </Shell>
  );
};

const PlanePanel = ({ plane, info, onClose }: { plane: Aircraft; info?: FlightInfo; onClose: () => void }) => {
  const { t } = useI18n();
  const [broken, setBroken] = useState(false);
  const vr = plane.vRate ?? 0;
  const trend = plane.onGround ? t("flight.ground") : Math.abs(vr) < 300 ? t("flight.level") : vr > 0 ? `${t("flight.climbing")} ${Math.round(vr).toLocaleString()} ft/min` : `${t("flight.descending")} ${Math.round(-vr).toLocaleString()} ft/min`;
  const rows: [string, string][] = [];
  const model = info?.model || plane.desc || plane.type;
  if (model) rows.push([t("flight.aircraft"), `${model}${plane.type && !model.includes(plane.type) ? ` (${plane.type})` : ""}`]);
  if (plane.reg) rows.push([t("flight.reg"), plane.reg]);
  if (info?.owner && info.owner !== info.airline) rows.push(["", `${info.owner}${info.ownerCountry ? ` · ${info.ownerCountry}` : ""}`]);
  if (plane.altFt != null) rows.push([t("live.altitude"), `${plane.altFt.toLocaleString()} ft · ${Math.round(plane.altFt * 0.3048).toLocaleString()} m`]);
  rows.push(["", trend]);
  if (plane.speedKt != null) rows.push([t("live.speed"), `${Math.round(plane.speedKt)} kt · ${Math.round(plane.speedKt * 1.852)} km/h`]);
  if (plane.squawk) rows.push(["Squawk", plane.squawk]);
  const ap = (a?: FlightInfo["origin"]) => a && (
    <div className="min-w-0">
      <p className="font-display text-[30px] leading-none">{a.iata ?? "—"}</p>
      <p className="mt-1 text-[12px] text-muted-foreground truncate" dir="auto">{a.city ?? a.name}</p>
    </div>
  );
  return (
    <Shell onClose={onClose} flush>
      {info?.photo?.src && !broken && (
        <a href={info.photo.link} target="_blank" rel="noopener noreferrer" className="relative block aspect-[16/9] bg-muted overflow-hidden rounded-t-2xl">
          <img src={info.photo.src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="h-full w-full object-cover" />
          <span className="absolute bottom-1.5 end-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">© {info.photo.by} · Planespotters.net</span>
        </a>
      )}
      <div className="p-4">
        {plane.squawk && SQUAWK_EMERGENCY.has(plane.squawk) && (
          <p className="mb-2 rounded-lg bg-destructive/10 text-destructive px-2.5 py-1.5 text-[13px] font-medium">{t("flight.emergency")} {plane.squawk}</p>
        )}
        <div className="pe-8">
          <p className="text-[19px] font-semibold leading-tight">{plane.callsign || plane.id}{info?.flightIata && info.flightIata !== plane.callsign ? <span className="ms-2 text-[14px] font-normal text-muted-foreground">{info.flightIata}</span> : null}</p>
          {(info?.airline || plane.operator) && <p className="text-[13px] text-muted-foreground" dir="auto">{info?.airline ?? plane.operator}</p>}
        </div>
        {(info?.origin || info?.destination) && (
          <div className="mt-3 grid grid-cols-[1fr,auto,1fr] items-center gap-3 rounded-xl bg-secondary px-3 py-3">
            {ap(info.origin) ?? <span />}
            <Plane className="h-5 w-5 text-[#ff5a1f] rtl:-scale-x-100" style={{ transform: "rotate(45deg)" }} aria-hidden />
            <div className="text-end">{ap(info.destination)}</div>
          </div>
        )}
        <div className="mt-3"><Rows rows={rows} /></div>
        <a href={`https://globe.adsb.lol/?icao=${plane.id}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[14px] font-medium text-sea hover:underline underline-offset-4">
          {t("flight.track")}
        </a>
      </div>
    </Shell>
  );
};

const DetailPanel = ({ selected, onClose, beaches, trip, tripLoading, flight, liveBus, livePlane, lineFilter, onLineFilter }: PanelProps) => {
  const { t, lang } = useI18n();

  if (selected.kind === "bus") {
    return <BusPanel bus={liveBus ?? selected.bus} trip={trip} loading={tripLoading} lineFilter={lineFilter} onLineFilter={onLineFilter} onClose={onClose} />;
  }
  if (selected.kind === "plane") {
    return <PlanePanel plane={livePlane ?? selected.plane} info={flight} onClose={onClose} />;
  }

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
  } else if (selected.kind === "park") {
    const k = selected.park;
    title = k.name;
    rows.push(["", t(`park.${k.status}` as StringKey)]);
    if (k.statusAt) rows.push([t("live.position"), `${minutesAgo(new Date(k.statusAt).toISOString())} ${t("live.minutes")}`]);
    if (k.address) rows.push(["", k.address]);
    if (k.dayRate) rows.push([t("park.day"), k.dayRate]);
    if (k.nightRate) rows.push([t("park.night"), k.nightRate]);
    if (k.dailyMax) rows.push([t("park.max"), k.dailyMax]);
    if (k.hours) rows.push([t("live.hours"), k.hours]);
    if (k.notes) rows.push(["", k.notes]);
    link = `https://www.google.com/maps/dir/?api=1&destination=${k.lat},${k.lon}`;
  } else if (selected.kind === "dock") {
    const d = selected.dock;
    title = `Tel-O-Fun · ${d.name}`;
    rows.push([t("dock.bikes"), String(d.bikes)]);
    if (d.ebikes) rows.push([t("dock.ebikes"), String(d.ebikes)]);
    rows.push([t("dock.free"), String(d.docks)]);
    link = `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lon}&travelmode=walking`;
  } else if (selected.kind === "jam") {
    const j = selected.jam;
    title = j.street || t("live.traffic");
    rows.push(["", t(`jam.l${Math.min(5, Math.max(1, j.level))}` as StringKey)]);
    if (j.kmh > 0) rows.push([t("live.speed"), `${Math.round(j.kmh)} km/h`]);
    if (j.delay > 0) rows.push([t("jam.delay"), `+${Math.round(j.delay / 60)} ${t("live.minutes")}`]);
    rows.push(["", t("jam.source")]);
  } else if (selected.kind === "report") {
    const r = selected.report;
    title = t((({ ROAD_CLOSED: "rep.closed", ACCIDENT: "rep.accident", JAM: "rep.jam" } as Record<string, StringKey>)[r.type] ?? "rep.hazard"));
    if (r.street) rows.push(["", r.street]);
    if (r.since) rows.push([t("rep.since"), new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { timeZone: "Asia/Jerusalem", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(r.since))]);
    rows.push(["", t("jam.source")]);
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
    <Shell onClose={onClose}>
      <h2 className="pe-8 text-[17px] font-medium leading-snug" dir="auto">{title}</h2>
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
          {selected.kind === "event" ? `${t("on.tickets")} · ${selected.event.source}` : t("live.directions")}
        </a>
      )}
    </Shell>
  );
};

export default Live;
