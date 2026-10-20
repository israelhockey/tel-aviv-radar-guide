import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";

// About us, how the site makes money, and privacy: in plain words.
const EN = {
  title: "About Discover Tel Aviv",
  about: [
    "Discover Tel Aviv is a free, independent guide to Tel Aviv-Yafo: what's on, where to eat and drink, the beach, getting around, and the city as it is right now.",
    "Our live data comes from open sources: the City of Tel Aviv-Yafo's public map service (events, parking, beaches, shuttles), OpenStreetMap contributors (places and opening hours), Open-Meteo (weather and sea), Hebcal (Shabbat and holidays), public ticketing listings and news outlets' public feeds. Photos are from Wikimedia Commons and credited where they appear.",
    "Our guides are written by us. Nobody pays to be included in a guide, and we never accept payment for a recommendation.",
  ],
  affTitle: "How we make money",
  aff: [
    "Some links on this site are affiliate links: for example to hotel booking sites, tours and travel services. If you book through one, the partner may pay us a small commission. It costs you nothing extra, and it's how we keep the site free.",
    "Affiliate links are marked for search engines as sponsored, and pages that carry them say so. They never decide what we recommend: the places in our guides are chosen first, and links are added afterwards where they help.",
    "If we ever show a paid placement (a sponsored listing or a featured job), it will be clearly labelled as such.",
  ],
  privTitle: "Privacy",
  priv: [
    "We don't use advertising or tracking cookies, and we don't sell or share personal data.",
    "Your preferences (language, light or dark theme, cached map data) are kept in your own browser's storage and never sent to us.",
    "If you sign up for the newsletter or submit something to us, we keep what you sent (such as your email address) only to provide that service. You can ask us to delete it at any time.",
    "The site loads map tiles, photos and some live data directly from third parties (OpenFreeMap, Wikimedia, the City of Tel Aviv-Yafo, Open-Meteo). Those services see your IP address, as with any website. When you follow a link to another site, including a partner, that site's own privacy policy applies.",
    "Location: if you tap \"near me\", your browser asks first, and your location is used only on your device to sort results. It is never sent to us.",
  ],
  contactTitle: "Contact",
  contact: "Spotted a mistake, want your business or event listed, or want to work with us?",
  contactCta: "Send it to us",
};

const HE: typeof EN = {
  title: "על Discover Tel Aviv",
  about: [
    "Discover Tel Aviv הוא מדריך חינמי ועצמאי לתל אביב-יפו: מה קורה, איפה לאכול ולשתות, הים, התחבורה, והעיר כמו שהיא עכשיו.",
    "הנתונים החיים מגיעים ממקורות פתוחים: שירות המפות הציבורי של עיריית תל אביב-יפו (אירועים, חניה, חופים, שאטלים), תורמי OpenStreetMap (מקומות ושעות), Open-Meteo (מזג אוויר וים), Hebcal (שבת וחגים), רשימות כרטוס ציבוריות ופידים ציבוריים של אתרי חדשות. התמונות מוויקישיתוף, עם קרדיט במקום.",
    "את המדריכים אנחנו כותבים. אף אחד לא משלם כדי להיכלל במדריך, ואנחנו לא מקבלים תשלום על המלצה.",
  ],
  affTitle: "איך אנחנו מרוויחים",
  aff: [
    "חלק מהקישורים באתר הם קישורי שותפים: למשל לאתרי הזמנת מלונות, סיורים ושירותי נסיעות. אם מזמינים דרכם, השותף עשוי לשלם לנו עמלה קטנה. זה לא עולה לכם דבר, וכך האתר נשאר חינמי.",
    "קישורי שותפים מסומנים למנועי חיפוש כממומנים, ודפים שבהם הם מופיעים אומרים זאת. הם לא קובעים מה אנחנו ממליצים: המקומות נבחרים קודם, והקישורים נוספים אחר כך כשהם עוזרים.",
    "אם נציג אי פעם מיקום בתשלום (רישום ממומן או משרה מקודמת), הוא יסומן בבירור.",
  ],
  privTitle: "פרטיות",
  priv: [
    "אנחנו לא משתמשים בעוגיות פרסום או מעקב, ולא מוכרים או משתפים מידע אישי.",
    "ההעדפות שלכם (שפה, מצב כהה או בהיר, נתוני מפה שמורים) נשמרות בדפדפן שלכם בלבד ולא נשלחות אלינו.",
    "אם נרשמתם לניוזלטר או שלחתם לנו משהו, נשמור את מה ששלחתם (כמו כתובת המייל) רק כדי לתת את השירות. אפשר לבקש מחיקה בכל עת.",
    "האתר טוען אריחי מפה, תמונות וחלק מהנתונים החיים ישירות מצדדים שלישיים (OpenFreeMap, ויקימדיה, עיריית תל אביב-יפו, Open-Meteo). שירותים אלה רואים את כתובת ה-IP שלכם, כמו בכל אתר. כשעוברים לאתר אחר, כולל שותף, חלה מדיניות הפרטיות שלו.",
    "מיקום: אם לוחצים \"לידי\", הדפדפן שואל קודם, והמיקום משמש רק במכשיר שלכם למיון התוצאות. הוא לא נשלח אלינו.",
  ],
  contactTitle: "צרו קשר",
  contact: "מצאתם טעות, רוצים שהעסק או האירוע שלכם יופיעו, או רוצים לעבוד איתנו?",
  contactCta: "שלחו לנו",
};

const About = () => {
  const { lang } = useI18n();
  const c = lang === "he" ? HE : EN;
  useEffect(() => {
    document.title = `${c.title} · Discover Tel Aviv`;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [c.title]);
  return (
    <SiteLayout>
      <section className="bg-[#ffcb05] text-[#0b1a33]">
        <div className="container-page py-10 sm:py-14"><h1 className="font-display text-[40px] sm:text-[64px] leading-[0.95]">{c.title}</h1></div>
      </section>
      <div className="container-page max-w-3xl text-[17px] leading-relaxed">
        <div className="mt-8 space-y-4">{c.about.map((p, i) => <p key={i}>{p}</p>)}</div>
        <h2 id="affiliates" className="mt-12 font-display text-[30px] scroll-mt-24">{c.affTitle}</h2>
        <div className="mt-3 space-y-4">{c.aff.map((p, i) => <p key={i}>{p}</p>)}</div>
        <h2 id="privacy" className="mt-12 font-display text-[30px] scroll-mt-24">{c.privTitle}</h2>
        <div className="mt-3 space-y-4">{c.priv.map((p, i) => <p key={i}>{p}</p>)}</div>
        <h2 id="contact" className="mt-12 font-display text-[30px] scroll-mt-24">{c.contactTitle}</h2>
        <p className="mt-3">{c.contact} <Link to="/submit" className="text-sea underline underline-offset-4">{c.contactCta}</Link></p>
      </div>
    </SiteLayout>
  );
};

export default About;
