// Glides map points from their last positions to new ones instead of jumping.
// Points that are new simply appear; points that vanished are dropped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapLike = any;
type Pt = { id: string; lon: number; lat: number; props: Record<string, unknown> };

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export const createTweener = (durationMs = 1600) => {
  let last = new Map<string, [number, number]>();
  let frame = 0;

  return (map: MapLike, sourceId: string, points: Pt[]) => {
    const source = map?.getSource(sourceId);
    if (!source) return;
    cancelAnimationFrame(frame);

    const toFeature = (p: Pt, lon: number, lat: number) => ({
      type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: { id: p.id, ...p.props },
    });
    const from = last;
    last = new Map(points.map((p) => [p.id, [p.lon, p.lat]]));

    // Jumps longer than ~3 km are new routes or bad fixes; don't animate those.
    const moving = points.filter((p) => {
      const f = from.get(p.id);
      return f && (f[0] !== p.lon || f[1] !== p.lat) && Math.abs(f[0] - p.lon) + Math.abs(f[1] - p.lat) < 0.03;
    });
    if (reduced() || moving.length === 0) {
      source.setData({ type: "FeatureCollection", features: points.map((p) => toFeature(p, p.lon, p.lat)) });
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const k = ease(t);
      source.setData({
        type: "FeatureCollection",
        features: points.map((p) => {
          const f = from.get(p.id);
          if (!f) return toFeature(p, p.lon, p.lat);
          return toFeature(p, f[0] + (p.lon - f[0]) * k, f[1] + (p.lat - f[1]) * k);
        }),
      });
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };
};
