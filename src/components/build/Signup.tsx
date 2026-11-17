import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BellRing, Check, Lock, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { addTo, getList, onChange, WATCHED, type Spot } from "@/lib/live/saved";
import { getMember, saveSignup, setMember, snoozeNudge, useMember, type SignupResult } from "@/lib/live/member";

// Sign-up, in one form used everywhere: the "Watch this address" box, the popup after a few
// searches, and the locked extras (report, comparison). Searching itself is always free.

const KINDS = ["permit", "site", "night", "road", "rail", "business", "danger"];
const RADII = [100, 250, 500];

type FormProps = { spot?: Spot; source: string; onDone?: () => void; compact?: boolean; tone?: "yellow" | "white" };

export const SignupForm = ({ spot, source, onDone, compact = false }: FormProps) => {
  const { lang } = useI18n();
  const he = lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const member = useMember();
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? (() => { try { return localStorage.getItem("dtla.email") ?? ""; } catch { return ""; } })());
  const [phone, setPhone] = useState("");
  const [radius, setRadius] = useState(spot?.r && RADII.includes(spot.r) ? spot.r : 250);
  const [frequency, setFrequency] = useState<"instant" | "weekly">("instant");
  const [newsletter, setNewsletter] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | SignupResult>("idle");
  useEffect(() => { if (member) { setName((n) => n || member.name); setEmail((e) => e || member.email); } }, [member]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return;
    setState("busy");
    const r = await saveSignup({
      name, email, phone: phone.trim() || undefined, lang: he ? "he" : "en", frequency, newsletter, whatsapp, source,
      alert: spot ? { label: spot.label, lat: spot.lat, lon: spot.lon, radius, kinds: KINDS } : undefined,
    });
    if ((r === "done" || r === "dupe") && spot) addTo(WATCHED, { ...spot, r: radius });
    setState(r);
    if (r === "done" || r === "dupe") onDone?.();
  };

  if (state === "done" || state === "dupe") {
    return (
      <div className="rounded-md bg-white text-[#0b1a33] p-4" role="status">
        <p className="font-bold flex items-center gap-2"><Check className="h-5 w-5 text-[#2f9e44]" aria-hidden />{L(`You're in, ${name.trim().split(" ")[0]}.`, `נרשמת, ${name.trim().split(" ")[0]}.`)}</p>
        <p className="mt-1 text-[14px]">
          {spot
            ? state === "done"
              ? L(`We'll email you when something new comes up within ${radius} m of ${spot.label || "this address"}.`, `נשלח מייל כשמשהו חדש יופיע ברדיוס ${radius} מ' מ${spot.label || "הכתובת"}.`)
              : L("That email was already signed up. We've saved this address in your list; adding it to your email alerts will work very soon.", "המייל הזה כבר היה רשום. שמרנו את הכתובת ברשימה שלך; הוספתה להתראות במייל תעבוד בקרוב מאוד.")
            : L("Reports, comparisons and saved addresses are unlocked.", "הדוחות, ההשוואות והכתובות השמורות פתוחים עכשיו.")}
        </p>
      </div>
    );
  }

  const input = "h-12 w-full rounded-md bg-white px-4 text-[16px] text-[#0b1a33] outline-none focus-visible:ring-4 focus-visible:ring-[#0b1a33]/25";
  return (
    <form onSubmit={submit} className="space-y-2.5">
      {spot && (
        <div className="rounded-md bg-white/70 px-3 py-2 text-[14px]">
          <span className="text-[12px] font-extrabold uppercase tracking-wider opacity-70">{L("Address", "כתובת")}</span>
          <span className="block font-bold" dir="auto">{spot.label || `${spot.lat.toFixed(4)}, ${spot.lon.toFixed(4)}`}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] opacity-80">{L("Alert me about anything within", "התראה על כל דבר ברדיוס")}</span>
            {RADII.map((r) => (
              <button type="button" key={r} onClick={() => setRadius(r)} aria-pressed={r === radius} className={`h-7 rounded px-2 text-[13px] font-bold ${r === radius ? "bg-[#0b1a33] text-white" : "bg-white"}`}>{r} {L("m", "מ'")}</button>
            ))}
          </span>
        </div>
      )}
      <div className={compact ? "grid gap-2.5" : "grid gap-2.5 sm:grid-cols-2"}>
        <div><label htmlFor={`${source}-name`} className="sr-only">{L("Name", "שם")}</label>
          <input id={`${source}-name`} required value={name} onChange={(e) => setName(e.target.value)} placeholder={L("Your name", "השם שלך")} autoComplete="name" dir="auto" className={input} /></div>
        <div><label htmlFor={`${source}-email`} className="sr-only">{L("Email", "אימייל")}</label>
          <input id={`${source}-email`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" dir="ltr" className={input} /></div>
      </div>
      <div>
        <label htmlFor={`${source}-phone`} className="sr-only">{L("Mobile (optional)", "נייד (לא חובה)")}</label>
        <input id={`${source}-phone`} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={L("Mobile (optional), for WhatsApp alerts coming soon", "נייד (לא חובה), להתראות וואטסאפ בקרוב")} autoComplete="tel" dir="ltr" className={input} />
        {phone.trim() && (
          <label className="mt-1.5 flex items-start gap-2 text-[13px]"><input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} className="mt-0.5 h-4 w-4" />{L("OK to message me on WhatsApp when WhatsApp alerts launch.", "אפשר לשלוח לי הודעות בוואטסאפ כשהתראות הוואטסאפ יושקו.")}</label>
        )}
      </div>
      {spot && (
        <fieldset className="flex flex-wrap gap-2 text-[14px]">
          <legend className="sr-only">{L("How often", "כל כמה זמן")}</legend>
          {([["instant", L("Alert me as it happens", "מיד כשקורה")], ["weekly", L("Weekly digest (Sundays)", "סיכום שבועי (ימי ראשון)")]] as const).map(([k, t]) => (
            <label key={k} className={`h-9 inline-flex items-center rounded-md px-3 font-semibold cursor-pointer ${frequency === k ? "bg-[#0b1a33] text-white" : "bg-white/70"}`}>
              <input type="radio" name={`${source}-freq`} checked={frequency === k} onChange={() => setFrequency(k)} className="sr-only" />{t}
            </label>
          ))}
        </fieldset>
      )}
      <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-0.5 h-4 w-4" />{L("Also send me the weekly Tel Aviv roundup: events, city news and what's on near me.", "שלחו לי גם את הסיכום השבועי של תל אביב: אירועים, חדשות העיר ומה קורה לידי.")}</label>
      <button disabled={state === "busy"} className="h-12 w-full rounded-md bg-[#0b1a33] text-white px-6 text-[16px] font-extrabold disabled:opacity-60 inline-flex items-center justify-center gap-2">
        <BellRing className="h-5 w-5" aria-hidden />{state === "busy" ? "…" : spot ? L("Watch this address, free", "עקבו אחרי הכתובת, חינם") : L("Sign up free", "הרשמה חינם")}
      </button>
      {state === "full" && <p className="text-[14px] font-semibold" role="status">{L("You're already watching 5 addresses, the most one email can follow.", "אתם כבר עוקבים אחרי 5 כתובות, המקסימום למייל אחד.")}</p>}
      {state === "error" && <p className="text-[14px] font-semibold" role="status">{L("Something went wrong. Please try again.", "משהו השתבש. נסו שוב.")}</p>}
      <p className="text-[12px] opacity-80">
        {spot ? L("By signing up you agree to get email alerts for this address. ", "בהרשמה אתם מסכימים לקבל התראות במייל על הכתובת. ") : ""}
        {L("Free. No spam. Unsubscribe any time. ", "חינם. בלי ספאם. אפשר להסיר בכל עת. ")}<Link to="/privacy" className="underline">{L("Privacy", "פרטיות")}</Link>
      </p>
    </form>
  );
};

/** The yellow "Watch this address" box beside the map, with the list of addresses you watch. */
export const WatchBox = ({ spot }: { spot: Spot }) => {
  const { lang } = useI18n();
  const L = (en: string, h: string) => (lang === "he" ? h : en);
  const [watched, setWatched] = useState<Spot[]>(() => getList(WATCHED));
  useEffect(() => onChange(WATCHED, () => setWatched(getList(WATCHED))), []);
  const already = watched.some((w) => Math.abs(w.lat - spot.lat) < 0.0003 && Math.abs(w.lon - spot.lon) < 0.0003);
  return (
    <section id="watch" className="scroll-mt-24 rounded-[10px] bg-[#ffcb05] text-[#0b1a33] p-5 sm:p-6">
      <p className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider"><BellRing className="h-4 w-4" aria-hidden />{L("Free alerts", "התראות חינם")}</p>
      <h2 className="mt-1 font-display text-[28px] sm:text-[32px] leading-tight">{already ? L("You're watching this address", "אתם עוקבים אחרי הכתובת") : L("Watch this address", "עקבו אחרי הכתובת")}</h2>
      {!already && <p className="mt-1 mb-3 text-[15px]">{L("Be the first to know about new permit requests, building sites, night works, road closures, light rail works and new bars nearby.", "דעו ראשונים על בקשות היתר חדשות, אתרי בניה, עבודות לילה, חסימות כבישים, עבודות הרכבת הקלה וברים חדשים בסביבה.")}</p>}
      {already ? <p className="mt-2 text-[15px]">{L("We'll email you when something new comes up.", "נשלח מייל כשמשהו חדש יופיע.")}</p> : <SignupForm spot={spot} source="watch" compact />}
      {watched.length > 0 && (
        <div className="mt-4">
          <p className="text-[13px] font-extrabold uppercase tracking-wider">{L("Your addresses", "הכתובות שלך")}</p>
          <ul className="mt-1 space-y-1 text-[14px]">
            {watched.map((w) => (
              <li key={`${w.lat},${w.lon}`}><Link to={`/check?lat=${w.lat.toFixed(6)}&lon=${w.lon.toFixed(6)}&a=${encodeURIComponent(w.label)}${w.r ? `&r=${w.r}` : ""}`} className="font-semibold underline underline-offset-2" dir="auto">{w.label || `${w.lat.toFixed(4)}, ${w.lon.toFixed(4)}`}</Link></li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

/** A closable dialog with the sign-up form. */
export const SignupModal = ({ open, onClose, spot, title, body, source }: { open: boolean; onClose: () => void; spot?: Spot; title: string; body: string; source: string }) => {
  const { lang } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    window.setTimeout(() => box.current?.querySelector<HTMLInputElement>("input")?.focus(), 50);
    return () => { document.removeEventListener("keydown", esc); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={`${source}-title`} onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[520px] max-h-[92vh] overflow-y-auto rounded-t-[14px] sm:rounded-[14px] bg-[#ffcb05] text-[#0b1a33] p-5 sm:p-7 shadow-2xl">
        <button onClick={onClose} aria-label={lang === "he" ? "סגירה" : "Close"} className="absolute top-3 end-3 h-9 w-9 rounded-md hover:bg-black/10 inline-flex items-center justify-center"><X className="h-5 w-5" aria-hidden /></button>
        <h2 id={`${source}-title`} className="font-display text-[28px] sm:text-[32px] leading-tight pe-8">{title}</h2>
        <p className="mt-1 mb-4 text-[15px]">{body}</p>
        <SignupForm spot={spot} source={source} onDone={() => window.setTimeout(onClose, 2500)} compact />
      </div>
    </div>
  );
};

/** The gentle nudge after a few searches: shown once a week at most, never to members. */
export const SearchNudge = ({ count, spot }: { count: number; spot: Spot }) => {
  const { lang } = useI18n();
  const L = (en: string, h: string) => (lang === "he" ? h : en);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (count < 2 || getMember()) return;
    let snoozed = true;
    try { snoozed = Date.now() - Number(localStorage.getItem("dtla.nudge") ?? 0) < 7 * 864e5; } catch { /* blocked */ }
    if (snoozed) return;
    const t = window.setTimeout(() => setOpen(true), 6000);
    return () => window.clearTimeout(t);
  }, [count]);
  const close = () => { snoozeNudge(); setOpen(false); };
  return (
    <SignupModal open={open} onClose={close} spot={spot} source="nudge"
      title={L("Checking a few addresses?", "בודקים כמה כתובות?")}
      body={L("Save them and get free alerts when something new is filed or starts nearby. Your free account also unlocks address reports and side-by-side comparisons.", "שמרו אותן וקבלו התראות חינם כשמשהו חדש מוגש או מתחיל בסביבה. החשבון החינמי פותח גם דוחות כתובת והשוואות.")} />
  );
};

/** Free-account extras: shows the children to members, a locked preview and the form to others. */
export const MemberGate = ({ children, preview, title, body, source }: { children: ReactNode; preview?: ReactNode | true; title: string; body: string; source: string }) => {
  const member = useMember();
  const { lang } = useI18n();
  const L = (en: string, h: string) => (lang === "he" ? h : en);
  const [sign, setSign] = useState(false);
  const [email, setEmail] = useState("");
  if (member) return <>{children}</>;
  return (
    <div className="relative">
      {preview && <div aria-hidden className="pointer-events-none select-none blur-[5px] opacity-60 max-h-[320px] overflow-hidden print:hidden">{preview === true ? children : preview}</div>}
      <div className={`${preview ? "relative -mt-40" : ""} mx-auto max-w-[520px] rounded-[14px] bg-[#ffcb05] text-[#0b1a33] p-5 sm:p-7 shadow-xl`}>
        <p className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider"><Lock className="h-4 w-4" aria-hidden />{L("Free account", "חשבון חינם")}</p>
        <h2 className="mt-1 font-display text-[26px] sm:text-[30px] leading-tight">{title}</h2>
        <p className="mt-1 mb-4 text-[15px]">{body}</p>
        {sign ? (
          <form onSubmit={(e) => { e.preventDefault(); if (/^\S+@\S+\.\S+$/.test(email.trim())) setMember({ name: "", email: email.trim().toLowerCase(), since: new Date().toISOString() }); }} className="flex flex-col sm:flex-row gap-2">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" dir="ltr" className="h-12 flex-1 rounded-md bg-white px-4 text-[16px] outline-none" />
            <button className="h-12 rounded-md bg-[#0b1a33] text-white px-5 font-extrabold">{L("Continue", "המשך")}</button>
          </form>
        ) : <SignupForm source={source} compact />}
        <button onClick={() => setSign(!sign)} className="mt-3 text-[14px] font-semibold underline underline-offset-2">{sign ? L("New here? Sign up free", "חדשים כאן? הרשמה חינם") : L("Already signed up? Enter your email", "כבר נרשמתם? הזינו את המייל")}</button>
      </div>
    </div>
  );
};
