import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./Logo";

export const SiteFooter = () => {
  const { lang, t } = useI18n();
  const he = lang === "he";
  return (
    <footer className="mt-16 border-t border-border">
      <div className="container-page py-10 grid gap-8 md:grid-cols-[1.4fr,1fr,1fr]">
        <div>
          <Logo />
          <p className="text-sm text-muted-foreground mt-3 max-w-sm">
            {he
              ? "מדריך חינמי ועצמאי לתל אביב-יפו, שנבנה על מידע פתוח."
              : "A free, independent guide to Tel Aviv-Yafo, built on open data."}
          </p>
        </div>
        <ul className="space-y-2 text-sm">
          {([["/events", "nav.whatson"], ["/weekend", "nav.weekend"], ["/magazine", "nav.magazine"], ["/food", "nav.food"], ["/beach", "nav.beach"], ["/hotels", "nav.hotels"], ["/walks", "nav.walks"], ["/cinema", "nav.cinema"], ["/jobs", "nav.jobs"], ["/shabbat", "nav.shabbat"], ["/getting-around", "nav.around"], ["/guide", "nav.guide"], ["/news", "nav.news"]] as const).map(([to, key]) => (
            <li key={to}>
              <Link to={to} className="hover:text-sea">{t(key)}</Link>
            </li>
          ))}
        </ul>
        <ul className="space-y-2 text-sm">
          <li><Link to="/submit" className="hover:text-sea">{t("nav.submit")}</Link></li>
          <li><Link to="/newsletter" className="hover:text-sea">{t("nav.newsletter")}</Link></li>
          <li><Link to="/auth" className="hover:text-sea">{he ? "כניסת עורכים" : "Editor login"}</Link></li>
        </ul>
      </div>
      <div className="border-t border-border">
        <p className="container-page py-4 text-xs text-muted-foreground pb-24 md:pb-4">
          {he
            ? "מידע: המידע הפתוח של עיריית תל אביב-יפו, OpenStreetMap, Open-Meteo, אוטובוס פתוח (הסדנא לידע ציבורי), Hebcal, adsb.lol, RainViewer, מדוזות בעם."
            : "Data: City of Tel Aviv-Yafo open data, OpenStreetMap contributors, Open-Meteo, Open Bus (Public Knowledge Workshop), Hebcal, adsb.lol, RainViewer, Meduzot BaAm."}
        </p>
      </div>
    </footer>
  );
};
