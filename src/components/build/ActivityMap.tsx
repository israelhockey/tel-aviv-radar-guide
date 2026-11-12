import { useEffect, useRef } from "react";
import { loadMapLibre, type MapLibre } from "@/lib/live/maplibre";
import { mapStyleFor } from "@/lib/live/mapStyle";
import { useTheme } from "@/lib/theme";
import type { Activity, ActivityKind } from "@/lib/live/build";

export const KIND_COLOR: Record<ActivityKind, string> = {
  permit: "#0057ff", site: "#ff5a4e", night: "#7a5cff", road: "#f59f00", danger: "#c92a2a", plan: "#2f9e44",
};

const circle = (lat: number, lon: number, r: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    pts.push([lon + (r * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (r * Math.sin(a)) / 110540]);
  }
  return pts;
};

// The address, the search radius, and everything found inside it, coloured by kind.
export const ActivityMap = ({ lat, lon, radius, items, selected, onSelect, className = "" }: {
  lat: number; lon: number; radius: number; items: Activity[]; selected?: string | null; onSelect?: (id: string) => void; className?: string;
}) => {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const ready = useRef(false);
  const { phase } = useTheme();
  const latest = useRef({ items, radius, lat, lon, selected, onSelect });
  latest.current = { items, radius, lat, lon, selected, onSelect };

  const sync = () => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const { items, radius, lat, lon, selected } = latest.current;
    const fc = {
      type: "FeatureCollection",
      features: items.filter((a) => a.geometry).map((a) => ({
        type: "Feature", id: a.id, geometry: a.geometry, properties: { id: a.id, kind: a.kind, color: KIND_COLOR[a.kind], sel: a.id === selected ? 1 : 0 },
      })),
    };
    const pins = {
      type: "FeatureCollection",
      features: items.filter((a) => a.kind !== "plan").map((a) => ({ type: "Feature", geometry: { type: "Point", coordinates: [a.lon, a.lat] }, properties: { id: a.id, color: KIND_COLOR[a.kind], sel: a.id === selected ? 1 : 0 } })),
    };
    (map.getSource("act") as any)?.setData(fc);
    (map.getSource("pins") as any)?.setData(pins);
    (map.getSource("ring") as any)?.setData({ type: "Feature", geometry: { type: "Polygon", coordinates: [circle(lat, lon, radius)] }, properties: {} });
    (map.getSource("home") as any)?.setData({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: {} });
  };

  useEffect(() => {
    let cancelled = false;
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    if (box.current) ro.observe(box.current);
    const dbg = (m: string) => { if (new URLSearchParams(window.location.search).has("debugmap")) console.error(`[map] ${m}`); };
    dbg(`effect ${box.current?.clientWidth}x${box.current?.clientHeight}`);
    Promise.all([loadMapLibre(), mapStyleFor(phase)]).then(([maplibregl, style]) => {
      dbg(`loaded cancelled=${cancelled} box=${!!box.current}`);
      if (cancelled || !box.current) return;
      const map = new maplibregl.Map({ container: box.current, style, center: [lon, lat], zoom: 16, attributionControl: { compact: true }, cooperativeGestures: true });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("error", (e: any) => dbg(`error ${e?.error?.message ?? e}`));
      map.once("style.load", () => {
        dbg("style.load");
        const empty = { type: "FeatureCollection", features: [] };
        map.addSource("ring", { type: "geojson", data: empty });
        map.addSource("act", { type: "geojson", data: empty });
        map.addSource("pins", { type: "geojson", data: empty });
        map.addSource("home", { type: "geojson", data: empty });
        map.addLayer({ id: "ring-fill", type: "fill", source: "ring", paint: { "fill-color": "#0057ff", "fill-opacity": 0.05 } });
        map.addLayer({ id: "ring-line", type: "line", source: "ring", paint: { "line-color": "#0057ff", "line-width": 2, "line-dasharray": [2, 2] } });
        map.addLayer({ id: "plan-line", type: "line", source: "act", filter: ["==", ["get", "kind"], "plan"], paint: { "line-color": "#2f9e44", "line-width": 1.5, "line-dasharray": [1, 1.5], "line-opacity": 0.7 } });
        map.addLayer({ id: "act-fill", type: "fill", source: "act", filter: ["match", ["get", "kind"], ["permit", "site", "night"], true, false], paint: { "fill-color": ["get", "color"], "fill-opacity": ["case", ["==", ["get", "sel"], 1], 0.65, 0.35] } });
        map.addLayer({ id: "act-outline", type: "line", source: "act", filter: ["match", ["get", "kind"], ["permit", "site", "night"], true, false], paint: { "line-color": ["get", "color"], "line-width": ["case", ["==", ["get", "sel"], 1], 3, 1.2] } });
        map.addLayer({ id: "act-road", type: "line", source: "act", filter: ["==", ["get", "kind"], "road"], layout: { "line-cap": "round" }, paint: { "line-color": ["get", "color"], "line-width": ["case", ["==", ["get", "sel"], 1], 9, 6], "line-opacity": 0.85 } });
        map.addLayer({ id: "pins", type: "circle", source: "pins", paint: { "circle-radius": ["case", ["==", ["get", "sel"], 1], 9, 5.5], "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        map.addLayer({ id: "home-halo", type: "circle", source: "home", paint: { "circle-radius": 18, "circle-color": "#ffcb05", "circle-opacity": 0.45 } });
        map.addLayer({ id: "home", type: "circle", source: "home", paint: { "circle-radius": 8, "circle-color": "#0b1a33", "circle-stroke-color": "#ffcb05", "circle-stroke-width": 3 } });
        for (const layer of ["pins", "act-fill", "act-road"]) {
          map.on("click", layer, (e: any) => { const id = e.features?.[0]?.properties?.id; if (id) latest.current.onSelect?.(id); });
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }
        ready.current = true;
        sync();
        const r = circle(lat, lon, radius);
        const lons = r.map((p) => p[0]), lats = r.map((p) => p[1]);
        map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 24, duration: 0 });
      });
    }).catch((e) => dbg(`failed ${e}`));
    return () => { cancelled = true; ready.current = false; ro.disconnect(); mapRef.current?.remove(); mapRef.current = null; };
  }, [lat, lon, phase]);

  useEffect(() => {
    sync();
    const map = mapRef.current;
    if (map && ready.current) {
      const r = circle(lat, lon, radius);
      const lons = r.map((p) => p[0]), lats = r.map((p) => p[1]);
      map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 24, duration: 400 });
    }
  }, [items, radius]);

  useEffect(() => {
    sync();
    const a = items.find((x) => x.id === selected);
    if (a && mapRef.current) mapRef.current.easeTo({ center: [a.lon, a.lat], duration: 400 });
  }, [selected]);

  return <div className={`relative overflow-hidden rounded-[10px] bg-secondary ${className}`}><div ref={box} className="absolute inset-0" /></div>;
};
