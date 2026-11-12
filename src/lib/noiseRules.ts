// Construction noise and dust in Tel Aviv-Yafo: the rules residents can rely on, in plain words.
// Based on the city's published conditions for building sites (April 2024) and the national noise
// regulations they apply. Used by the /construction-noise-rules page and its pre-rendered SEO copy.

export const NOISE_SOURCE = {
  en: "City of Tel Aviv-Yafo: environmental conditions and guidelines for preventing dust and noise nuisances at building sites (11.4.2024)",
  he: "עיריית תל אביב-יפו: תנאים סביבתיים והנחיות למניעת מטרדי אבק ורעש באתרי בניה (11.4.2024)",
  url: "https://www.tel-aviv.gov.il/Residents/Environment/Sharedocs/%D7%AA%D7%A0%D7%90%D7%99%D7%9D%20%D7%A1%D7%91%D7%99%D7%91%D7%AA%D7%99%D7%99%D7%9D%20%D7%95%D7%94%D7%A0%D7%97%D7%99%D7%95%D7%AA%20%D7%9C%D7%9E%D7%A0%D7%99%D7%A2%D7%AA%20%D7%9E%D7%98%D7%A8%D7%93%D7%99%20%D7%90%D7%91%D7%A7%20%D7%95%D7%A8%D7%A2%D7%A9%20%D7%91%D7%90%D7%AA%D7%A8%D7%99%20%D7%91%D7%A0%D7%99%D7%94%2011.4.24.pdf",
};

type Txt = { en: string; he: string };
export type NoiseSection = { title: Txt; body?: Txt[]; bullets?: Txt[] };

export const NOISE_HOURS: { when: Txt; rule: Txt; tone: "ok" | "no" }[] = [
  { when: { en: "Sunday to Thursday, 07:00 to 19:00", he: "ראשון עד חמישי, 07:00–19:00" }, rule: { en: "Building work allowed", he: "מותר לעבוד" }, tone: "ok" },
  { when: { en: "Every night, 19:00 to 07:00", he: "בכל לילה, 19:00–07:00" }, rule: { en: "No noisy machinery", he: "אסור להפעיל מכונות רועשות" }, tone: "no" },
  { when: { en: "Friday and holiday eves, from 17:00", he: "שישי וערבי חג, מ-17:00" }, rule: { en: "No noisy machinery until 07:00 after Shabbat or the holiday", he: "אסור עד 07:00 שאחרי השבת או החג" }, tone: "no" },
  { when: { en: "Shabbat and holidays", he: "שבתות וחגים" }, rule: { en: "No noisy machinery all day", he: "אסור כל היום" }, tone: "no" },
];

export const NOISE_SECTIONS: NoiseSection[] = [
  {
    title: { en: "What counts as noisy work", he: "מה נחשב עבודה רועשת" },
    body: [{ en: "The ban covers machinery and tools used for building, digging, demolition and site preparation: jackhammers, drills and saws, concrete pumps and mixers, excavators, cranes lifting loads, and loading or unloading heavy materials.", he: "האיסור חל על מכונות וכלים לבניה, חפירה, הריסה והכנת השטח: פטישי אוויר, מקדחות ומסורים, משאבות ומערבלי בטון, מחפרים, מנופים בהרמה, ופריקה או העמסה של חומרים כבדים." }],
  },
  {
    title: { en: "The exceptions", he: "החריגים" },
    bullets: [
      { en: "Urgent work to prevent danger to people or property can happen at any hour.", he: "עבודה דחופה למניעת סכנה לאדם או לרכוש מותרת בכל שעה." },
      { en: "Night works need a special approval from the city, with set dates and hours. Approved night works show up on our address map as \"Night works\", with their hours.", he: "עבודת לילה מחייבת אישור מיוחד מהעירייה, עם תאריכים ושעות קבועים. עבודות לילה מאושרות מופיעות במפה שלנו תחת \"עבודות לילה\", עם השעות." },
      { en: "Infrastructure works in the street (electricity, water, sewage, light rail) often get night approvals to avoid daytime traffic. These are approved one stretch of street at a time.", he: "עבודות תשתית ברחוב (חשמל, מים, ביוב, רכבת קלה) מקבלות לא פעם אישורי לילה כדי לא לחסום תנועה ביום. האישור ניתן לכל קטע רחוב בנפרד." },
    ],
  },
  {
    title: { en: "What the builder has to do", he: "מה הקבלן חייב לעשות" },
    bullets: [
      { en: "Tell neighbouring residents in advance before unusually noisy work, like a long concrete pour or demolition.", he: "להודיע לשכנים מראש לפני עבודה רועשת במיוחד, כמו יציקה ארוכה או הריסה." },
      { en: "Keep noise within the limits set in the noise regulations, and use quieter equipment where possible.", he: "לעמוד במפלסי הרעש שבתקנות, ולהשתמש בציוד שקט ככל האפשר." },
      { en: "Fence the site with a solid fence at least 2 m high and keep dust down by wetting the site and the piles.", he: "לגדר את האתר בגדר אטומה בגובה 2 מ' לפחות, ולמנוע אבק בהרטבה של האתר והערמות." },
      { en: "Cover trucks carrying earth or rubble, and clean mud and dirt off the street.", he: "לכסות משאיות שמובילות עפר או פסולת, ולנקות בוץ ולכלוך מהכביש." },
      { en: "Show a sign with the permit details and the site manager's contact at the entrance.", he: "להציב שלט עם פרטי ההיתר ופרטי הקשר של מנהל העבודה בכניסה." },
    ],
  },
  {
    title: { en: "How to complain", he: "איך מתלוננים" },
    bullets: [
      { en: "Call the city hotline on 106 from any phone in Tel Aviv-Yafo. It runs 24 hours a day.", he: "חייגו למוקד העירוני 106 מכל טלפון בתל אביב-יפו. המוקד פועל 24 שעות ביממה." },
      { en: "Give the exact address of the site, what is happening (machinery, a concrete pump, a truck unloading) and when it started.", he: "מסרו את הכתובת המדויקת של האתר, מה קורה (מכונה, משאבת בטון, פריקה) ומתי זה התחיל." },
      { en: "Take a short video with the time showing. Ask for a case number and write it down.", he: "צלמו סרטון קצר שבו רואים את השעה. בקשו מספר פנייה ורשמו אותו." },
      { en: "If it keeps happening, complain every time. Repeated complaints are what lead to fines and to the city stopping night work.", he: "אם זה חוזר, התלוננו בכל פעם. תלונות חוזרות הן מה שמוביל לקנסות ולעצירת עבודות לילה." },
      { en: "Check our map first: if the site has an approved night-work permit for tonight, the city will usually tell you it's allowed.", he: "בדקו קודם במפה שלנו: אם לאתר יש אישור לעבודת לילה להלילה, העירייה בדרך כלל תגיד שזה מותר." },
    ],
  },
  {
    title: { en: "If the works are on your own building", he: "אם העבודות בבניין שלכם" },
    body: [{ en: "TAMA 38 and demolish-and-rebuild projects follow the same hours, but much of what affects you (scaffolding, access, temporary housing, compensation) is set in the agreement between the owners and the developer. Raise it through your building's representatives and the developer's site manager, and keep the city hotline for hours and safety.", he: "פרויקטים של תמ״א 38 ופינוי-בינוי כפופים לאותן שעות, אבל חלק גדול ממה שמשפיע עליכם (פיגומים, גישה, דיור חלופי, פיצויים) נקבע בהסכם בין הדיירים ליזם. העלו את זה דרך נציגות הבניין ומנהל העבודה של היזם, ושמרו את המוקד העירוני לשעות ולבטיחות." }],
  },
];

export const NOISE_FAQ: { q: Txt; a: Txt }[] = [
  { q: { en: "Can construction start before 7am in Tel Aviv?", he: "מותר להתחיל בניה לפני 7 בבוקר בתל אביב?" }, a: { en: "No. Noisy building machinery is not allowed between 19:00 and 07:00, unless the city gave a special night-work approval or the work is urgent for safety.", he: "לא. אסור להפעיל מכונות בניה רועשות בין 19:00 ל-07:00, אלא אם העירייה נתנה אישור מיוחד לעבודת לילה או שמדובר בעבודה דחופה לבטיחות." } },
  { q: { en: "Is building work allowed on Friday afternoon?", he: "מותר לבנות בשישי אחר הצהריים?" }, a: { en: "Until 17:00. From 17:00 on Friday, and on holiday eves, noisy machinery has to stop until 07:00 after Shabbat or the holiday.", he: "עד 17:00. מ-17:00 בשישי ובערבי חג צריך להפסיק להפעיל מכונות רועשות עד 07:00 שאחרי השבת או החג." } },
  { q: { en: "Who do I call about construction noise at night?", he: "למי מתקשרים על רעש בניה בלילה?" }, a: { en: "The city hotline, 106. Give the address, what's happening and the time, and ask for a case number.", he: "למוקד העירוני 106. מסרו כתובת, מה קורה ומתי, ובקשו מספר פנייה." } },
  { q: { en: "How do I know if a site has a night-work permit?", he: "איך יודעים אם לאתר יש אישור לעבודת לילה?" }, a: { en: "Type the address into our checker. Approved night works at building sites and in the street are listed with their dates and hours, straight from the city's data.", he: "הקלידו את הכתובת בבודק שלנו. עבודות לילה מאושרות באתרי בניה וברחוב מופיעות עם התאריכים והשעות, ישירות מנתוני העירייה." } },
];
