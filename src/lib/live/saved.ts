// Small per-browser lists: addresses this person watches, and apartments they're comparing.
// Browser storage can be missing or blocked, so every access is guarded.

export type Spot = { label: string; lat: number; lon: number; r?: number };

const read = (key: string): Spot[] => {
  try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
const write = (key: string, list: Spot[]) => {
  try { localStorage.setItem(key, JSON.stringify(list)); window.dispatchEvent(new Event(`saved:${key}`)); } catch { /* storage blocked */ }
};
const same = (a: Spot, b: Spot) => Math.abs(a.lat - b.lat) < 0.0003 && Math.abs(a.lon - b.lon) < 0.0003;

export const COMPARE = "dtla.compare";
export const WATCHED = "dtla.watched";
export const MAX_COMPARE = 3;

export const getList = read;
export const addTo = (key: string, s: Spot, max = 5) => {
  const list = [...read(key).filter((x) => !same(x, s)), s].slice(-max);
  write(key, list);
  return list;
};
export const removeFrom = (key: string, s: Spot) => write(key, read(key).filter((x) => !same(x, s)));
export const has = (key: string, s: Spot) => read(key).some((x) => same(x, s));
export const onChange = (key: string, fn: () => void) => {
  window.addEventListener(`saved:${key}`, fn);
  window.addEventListener("storage", fn);
  return () => { window.removeEventListener(`saved:${key}`, fn); window.removeEventListener("storage", fn); };
};

/** Share one item: the native share sheet on phones, otherwise copy the link. */
export const shareLink = async (url: string, title: string, onCopied?: () => void) => {
  if (navigator.share) { try { await navigator.share({ title, text: title, url }); return; } catch (e) { if ((e as Error)?.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(url); onCopied?.(); } catch { window.prompt("Copy this link", url); }
};
