// MapLibre GL is loaded from a CDN at runtime so the map stays out of the main bundle
// and no extra npm dependency is needed. Version is pinned.
const VERSION = "4.7.1";
const JS = `https://unpkg.com/maplibre-gl@${VERSION}/dist/maplibre-gl.js`;
const CSS = `https://unpkg.com/maplibre-gl@${VERSION}/dist/maplibre-gl.css`;
// The UMD build: MapLibre loads it inside its web workers with importScripts.
const RTL_PLUGIN = "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js";

// OpenFreeMap: free vector tiles, no key, no usage limits for public sites.
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MapLibre = any;

let loading: Promise<MapLibre> | null = null;

export const loadMapLibre = (): Promise<MapLibre> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.maplibregl) return Promise.resolve(w.maplibregl);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = JS;
    script.async = true;
    script.onload = () => {
      if (!w.maplibregl) return reject(new Error("MapLibre failed to initialise"));
      // Hebrew and Arabic street names need the RTL shaping plugin to render correctly.
      try {
        const p = w.maplibregl.setRTLTextPlugin(RTL_PLUGIN, true);
        if (p && typeof p.catch === "function") p.catch(() => undefined);
      } catch { /* already set */ }
      resolve(w.maplibregl);
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("MapLibre failed to load"));
    };
    document.head.appendChild(script);
  });
  return loading;
};
