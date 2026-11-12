import { useQuery } from "@tanstack/react-query";
import { BellRing, ClipboardPaste, MapPinned } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { fetchCityBuildCounts } from "@/lib/live/build";
import { AddressSearch, NeighbourhoodChips } from "./AddressSearch";

// The home page's main job: "what's being built next to this address?"
export const BuildHero = () => {
  const { lang } = useI18n();
  const he = lang === "he";
  const L = (en: string, h: string) => (he ? h : en);
  const counts = useQuery({ queryKey: ["build-counts"], queryFn: fetchCityBuildCounts, staleTime: 60 * 60_000 });
  const c = counts.data;
  const n = (v: number | null | undefined) => (v == null ? "…" : v.toLocaleString(he ? "he-IL" : "en-GB"));
  return (
    <>
      <section className="bg-[#0057ff] text-white">
        <div className="container-page pt-12 pb-12 sm:pt-20 sm:pb-16">
          <p className="text-[15px] font-bold text-[#ffcb05]">{L("Renting, buying or just curious?", "שוכרים, קונים או סתם סקרנים?")}</p>
          <h1 className="mt-2 font-display leading-[0.88] text-[52px] sm:text-[96px] lg:text-[120px] max-w-[11ch]">{L("What's being built next to you?", "מה בונים לידך?")}</h1>
          <p className="mt-5 max-w-2xl text-[19px] sm:text-[22px] leading-snug text-white/95">
            {L("Type an address or paste an apartment listing. We'll show every building permit, construction site, night work and road closure around it, straight from the city's records.", "הקלידו כתובת או הדביקו מודעת דירה. נראה לכם כל היתר בניה, אתר בניה, עבודת לילה וחסימת כביש מסביב, ישר מהנתונים של העירייה.")}
          </p>
          <div className="mt-8 max-w-3xl"><AddressSearch big /></div>
          <NeighbourhoodChips className="mt-5 max-w-4xl" />
        </div>
      </section>

      <section className="bg-[#ffcb05] text-[#0b1a33]">
        <div className="container-page py-8 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
          {[
            [c?.review, L("permit requests under review right now", "בקשות להיתר בבדיקה כרגע")],
            [c?.sites, L("active building sites in the city", "אתרי בניה פעילים בעיר")],
            [c?.nights, L("sites approved for night work", "אתרים עם אישור לעבודת לילה")],
            [c?.roads, L("road works and closures", "עבודות כביש וחסימות")],
          ].map(([v, label]) => (
            <div key={String(label)}>
              <p className="font-poster text-[52px] sm:text-[64px]">{n(v as number | null | undefined)}</p>
              <p className="text-[15px] font-semibold leading-snug">{label as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pt-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: MapPinned, c: "#d6e4ff", t: L("Type it, pick it, or use your location", "הקלידו, בחרו או השתמשו במיקום"), b: L("Every one of Tel Aviv-Yafo's 52,000 building addresses, in Hebrew or English.", "כל 52,000 הכתובות של תל אביב-יפו, בעברית או באנגלית.") },
            { icon: ClipboardPaste, c: "#ffd9d4", t: L("Paste an apartment listing", "הדביקו מודעת דירה"), b: L("From Yad2, Facebook groups or anywhere. If the text names the street, we'll find the area, even when the post doesn't give the full address.", "מיד2, מקבוצות פייסבוק או מכל מקום. אם בטקסט מופיע הרחוב, נמצא את האזור גם בלי כתובת מלאה.") },
            { icon: BellRing, c: "#d3f9d8", t: L("Get alerts for your street", "קבלו התראות לרחוב שלכם"), b: L("Sign up free and we'll email you when a new permit, building site or night work appears near your address.", "הירשמו בחינם ונשלח מייל כשמופיע היתר, אתר בניה או עבודת לילה חדשים ליד הכתובת.") },
          ].map((x) => (
            <div key={x.t} className="rounded-[10px] p-5 text-[#0b1a33] border-t-[3px] border-dashed border-[#0b1a33]" style={{ background: x.c }}>
              <x.icon className="h-6 w-6" aria-hidden />
              <p className="mt-3 font-display text-[22px] leading-tight">{x.t}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed">{x.b}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};
