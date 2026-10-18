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
          {(["/events", "/weekend", "/food", "/nightlife", "/news"] as const).map((to, i) => (
            <li key={to}>
              <Link to={to} className="hover:text-sea">
                {t((["nav.whatson", "nav.weekend", "nav.food", "nav.nightlife", "nav.news"] as const)[i])}
              </Link>
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
            ? "מידע: OpenStreetMap, Open-Meteo, אוטובוס פתוח (הסדנא לידע ציבורי), Hebcal, adsb.lol, RainViewer."
            : "Data: OpenStreetMap contributors, Open-Meteo, Open Bus (Public Knowledge Workshop), Hebcal, adsb.lol, RainViewer."}
        </p>
      </div>
    </footer>
  );
};
