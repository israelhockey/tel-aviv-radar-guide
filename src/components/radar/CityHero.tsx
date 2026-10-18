import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAircraft, useBuses, useEventsFeed, useHebrewDate } from "@/lib/live/hooks";
import { loadMapLibre, type MapLibre } from "@/lib/live/maplibre";
import { liveColors, mapStyleFor } from "@/lib/live/mapStyle";
import { createTweener } from "@/lib/live/tween";
import { planeIcon } from "@/lib/live/mapIcons";
import { fmtToday } from "@/lib/live/format";
import { inRange } from "@/lib/live/when";

// The city's centre of gravity for the hero shot: Dizengoff to Rothschild, looking north-east
// along the coast with the towers of the Azrieli/Sarona skyline in view.
const VIEW = { center: [34.7745, 32.0775] as [number, number], zoom: 13.9, pitch: 60, bearing: -28 };

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const CityHero = () => {
  const { t, lang } = useI18n();
  const { phase } = useTheme();
  const hebrewDate = useHebrewDate();
  const buses = useBuses();
  const aircraft = useAircraft();
  const events = useEventsFeed();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [ready, setReady] = useState(false);
  const tweenBuses = useRef(createTweener(2200));
  const tweenPlanes = useRef(createTweener(1200));

  const tonight = useMemo(
    () => (events.data?.events ?? []).filter((e) => e.lat != null && inRange(e.start, e.end, "tonight")),
    [events.data],
  );

  // Build the map; rebuild when day turns to night.
  useEffect(() => {
    let cancelled = false;
    let orbit = 0;
    const C = liveColors(phase);
    setReady(false);
    Promise.all([loadMapLibre(), mapStyleFor(phase)]).then(([maplibregl, style]) => {
      if (cancelled || !ref.current) return;
      mapRef.current?.remove();
      const map = new maplibregl.Map({
        container: ref.current, style, ...VIEW, interactive: false, attributionControl: { compact: true }, fadeDuration: 0,
      });
      mapRef.current = map;
      // Some base-style patterns aren't in the sprite; give MapLibre a blank so it stops waiting.
        map.on("styleimagemissing", (e: { id: string }) => {
          if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
        });
        map.once("style.load", () => {
        if (cancelled) return;
        map.addImage("radar-plane", planeIcon(C.plane), { pixelRatio: 2 });
        for (const id of ["buses", "flights", "events"]) map.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "buses-glow", type: "circle", source: "buses", paint: { "circle-radius": 11, "circle-color": C.busGlow, "circle-opacity": phase === "day" ? 0.2 : 0.35, "circle-blur": 1 } });
        map.addLayer({ id: "buses-dot", type: "circle", source: "buses", paint: { "circle-radius": 3.2, "circle-color": C.bus } });
        map.addLayer({ id: "events-glow", type: "circle", source: "events", paint: { "circle-radius": 22, "circle-color": C.event, "circle-opacity": 0.25, "circle-blur": 1 } });
        map.addLayer({ id: "events-dot", type: "circle", source: "events", paint: { "circle-radius": 5, "circle-color": C.event, "circle-stroke-color": C.halo, "circle-stroke-width": 1.5 } });
        map.addLayer({
          id: "flights", type: "symbol", source: "flights",
          layout: { "icon-image": "radar-plane", "icon-size": 1.1, "icon-rotate": ["get", "track"], "icon-rotation-alignment": "map", "icon-allow-overlap": true },
        });
        setReady(true);

        // A slow orbit around the city: one full turn every four minutes. Paused when hidden.
        if (!reducedMotion()) {
          let lastT = performance.now();
          const spin = (now: number) => {
            const dt = now - lastT;
            lastT = now;
            if (!document.hidden) map.setBearing(map.getBearing() + dt * (360 / 240000));
            orbit = requestAnimationFrame(spin);
          };
          orbit = requestAnimationFrame(spin);
        }
      });
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      cancelAnimationFrame(orbit);
    };
  }, [phase]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  useEffect(() => {
    if (!ready || !buses.data) return;
    tweenBuses.current(mapRef.current, "buses", buses.data.buses.map((b) => ({ id: b.id, lon: b.lon, lat: b.lat, props: {} })));
  }, [ready, buses.data]);

  useEffect(() => {
    if (!ready || !aircraft.data) return;
    tweenPlanes.current(mapRef.current, "flights", aircraft.data.map((a) => ({ id: a.id, lon: a.lon, lat: a.lat, props: { track: a.track } })));
  }, [ready, aircraft.data]);

  useEffect(() => {
    if (!ready) return;
    mapRef.current?.getSource("events")?.setData({
      type: "FeatureCollection",
      features: tonight.map((e) => ({ type: "Feature", geometry: { type: "Point", coordinates: [e.lon, e.lat] }, properties: {} })),
    });
  }, [ready, tonight]);

  const stats = [
    { n: buses.data?.buses.length, label: t("now.busesMoving"), color: "bg-sea" },
    { n: aircraft.data?.length, label: t("now.planes"), color: "bg-accent" },
    { n: tonight.length, label: t("hero.eventsTonight"), color: "bg-cat-music" },
  ];

  return (
    <section className="relative isolate overflow-hidden" style={{ background: "var(--hero-sky)" }} aria-labelledby="hero-h">
      {/* MapLibre sets its container to position:relative, so size it inside a wrapper. */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        <div ref={ref} className="h-full w-full" />
      </div>
      {/* Fade the map into the page so the text below always reads. */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 -z-10 bg-gradient-to-t from-background via-background/85 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-24 -z-10 bg-gradient-to-b from-background/70 to-transparent pointer-events-none" />

      <div className="container-page flex flex-col justify-end min-h-[540px] h-[72svh] max-h-[760px] pb-6 sm:pb-10">
        <p className="inline-flex items-center gap-2 text-[13px] text-foreground/80">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          {fmtToday(lang)}
          {hebrewDate.data && <><span className="text-foreground/40" aria-hidden>·</span><span lang="he" dir="rtl" className="text-foreground/60">{hebrewDate.data}</span></>}
        </p>
        <h1 id="hero-h" className="mt-2 font-display text-[44px] leading-[0.95] sm:text-[72px] lg:text-[88px] text-foreground">
          {t("hero.title")}
        </h1>
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <span className={`h-2 w-2 rounded-full ${s.color} self-center`} aria-hidden />
              <dd className="text-[26px] sm:text-[30px] font-medium tabular leading-none">{s.n ?? "…"}</dd>
              <dt className="text-[13px] text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-6">
          <Link
            to="/live"
            className="inline-flex h-11 items-center rounded-full bg-foreground px-6 text-[15px] font-medium text-background shadow-[var(--shadow-pop)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2"
          >
            {t("now.openLive")}
          </Link>
        </div>
      </div>
    </section>
  );
};
