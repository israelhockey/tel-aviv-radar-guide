import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { NOISE_FAQ, NOISE_HOURS, NOISE_SECTIONS, NOISE_SOURCE } from "@/lib/noiseRules";
import { AddressSearch } from "@/components/build/AddressSearch";

// Know your rights: construction noise hours, what builders must do, and how to complain.

const NoiseRules = () => {
  const { lang } = useI18n();
  const he = lang === "he";
  const T = (x: { en: string; he: string }) => (he ? x.he : x.en);
  const L = (en: string, h: string) => (he ? h : en);

  useEffect(() => {
    document.title = L("Construction noise rules in Tel Aviv: hours, your rights and how to complain · Discover Tel Aviv", "רעש בניה בתל אביב: שעות מותרות, הזכויות שלך ואיך מתלוננים · Discover Tel Aviv");
    const id = "noise-faq-ld";
    document.getElementById(id)?.remove();
    const s = document.createElement("script");
    s.type = "application/ld+json"; s.id = id;
    s.text = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: NOISE_FAQ.map((f) => ({ "@type": "Question", name: T(f.q), acceptedAnswer: { "@type": "Answer", text: T(f.a) } })) });
    document.head.appendChild(s);
    return () => s.remove();
  }, [lang]);

  return (
    <SiteLayout>
      <section className="bg-[#0b1a33] text-white">
        <div className="container-page py-10">
          <p className="text-[14px] font-extrabold uppercase tracking-wider text-[#ffcb05]">{L("Know your rights", "הזכויות שלך")}</p>
          <h1 className="mt-2 font-display text-[40px] sm:text-[68px] leading-[0.95] max-w-[900px]">{L("Construction noise in Tel Aviv: when it's allowed, and what to do when it isn't", "רעש בניה בתל אביב: מתי מותר, ומה עושים כשלא")}</h1>
          <p className="mt-4 max-w-[680px] text-[18px] text-white/85">{L("The hours builders must keep, what they owe the neighbours, and how to complain so it actually stops.", "השעות שהקבלנים חייבים לשמור, מה מגיע לשכנים, ואיך מתלוננים כך שזה באמת ייפסק.")}</p>
          <a href="tel:106" className="mt-6 inline-flex h-14 items-center gap-3 rounded-md bg-[#ffcb05] px-6 text-[18px] font-extrabold text-[#0b1a33]"><Phone className="h-5 w-5" aria-hidden />{L("Noise right now? Call 106", "רעש עכשיו? חייגו 106")}</a>
        </div>
      </section>

      <div className="container-page max-w-[860px] py-10">
        <h2 className="font-display text-[30px] border-b-[3px] border-foreground pb-2">{L("The short version", "בקצרה")}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {NOISE_HOURS.map((h) => (
            <li key={h.when.en} className={`rounded-[10px] p-4 border-s-[6px] ${h.tone === "ok" ? "bg-[#d3f9d8] border-[#2f9e44]" : "bg-[#ffe3e3] border-[#c92a2a]"} text-[#0b1a33]`}>
              <p className="font-bold">{T(h.when)}</p>
              <p className="text-[15px]">{T(h.rule)}</p>
            </li>
          ))}
        </ul>

        {NOISE_SECTIONS.map((s) => (
          <section key={s.title.en} className="mt-10">
            <h2 className="font-display text-[28px] border-b-2 border-foreground pb-1">{T(s.title)}</h2>
            {s.body?.map((b) => <p key={b.en} className="mt-3 text-[17px] leading-relaxed">{T(b)}</p>)}
            {s.bullets && <ul className="mt-3 list-disc ps-6 space-y-2 text-[17px] leading-relaxed">{s.bullets.map((b) => <li key={b.en}>{T(b)}</li>)}</ul>}
          </section>
        ))}

        <section className="mt-10 rounded-[10px] bg-[#0057ff] text-white p-6">
          <h2 className="font-display text-[28px]">{L("Is that site allowed to work tonight?", "מותר לאתר הזה לעבוד הלילה?")}</h2>
          <p className="mt-1 mb-4 text-white/85">{L("Check the address: approved night works, building sites and road works around it, from the city's own data.", "בדקו את הכתובת: עבודות לילה מאושרות, אתרי בניה ועבודות כביש סביבה, ישירות מנתוני העירייה.")}</p>
          <AddressSearch />
        </section>

        <section className="mt-10">
          <h2 className="font-display text-[28px] border-b-2 border-foreground pb-1">{L("Frequently asked questions", "שאלות נפוצות")}</h2>
          {NOISE_FAQ.map((f) => (
            <div key={f.q.en} className="mt-4">
              <h3 className="font-bold text-[18px]">{T(f.q)}</h3>
              <p className="mt-1 text-[16px] leading-relaxed">{T(f.a)}</p>
            </div>
          ))}
        </section>

        <p className="mt-10 text-[13px] text-muted-foreground">
          {L("Source: ", "מקור: ")}<a href={NOISE_SOURCE.url} target="_blank" rel="noopener noreferrer" className="underline">{T(NOISE_SOURCE)}</a>
          {L(", and the national noise prevention regulations it applies. This is a plain-language summary, not legal advice; the city's document and the regulations are the official version.", ", ותקנות מניעת הרעש הארציות שהוא מיישם. זהו סיכום בשפה פשוטה ולא ייעוץ משפטי; המסמך העירוני והתקנות הם הנוסח המחייב.")}
        </p>
        <p className="mt-3"><Link to="/check" className="font-bold text-sea hover:underline">{L("Check what's being built near you", "בדקו מה בונים לידכם")}</Link></p>
      </div>
    </SiteLayout>
  );
};

export default NoiseRules;
