import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { useCityData } from "@/lib/live/hooks";

type T = { en: string; he: string };

const HOODS: { name: T; color: string; body: T }[] = [
  { name: { en: "Old North", he: "הצפון הישן" }, color: "#1971c2", body: { en: "Leafy Bauhaus streets around Dizengoff, Ben Yehuda and Basel. Cafés, boutiques, the beach a few blocks away.", he: "רחובות באוהאוס ירוקים סביב דיזנגוף, בן יהודה ובזל. בתי קפה, בוטיקים, והים במרחק כמה רחובות." } },
  { name: { en: "Lev HaIr & the White City", he: "לב העיר והעיר הלבנה" }, color: "#7048e8", body: { en: "Rothschild Boulevard, Sheinkin and the UNESCO-listed White City. Busy days, busier nights.", he: "שדרות רוטשילד, שינקין והעיר הלבנה שהוכרזה על ידי אונסק״ו. ימים עמוסים, לילות עמוסים עוד יותר." } },
  { name: { en: "Neve Tzedek", he: "נווה צדק" }, color: "#c2255c", body: { en: "The city's oldest Jewish neighbourhood: low houses, galleries, Suzanne Dellal and quiet lanes near the sea.", he: "השכונה היהודית הוותיקה בעיר: בתים נמוכים, גלריות, סוזן דלל וסמטאות שקטות ליד הים." } },
  { name: { en: "Florentin", he: "פלורנטין" }, color: "#e8590c", body: { en: "Street art, workshops and the bars that keep south Tel Aviv up late. Levinsky Market is on its edge.", he: "גרפיטי, סדנאות והברים שמשאירים את דרום העיר ער עד מאוחר. שוק לוינסקי בקצה." } },
  { name: { en: "Kerem HaTeimanim & Carmel Market", he: "כרם התימנים ושוק הכרמל" }, color: "#f08c00", body: { en: "Narrow streets of Yemenite food spots next to the city's biggest market. Go hungry.", he: "סמטאות של מסעדות תימניות ליד השוק הגדול בעיר. לבוא רעבים." } },
  { name: { en: "Jaffa", he: "יפו" }, color: "#2f9e44", body: { en: "The ancient port city: the flea market, the old port, the clock tower and sunsets over the sea.", he: "עיר הנמל העתיקה: שוק הפשפשים, הנמל, מגדל השעון ושקיעות מעל הים." } },
  { name: { en: "The Port & Yarkon Park", he: "הנמל ופארק הירקון" }, color: "#0b7285", body: { en: "Boardwalk, weekend markets and the city's big park for running, cycling and picnics.", he: "טיילת, שווקים בסופ״ש והפארק הגדול של העיר לריצה, רכיבה ופיקניקים." } },
  { name: { en: "Sarona & the towers", he: "שרונה והמגדלים" }, color: "#5f3dc4", body: { en: "Restored Templer houses, a food market and the Azrieli towers next door.", he: "בתי טמפלרים משוחזרים, שוק אוכל ומגדלי עזריאלי ממש ליד." } },
];

const ESSENTIALS: { title: T; body: T }[] = [
  { title: { en: "Money and tipping", he: "כסף וטיפים" }, body: { en: "Cards work almost everywhere. In restaurants and cafés a 10–15% tip is normal and is usually not on the bill.", he: "כרטיסי אשראי מתקבלים כמעט בכל מקום. במסעדות ובבתי קפה נהוג טיפ של 10–15%, ובדרך כלל הוא לא כלול בחשבון." } },
  { title: { en: "The week", he: "השבוע" }, body: { en: "The weekend is Friday and Saturday. Friday mornings are for markets and brunch; many shops close Friday afternoon and reopen Saturday night.", he: "סוף השבוע הוא שישי ושבת. שישי בבוקר זה שווקים ובראנץ׳; חנויות רבות נסגרות בשישי אחה״צ ונפתחות במוצאי שבת." } },
  { title: { en: "Beaches", he: "חופים" }, body: { en: "Swim only at beaches with a lifeguard on duty and check the flag. Tap water is safe to drink, and the sun is strong most of the year.", he: "רוחצים רק מול מציל ובודקים את הדגל. מי הברז ראויים לשתייה, והשמש חזקה רוב השנה." } },
  { title: { en: "Living here", he: "לגור כאן" }, body: { en: "Residents can join DigiTel, the city's free resident club, for discounts and city updates. Municipal tax (arnona) is paid to the city; the 106 hotline handles most city issues.", he: "תושבים יכולים להצטרף לדיגיתל, מועדון התושבים החינמי של העירייה, להנחות ועדכונים. ארנונה משלמים לעירייה; מוקד 106 מטפל ברוב הפניות." } },
];

const NUMBERS: [string, T][] = [
  ["100", { en: "Police", he: "משטרה" }],
  ["101", { en: "Ambulance (Magen David Adom)", he: "מד״א" }],
  ["102", { en: "Fire and rescue", he: "כבאות והצלה" }],
  ["106", { en: "City of Tel Aviv-Yafo hotline", he: "מוקד העירייה" }],
];

const Guide = () => {
  const { lang } = useI18n();
  const city = useCityData();
  const L = (x: T) => (lang === "he" ? x.he : x.en);

  useEffect(() => {
    document.title = lang === "he" ? "מדריך לעיר · TLV Radar" : "City guide · TLV Radar";
  }, [lang]);

  const counts: [number | undefined, T, string][] = [
    [city.data?.toilets?.length, { en: "public toilets", he: "שירותים ציבוריים" }, "#1971c2"],
    [city.data?.dogParks?.length, { en: "dog parks", he: "גינות כלבים" }, "#2f9e44"],
    [city.data?.shelters?.length, { en: "public shelters", he: "מקלטים ציבוריים" }, "#c92a2a"],
    [city.data?.culture?.length, { en: "museums, galleries and venues", he: "מוזיאונים, גלריות ואולמות" }, "#7048e8"],
  ];

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #2f9e44 0%, #0b7285 50%, #1971c2 100%)" }}>
        <div className="container-page py-8 sm:py-12">
          <h1 className="font-display text-[42px] sm:text-[64px] leading-[0.95]">{L({ en: "Tel Aviv, explained", he: "תל אביב, בקצרה" })}</h1>
          <p className="mt-2 text-[17px] text-white/90 max-w-xl">{L({ en: "The neighbourhoods, how the week works, and the things locals know. For visitors, newcomers and everyone in between.", he: "השכונות, איך עובד השבוע, והדברים שהמקומיים יודעים. למבקרים, לחדשים בעיר ולכל מי שביניהם." })}</p>
        </div>
      </section>

      <div className="container-page">
        <h2 className="mt-8 font-display text-[26px] leading-none">{L({ en: "Neighbourhoods", he: "שכונות" })}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOODS.map((h) => (
            <li key={h.name.en} className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="h-2" style={{ background: h.color }} />
              <div className="p-4">
                <h3 className="font-display text-[20px] leading-tight">{L(h.name)}</h3>
                <p className="mt-1.5 text-[14px] text-muted-foreground leading-relaxed">{L(h.body)}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr,340px]">
          <section>
            <h2 className="font-display text-[26px] leading-none">{L({ en: "Good to know", he: "כדאי לדעת" })}</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {ESSENTIALS.map((e) => (
                <li key={e.title.en} className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-4">
                  <h3 className="text-[16px] font-medium">{L(e.title)}</h3>
                  <p className="mt-1.5 text-[14px] text-muted-foreground leading-relaxed">{L(e.body)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 text-[14px]">
              <Link to="/getting-around" className="rounded-full border border-border px-4 h-10 inline-flex items-center hover:bg-secondary">{L({ en: "Getting around →", he: "התניידות בעיר ←" })}</Link>
              <Link to="/shabbat" className="rounded-full border border-border px-4 h-10 inline-flex items-center hover:bg-secondary">{L({ en: "Shabbat & holidays →", he: "שבת וחגים ←" })}</Link>
              <Link to="/beach" className="rounded-full border border-border px-4 h-10 inline-flex items-center hover:bg-secondary">{L({ en: "Beaches →", he: "חופים ←" })}</Link>
            </div>
          </section>

          <aside className="space-y-8">
            <section className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-4">
              <h2 className="text-[17px] font-medium">{L({ en: "Emergency numbers", he: "מספרי חירום" })}</h2>
              <ul className="mt-2 space-y-2">
                {NUMBERS.map(([n, label]) => (
                  <li key={n}>
                    <a href={`tel:${n}`} className="flex items-center gap-3 hover:text-sea">
                      <span className="h-9 w-12 rounded-lg bg-destructive/10 text-destructive font-semibold tabular flex items-center justify-center"><Phone className="h-3.5 w-3.5 me-1" aria-hidden />{n}</span>
                      <span className="text-[14px]">{L(label)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-[17px] font-medium">{L({ en: "Around the city", he: "ברחבי העיר" })}</h2>
              <ul className="mt-2 space-y-1.5">
                {counts.map(([n, label, color]) => (
                  <li key={label.en} className="flex items-baseline gap-2">
                    <span className="h-2 w-2 rounded-full self-center" style={{ background: color }} aria-hidden />
                    <span className="text-[18px] font-medium tabular">{n ?? "…"}</span>
                    <span className="text-[14px] text-muted-foreground">{L(label)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-muted-foreground">{L({ en: "From the City of Tel Aviv-Yafo's open data.", he: "מתוך המידע הפתוח של עיריית תל אביב-יפו." })}</p>
            </section>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
};

export default Guide;
