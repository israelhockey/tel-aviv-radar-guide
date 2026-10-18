import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useWeather } from "@/lib/live/hooks";

// The site follows the real Tel Aviv sky: day, golden-hour dusk, and night.
export type Phase = "day" | "dusk" | "night";
export type ThemeChoice = "auto" | "day" | "night";

type Ctx = { phase: Phase; choice: ThemeChoice; setChoice: (c: ThemeChoice) => void };
const ThemeContext = createContext<Ctx>({ phase: "day", choice: "auto", setChoice: () => undefined });

const israelMinutes = (d = new Date()) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  return Number(p.find((x) => x.type === "hour")?.value) * 60 + Number(p.find((x) => x.type === "minute")?.value);
};
// Open-Meteo gives local times like "2026-10-18T18:05".
const clockMinutes = (s: string) => Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16));

export const phaseAt = (sunrise: string | undefined, sunset: string | undefined, now = new Date()): Phase => {
  const m = israelMinutes(now);
  // Without data, use typical Tel Aviv times so the first paint is still right most days.
  const rise = sunrise ? clockMinutes(sunrise) : 6 * 60 + 30;
  const set = sunset ? clockMinutes(sunset) : 18 * 60;
  if (m >= set - 60 && m < set + 25) return "dusk"; // golden hour into blue hour
  if (m >= rise - 25 && m < rise + 30) return "dusk"; // dawn reads the same way
  if (m >= rise + 30 && m < set - 60) return "day";
  return "night";
};

const readChoice = (): ThemeChoice => {
  try {
    const v = localStorage.getItem("radar.theme");
    if (v === "day" || v === "night" || v === "auto") return v;
  } catch { /* storage unavailable */ }
  return "auto";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const weather = useWeather();
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const auto = useMemo(
    () => phaseAt(weather.data?.sunrise, weather.data?.sunset),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weather.data?.sunrise, weather.data?.sunset, tick],
  );
  const phase: Phase = choice === "auto" ? auto : choice;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.phase = phase;
    root.classList.toggle("dark", phase === "night");
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", phase === "night" ? "#0a1424" : phase === "dusk" ? "#1d1a3a" : "#ffffff");
  }, [phase]);

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c);
    try { localStorage.setItem("radar.theme", c); } catch { /* ignore */ }
  }, []);

  return <ThemeContext.Provider value={{ phase, choice, setChoice }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
