// A free account, kept light: signing up stores the person in `subscribers` (via the
// alerts-subscribe function) and remembers them in this browser, which unlocks the extras.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Member = { name: string; email: string; since: string };
const KEY = "dtla.member";
const EVT = "dtla:member";

export const getMember = (): Member | null => {
  try { const m = JSON.parse(localStorage.getItem(KEY) ?? "null"); return m?.email ? m : null; } catch { return null; }
};
export const setMember = (m: Member) => {
  try { localStorage.setItem(KEY, JSON.stringify(m)); localStorage.setItem("dtla.email", m.email); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVT));
};
export const useMember = () => {
  const [m, setM] = useState<Member | null>(() => getMember());
  useEffect(() => {
    const on = () => setM(getMember());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener(EVT, on); window.removeEventListener("storage", on); };
  }, []);
  return m;
};

/** Distinct addresses searched in this browser, for the gentle sign-up nudge. */
export const countSearch = (lat: number, lon: number) => {
  try {
    const k = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const list: string[] = JSON.parse(localStorage.getItem("dtla.searches") ?? "[]");
    if (!list.includes(k)) list.push(k);
    localStorage.setItem("dtla.searches", JSON.stringify(list.slice(-50)));
    return list.length;
  } catch { return 0; }
};
export const nudgeSnoozed = () => {
  try { return Date.now() - Number(localStorage.getItem("dtla.nudge") ?? 0) < 7 * 864e5; } catch { return true; }
};
export const snoozeNudge = () => { try { localStorage.setItem("dtla.nudge", String(Date.now())); } catch { /* blocked */ } };

export type Signup = {
  name: string; email: string; phone?: string; lang: "en" | "he"; frequency: "instant" | "weekly";
  newsletter: boolean; whatsapp: boolean; source: string;
  alert?: { label: string; lat: number; lon: number; radius: number; kinds?: string[] };
};
export type SignupResult = "done" | "full" | "dupe" | "error";

const CONSENT_VERSION = "2026-11-17";

/**
 * Save a sign-up. The alerts function merges addresses for an existing email; if it isn't
 * reachable we fall back to a plain insert, which works for a first sign-up.
 */
export const saveSignup = async (s: Signup): Promise<SignupResult> => {
  const email = s.email.trim().toLowerCase();
  const consent = { version: CONSENT_VERSION, at: new Date().toISOString(), alerts: !!s.alert, newsletter: s.newsletter, whatsapp: s.whatsapp && !!s.phone };
  const body = { ...s, email, consent };
  const fn = await supabase.functions.invoke("alerts-subscribe", { body }).catch(() => ({ data: null, error: true }));
  let r: SignupResult;
  if (!fn.error && fn.data?.ok) r = "done";
  else if (!fn.error && fn.data?.full) r = "full";
  else {
    const { error } = await supabase.from("subscribers").insert({
      email, source: s.source,
      preferences: {
        name: s.name.trim(), phone: s.phone?.trim() || undefined, lang: s.lang, frequency: s.frequency, consent,
        alerts: s.alert ? [{ ...s.alert, created: new Date().toISOString() }] : [],
      },
    } as never);
    r = !error ? "done" : error.code === "23505" ? "dupe" : "error";
  }
  if (r === "done" || r === "dupe") setMember({ name: s.name.trim(), email, since: new Date().toISOString() });
  return r;
};
