import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NEIGHBOURHOODS } from "@/lib/live/geo";
import { LocateFixed, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { nearestAddress, resolveInput, searchAddresses, streetPoint, type Address } from "@/lib/live/build";

// One box for everything: type an address, pick a suggestion, paste a listing link or its text,
// or use your location. It ends on /check with the point in the URL, so results can be shared.

export const checkUrl = (lat: number, lon: number, label?: string, r?: number) =>
  `/check?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}${label ? `&a=${encodeURIComponent(label)}` : ""}${r ? `&r=${r}` : ""}`;

/** One tap per neighbourhood, for people who'd rather browse than type an address. */
export const NeighbourhoodChips = ({ className = "", active }: { className?: string; active?: string }) => {
  const { lang } = useI18n();
  return (
    <div className={`flex flex-wrap items-center gap-2 text-[14px] ${className}`}>
      <span className="text-white/80 font-semibold">{lang === "he" ? "או לפי שכונה:" : "Or by neighbourhood:"}</span>
      {NEIGHBOURHOODS.map((h) => {
        const name = lang === "he" ? h.he : h.en;
        return (
          <Link key={h.en} to={checkUrl(h.lat, h.lon, name, 500)} aria-current={active === name ? "true" : undefined}
            className={`rounded-md px-3 py-1.5 font-semibold ${active === name ? "bg-[#ffcb05] text-[#0b1a33]" : "bg-white/15 hover:bg-white/25"}`}>{name}</Link>
        );
      })}
    </div>
  );
};

export const AddressSearch = ({ big = false, autoFocus = false }: { big?: boolean; autoFocus?: boolean }) => {
  const { lang } = useI18n();
  const he = lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [list, setList] = useState<Address[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const looksPasted = /https?:\/\//i.test(text) || text.length > 60;

  useEffect(() => {
    window.clearTimeout(timer.current);
    setNote(null);
    if (looksPasted || text.trim().length < 2) { setList([]); return; }
    timer.current = window.setTimeout(() => {
      searchAddresses(text).then((r) => { setList(r); setOpen(true); setActive(-1); }).catch(() => setList([]));
    }, 220);
    return () => window.clearTimeout(timer.current);
  }, [text, looksPasted]);

  const go = (a: Address) => navigate(checkUrl(a.lat, a.lon, he ? a.label : a.labelEn ?? a.label));

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (active >= 0 && list[active]) return go(list[active]);
    if (!looksPasted && list[0]) return go(list[0]);
    setBusy(true);
    try {
      const r = await resolveInput(text);
      if (r.kind === "point") {
        const a = await nearestAddress(r.lat, r.lon).catch(() => null);
        return navigate(checkUrl(r.lat, r.lon, a ? (he ? a.label : a.labelEn ?? a.label) : undefined));
      }
      if (r.kind === "street") {
        const exact = r.number != null ? (await searchAddresses(`${r.street} ${r.number}`))[0] : undefined;
        const a = exact ?? (await streetPoint(r.street));
        if (a) return go(a);
      }
      if (r.kind === "link-only") {
        const site = r.site === "facebook" ? "Facebook" : r.site === "yad2" ? "Yad2" : r.site === "madlan" ? "Madlan" : L("That site", "האתר הזה");
        setNote(L(
          `${site} doesn't let other websites read its listings, so we can't see the address from the link alone. Copy the listing's text (or just the street and number, if it shows them) and paste it here.`,
          `${site} לא מאפשר לאתרים אחרים לקרוא את המודעות, ולכן אי אפשר לראות את הכתובת מהקישור בלבד. העתיקו את טקסט המודעה (או רק את הרחוב והמספר, אם מופיעים) והדביקו כאן.`,
        ));
        return;
      }
      setNote(L("We couldn't find a Tel Aviv address in that. Try a street and number, like \"Dizengoff 100\".", "לא מצאנו כתובת בתל אביב. נסו רחוב ומספר, למשל \"דיזנגוף 100\"."));
    } catch {
      setNote(L("The city's map service didn't answer. Please try again in a moment.", "שירות המפות של העירייה לא ענה. נסו שוב בעוד רגע."));
    } finally {
      setBusy(false);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (p) => {
      const a = await nearestAddress(p.coords.latitude, p.coords.longitude).catch(() => null);
      setBusy(false);
      navigate(checkUrl(p.coords.latitude, p.coords.longitude, a ? (he ? a.label : a.labelEn ?? a.label) : undefined));
    }, () => { setBusy(false); setNote(L("We couldn't get your location. Type an address instead.", "לא הצלחנו לקבל את המיקום. הקלידו כתובת.")); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const h = big ? "h-16 text-[18px]" : "h-14 text-[17px]";
  return (
    <div className="relative w-full">
      <form onSubmit={submit} role="search" className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <label htmlFor="addr" className="sr-only">{L("Address, or paste a listing link or text", "כתובת, או הדבקת קישור או טקסט של מודעה")}</label>
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#0b1a33]/50 pointer-events-none" aria-hidden />
          {looksPasted ? (
            <textarea
              id="addr" value={text} onChange={(e) => setText(e.target.value)} rows={3} autoFocus dir="auto"
              placeholder={L("Paste the listing here", "הדביקו כאן את המודעה")}
              className="w-full rounded-md bg-white text-[#0b1a33] ps-12 pe-4 py-4 text-[17px] outline-none focus-visible:ring-4 focus-visible:ring-[#ffcb05] resize-none"
            />
          ) : (
            <input
              id="addr" value={text} autoFocus={autoFocus} autoComplete="off" dir="auto" role="combobox" aria-expanded={open && list.length > 0} aria-controls="addr-list"
              onChange={(e) => setText(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, list.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, -1)); }
              }}
              placeholder={L("Type an address, or paste a Yad2 / Facebook listing", "הקלידו כתובת, או הדביקו מודעה מיד2 / פייסבוק")}
              className={`w-full rounded-md bg-white text-[#0b1a33] ps-12 pe-4 ${h} outline-none focus-visible:ring-4 focus-visible:ring-[#ffcb05]`}
            />
          )}
          {open && list.length > 0 && !looksPasted && (
            <ul id="addr-list" role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-md bg-white text-[#0b1a33] shadow-[0_8px_30px_rgba(11,26,51,0.25)]">
              {list.map((a, i) => (
                <li key={`${a.label}-${i}`} role="option" aria-selected={i === active}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(a)} className={`w-full text-start px-4 py-3 ${i === active ? "bg-[#d6e4ff]" : "hover:bg-[#f1f4fa]"}`}>
                    <span className="block font-semibold" dir="auto">{he ? a.label : a.labelEn ?? a.label}</span>
                    {!he && a.labelEn && <span className="block text-[13px] opacity-60" dir="rtl">{a.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={`${h} flex-1 sm:flex-none rounded-md bg-[#ffcb05] px-6 font-extrabold text-[#0b1a33] disabled:opacity-60`}>
            {busy ? "…" : L("Check", "בדיקה")}
          </button>
          <button type="button" onClick={locate} aria-label={L("Use my location", "המיקום שלי")} title={L("Use my location", "המיקום שלי")} className={`${h} w-14 sm:w-16 rounded-md bg-white/15 text-white flex items-center justify-center hover:bg-white/25`}>
            <LocateFixed className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </form>
      {note && <p className="mt-3 rounded-md bg-white/95 text-[#0b1a33] px-4 py-3 text-[15px]" role="status">{note}</p>}
    </div>
  );
};
