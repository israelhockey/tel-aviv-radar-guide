import { Link } from "react-router-dom";
import { useI18n, type StringKey } from "@/lib/i18n";
import { articlesFor } from "@/lib/articles";
import { Logo } from "./Logo";

const COLS: { title: { en: string; he: string }; links: [string, StringKey][] }[] = [
  { title: { en: "Go out", he: "לצאת" }, links: [["/events", "nav.whatson"], ["/weekend", "nav.weekend"], ["/free", "nav.free"], ["/cinema", "nav.cinema"], ["/nightlife", "nav.nightlife"]] },
  { title: { en: "Eat & explore", he: "לאכול ולגלות" }, links: [["/food", "nav.food"], ["/area", "nav.areas"], ["/beach", "nav.beach"], ["/walks", "nav.walks"], ["/magazine", "nav.magazine"]] },
  { title: { en: "Visit & live", he: "לבקר ולגור" }, links: [["/hotels", "nav.hotels"], ["/getting-around", "nav.around"], ["/live", "nav.live"], ["/shabbat", "nav.shabbat"], ["/guide", "nav.guide"], ["/jobs", "nav.jobs"], ["/news", "nav.news"]] },
];

export const SiteFooter = () => {
  const { lang, t } = useI18n();
  const he = lang === "he";
  const reads = articlesFor(lang).filter((a) => a.featured).slice(0, 6);
  return (
    <footer className="site-footer mt-20 bg-[#0b1a33] text-white">
      <div className="container-page py-12">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/15 pb-10">
          <div className="max-w-xl">
            <p className="font-display text-[34px] sm:text-[44px] leading-[1]">{he ? "כל יום חמישי: הסופ״ש בתל אביב." : "Every Thursday: your Tel Aviv weekend."}</p>
            <p className="mt-2 text-[15px] text-white/75">{he ? "האירועים הכי טובים, מקומות חדשים ומה שאסור לפספס. חינם." : "The best events, new places and what not to miss. Free."}</p>
          </div>
          <Link to="/newsletter" className="inline-flex h-12 items-center rounded-md bg-[#ffcb05] px-6 text-[16px] font-bold text-[#0b1a33]">{t("wk.signup")}</Link>
        </div>
        <div className="mt-10 grid gap-10 grid-cols-2 md:grid-cols-[1.3fr,1fr,1fr,1fr]">
          <div className="col-span-2 md:col-span-1">
            <span className="[&_*]:!text-white"><Logo /></span>
            <p className="mt-3 text-[14px] text-white/70 max-w-xs">{he ? "מדריך חינמי ועצמאי לתל אביב-יפו, שנבנה על מידע פתוח." : "A free, independent guide to Tel Aviv-Yafo, built on open data."}</p>
            <ul className="mt-5 space-y-1.5 text-[14px]">
              {reads.map((a) => <li key={a.slug}><Link to={`/magazine/${a.slug}`} className="text-white/85 hover:text-[#ffcb05]">{a.title}</Link></li>)}
            </ul>
          </div>
          {COLS.map((c) => (
            <div key={c.title.en}>
              <p className="text-[13px] font-bold uppercase tracking-wider text-[#ffcb05]">{he ? c.title.he : c.title.en}</p>
              <ul className="mt-3 space-y-2 text-[15px]">
                {c.links.map(([to, key]) => <li key={to}><Link to={to} className="text-white/85 hover:text-white hover:underline underline-offset-4">{t(key)}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-white/70">
          <Link to="/submit" className="hover:text-white">{t("nav.submit")}</Link>
          <Link to="/about" className="hover:text-white">{t("nav.about")}</Link>
          <Link to="/about#affiliates" className="hover:text-white">{t("aff.how")}</Link>
          <Link to="/about#privacy" className="hover:text-white">{he ? "פרטיות" : "Privacy"}</Link>
          <Link to="/auth" className="hover:text-white">{he ? "כניסת עורכים" : "Editor login"}</Link>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="container-page py-4 text-[12px] text-white/55 pb-24 lg:pb-4">
          {he
            ? "מידע: המידע הפתוח של עיריית תל אביב-יפו, OpenStreetMap, Open-Meteo, אוטובוס פתוח (הסדנא לידע ציבורי), Hebcal, adsb.lol, RainViewer, מדוזות בעם."
            : "Data: City of Tel Aviv-Yafo open data, OpenStreetMap contributors, Open-Meteo, Open Bus (Public Knowledge Workshop), Hebcal, adsb.lol, RainViewer, Meduzot BaAm."}
        </p>
      </div>
    </footer>
  );
};
