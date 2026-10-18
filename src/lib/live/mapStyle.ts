// TLV Radar's own map look, built on OpenFreeMap's free vector tiles:
// a light Mediterranean day map and a navy night map with amber street light,
// both with 3D buildings at their real heights and a sky at the horizon.
import type { Phase } from "@/lib/theme";

const BASE = { day: "https://tiles.openfreemap.org/styles/positron", night: "https://tiles.openfreemap.org/styles/dark" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Style = any;

const cache = new Map<string, Promise<Style>>();

const paint = (style: Style, id: string, key: string, value: unknown) => {
  const layer = style.layers.find((l: { id: string }) => l.id === id);
  if (layer) layer.paint = { ...(layer.paint ?? {}), [key]: value };
};

const buildings = (colors: [number, string][], opacity: number) => ({
  id: "radar-buildings",
  type: "fill-extrusion",
  source: "openmaptiles",
  "source-layer": "building",
  minzoom: 13,
  paint: {
    "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 0], ...colors.flat()],
    "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, ["coalesce", ["get", "render_height"], 0]],
    "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
    "fill-extrusion-opacity": opacity,
  },
});

const insertBelowLabels = (style: Style, layer: unknown) => {
  const i = style.layers.findIndex((l: { type: string }) => l.type === "symbol");
  style.layers.splice(i < 0 ? style.layers.length : i, 0, layer);
};

const night = (style: Style, dusk: boolean) => {
  paint(style, "background", "background-color", "#0a1424");
  paint(style, "water", "fill-color", "#0b2340");
  paint(style, "landuse_residential", "fill-color", "#0d1a2c");
  paint(style, "landuse_park", "fill-color", "#0c2421");
  paint(style, "landcover_wood", "fill-color", "#0c2421");
  paint(style, "highway_path", "line-color", "#16233a");
  paint(style, "highway_minor", "line-color", "#1c2b45");
  for (const id of ["highway_major_inner", "highway_major_subtle"]) paint(style, id, "line-color", "#7a6438");
  for (const id of ["highway_motorway_inner", "highway_motorway_subtle"]) paint(style, id, "line-color", "#b88a3e");
  for (const id of ["highway_major_casing", "highway_motorway_casing"]) paint(style, id, "line-color", "#0a1424");
  for (const id of ["railway_transit", "railway"]) paint(style, id, "line-color", "#3b5f99");
  style.layers = style.layers.filter((l: { id: string }) => l.id !== "building");
  insertBelowLabels(style, buildings([[0, "#15233b"], [30, "#1d3253"], [100, "#2c4876"], [200, "#3d63a0"]], 0.92));
  style.sky = dusk
    ? { "sky-color": "#1d1a3a", "horizon-color": "#ff8a5c", "fog-color": "#2a1f4a", "sky-horizon-blend": 0.7, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.9 }
    : { "sky-color": "#0a1424", "horizon-color": "#24497f", "fog-color": "#0a1424", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.9 };
};

const day = (style: Style) => {
  paint(style, "background", "background-color", "#f3f5f7");
  paint(style, "water", "fill-color", "#bcd8f0");
  style.layers = style.layers.filter((l: { id: string }) => l.id !== "building");
  insertBelowLabels(style, buildings([[0, "#e6eaef"], [30, "#d8dfe8"], [100, "#c6d1df"], [200, "#b3c2d6"]], 0.95));
  style.sky = { "sky-color": "#bfe0ff", "horizon-color": "#eef6ff", "fog-color": "#f3f5f7", "sky-horizon-blend": 0.5, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.9 };
};

export const mapStyleFor = (phase: Phase): Promise<Style> => {
  const key = phase;
  if (!cache.has(key)) {
    const base = phase === "day" ? BASE.day : BASE.night;
    cache.set(key, fetch(base).then((r) => r.json()).then((style) => {
      if (phase === "day") day(style);
      else night(style, phase === "dusk");
      return style;
    }).catch((e) => { cache.delete(key); throw e; }));
  }
  // Each map gets its own copy; MapLibre mutates styles it is given.
  return cache.get(key)!.then((s) => structuredClone(s));
};

// Colours for live layers that read on both maps.
export const liveColors = (phase: Phase) => phase === "day"
  ? { bus: "#0b63e5", busGlow: "#0b63e5", plane: "#ff5a3c", event: "#7048e8", open: "#e8590c", bike: "#2f9e44", beach: "#0f8a9d", text: "#0e1b2c", halo: "#ffffff" }
  : { bus: "#9fd0ff", busGlow: "#4da3ff", plane: "#ff8a5c", event: "#b197fc", open: "#ffb347", bike: "#69db7c", beach: "#3bc9db", text: "#e8eef7", halo: "#0a1424" };
