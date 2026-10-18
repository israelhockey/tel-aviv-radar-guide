import { useQuery } from "@tanstack/react-query";
import {
  fetchAir, fetchAircraft, fetchBeaches, fetchBuses, fetchHebrewDate, fetchPlaces, fetchRainTiles, fetchShabbat, fetchWeather,
} from "./sources";

const MIN = 60_000;

export const useWeather = () => useQuery({ queryKey: ["weather"], queryFn: fetchWeather, refetchInterval: 10 * MIN, staleTime: 5 * MIN });
export const useAir = () => useQuery({ queryKey: ["air"], queryFn: fetchAir, refetchInterval: 30 * MIN, staleTime: 15 * MIN });
export const useBeaches = () => useQuery({ queryKey: ["beaches"], queryFn: fetchBeaches, refetchInterval: 30 * MIN, staleTime: 15 * MIN });
export const useShabbat = (lang: "en" | "he") =>
  useQuery({ queryKey: ["shabbat", lang], queryFn: () => fetchShabbat(lang), staleTime: 6 * 60 * MIN });
export const useHebrewDate = () => useQuery({ queryKey: ["hebdate", new Date().toDateString()], queryFn: fetchHebrewDate, staleTime: 6 * 60 * MIN });

export const useBuses = (enabled = true) =>
  useQuery({ queryKey: ["buses"], queryFn: fetchBuses, enabled, refetchInterval: 30_000, staleTime: 20_000, retry: 1 });
export const useAircraft = (enabled = true) =>
  useQuery({ queryKey: ["aircraft"], queryFn: fetchAircraft, enabled, refetchInterval: 15_000, staleTime: 10_000, retry: 1 });
export const usePlaces = (enabled = true) =>
  useQuery({ queryKey: ["places"], queryFn: fetchPlaces, enabled, staleTime: 6 * 60 * MIN, retry: 1 });
export const useRain = (enabled = true) =>
  useQuery({ queryKey: ["rain"], queryFn: fetchRainTiles, enabled, refetchInterval: 10 * MIN, staleTime: 5 * MIN, retry: 1 });
