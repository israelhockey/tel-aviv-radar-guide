import { useEffect, useRef } from "react";
import { loadMapLibre, type MapLibre } from "@/lib/live/maplibre";
import { mapStyleFor } from "@/lib/live/mapStyle";
import { useTheme } from "@/lib/theme";

// A small, still map with one pin: for place pages and walks.
export const MiniMap = ({ lat, lon, zoom = 15.5, className = "", line }: { lat: number; lon: number; zoom?: number; className?: string; line?: [number, number][] }) => {
  const box = useRef<HTMLDivElement>(null);
  const { phase } = useTheme();
  useEffect(() => {
    let map: MapLibre | null = null;
    let cancelled = false;
    // The map must re-measure once its box has its final size (grids settle after first paint).
    const ro = new ResizeObserver(() => map?.resize());
    if (box.current) ro.observe(box.current);
    Promise.all([loadMapLibre(), mapStyleFor(phase)]).then(([maplibregl, style]) => {
      if (cancelled || !box.current) return;
      map = new maplibregl.Map({ container: box.current, style, center: [lon, lat], zoom, pitch: 40, interactive: true, attributionControl: { compact: true }, cooperativeGestures: true });
      requestAnimationFrame(() => map?.resize());
      map.once("style.load", () => {
        map.resize();
        if (line && line.length > 1) {
          map.addSource("walk", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: line }, properties: {} } });
          map.addLayer({ id: "walk", type: "line", source: "walk", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ff5a4e", "line-width": 5 } });
          map.addSource("stops", { type: "geojson", data: { type: "FeatureCollection", features: line.map((c, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties: { n: String(i + 1) } })) } });
          map.addLayer({ id: "stops", type: "circle", source: "stops", paint: { "circle-radius": 11, "circle-color": "#ff5a4e", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
          map.addLayer({ id: "stops-n", type: "symbol", source: "stops", layout: { "text-field": ["get", "n"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": "#ffffff" } });
          const lons = line.map((c) => c[0]), lats = line.map((c) => c[1]);
          map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 40, duration: 0 });
        } else {
          map.addSource("pin", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: {} } });
          map.addLayer({ id: "pin-halo", type: "circle", source: "pin", paint: { "circle-radius": 18, "circle-color": "#ff5a4e", "circle-opacity": 0.25 } });
          map.addLayer({ id: "pin", type: "circle", source: "pin", paint: { "circle-radius": 8, "circle-color": "#ff5a4e", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
        }
      });
    }).catch(() => undefined);
    return () => { cancelled = true; ro.disconnect(); map?.remove(); };
  }, [lat, lon, zoom, phase, line]);
  return (
    <div className={`relative overflow-hidden rounded-xl bg-secondary ${className}`}>
      <div className="absolute inset-0"><div ref={box} className="h-full w-full" /></div>
    </div>
  );
};
