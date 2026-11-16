// English for the city's Hebrew text. A nightly job translates every description, work type and
// stage on the cards (scripts/translate-city.py) into public/data/tx/{0-f}.json, keyed by a hash
// of the normalised Hebrew. Here we load the shards a page needs and look texts up.
import { useEffect, useState } from "react";
import { fetchData } from "./sources";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const enc = new TextEncoder();
export const txHash = (s: string) => {
  let h = 0x811c9dc5;
  for (const b of enc.encode(norm(s))) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
};

const shards = new Map<string, Record<string, string>>();
const loading = new Map<string, Promise<void>>();
const load = (c: string) => {
  if (shards.has(c)) return Promise.resolve();
  if (!loading.has(c)) {
    loading.set(c, fetchData(`tx/${c}.json`).then((r) => r.json()).then((m) => { shards.set(c, m ?? {}); }).catch(() => { shards.set(c, {}); }));
  }
  return loading.get(c)!;
};

const HEB = /[֐-׿]/;
/** The English for a Hebrew text, if the nightly job has translated it. */
export const txLookup = (he?: string | null) => {
  if (!he || !HEB.test(he)) return he ?? undefined;
  const h = txHash(he);
  return shards.get(h[0])?.[h];
};

/** Load the translations for these texts; re-renders when they arrive. Returns a lookup. */
export const useTx = (texts: (string | null | undefined)[], enabled = true) => {
  const [, bump] = useState(0);
  const key = texts.filter(Boolean).join("\u0001");
  useEffect(() => {
    if (!enabled) return;
    const need = [...new Set(texts.filter((t): t is string => !!t && HEB.test(t)).map((t) => txHash(t)[0]))].filter((c) => !shards.has(c));
    if (!need.length) return;
    let live = true;
    Promise.all(need.map(load)).then(() => { if (live) bump((n) => n + 1); });
    return () => { live = false; };
  }, [key, enabled]);
  return txLookup;
};

/**
 * English text for the English site: our own wording first (it knows the city's terms), then the
 * nightly translation, and only if neither exists the Hebrew (the caller can offer a translate button).
 */
export const english = (he: string | undefined, ours?: (s?: string) => string | undefined) => {
  if (!he) return undefined;
  const mine = ours?.(he);
  if (mine && !HEB.test(mine)) return mine;
  return txLookup(he) ?? mine ?? he;
};
export const hasHebrew = (s?: string) => !!s && HEB.test(s);
