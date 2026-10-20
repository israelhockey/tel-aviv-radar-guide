import { Link } from "react-router-dom";
import { BedDouble, Compass } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { anyEarning, essentials, hotelLink, relFor, toursLink, type PartnerLink } from "@/lib/affiliates";

// Partner links: booking, tours and travel essentials. Every one is marked as a paid link and
// comes with a short disclosure, so readers always know.

export const Disclosure = ({ className = "" }: { className?: string }) => {
  const { t } = useI18n();
  if (!anyEarning()) return null;
  return <p className={`text-[12px] text-muted-foreground ${className}`}>{t("aff.note")} <Link to="/about#affiliates" className="underline underline-offset-2">{t("aff.how")}</Link></p>;
};

const Out = ({ link, className, children }: { link: PartnerLink; className: string; children: React.ReactNode }) => (
  <a href={link.href} target="_blank" rel={relFor(link.earning)} className={className}>{children}</a>
);

export const BookButton = ({ name, lat, lon, className = "" }: { name: string; lat?: number; lon?: number; className?: string }) => {
  const { t } = useI18n();
  return (
    <Out link={hotelLink(name, lat, lon)} className={`inline-flex items-center gap-2 h-11 rounded-lg bg-[#0057ff] text-white px-5 text-[14px] font-semibold hover:opacity-90 ${className}`}>
      <BedDouble className="h-4 w-4" aria-hidden />{t("aff.prices")}
    </Out>
  );
};

export const ToursCard = ({ query, title, className = "" }: { query: string; title?: string; className?: string }) => {
  const { t } = useI18n();
  return (
    <div className={`rounded-xl bg-[#0c8599] text-white p-5 sm:flex sm:items-center sm:justify-between gap-6 ${className}`}>
      <div>
        <p className="font-display text-[22px] leading-tight">{title ?? t("aff.toursTitle")}</p>
        <p className="mt-1 text-[14px] text-white/85">{t("aff.toursBody")}</p>
      </div>
      <Out link={toursLink(query)} className="mt-4 sm:mt-0 shrink-0 inline-flex items-center gap-2 h-11 rounded-lg bg-white text-[#0c8599] px-5 text-[14px] font-semibold">
        <Compass className="h-4 w-4" aria-hidden />{t("aff.toursCta")}
      </Out>
    </div>
  );
};

export const Essentials = ({ className = "" }: { className?: string }) => {
  const { t, lang } = useI18n();
  return (
    <section className={className}>
      <h2 className="font-display text-[28px] leading-none">{t("aff.essentials")}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {essentials().map((e) => (
          <li key={e.id}>
            <Out link={e.link} className="group block h-full rounded-xl border border-border p-4 hover:border-foreground/40">
              <span className="block h-1.5 w-10 rounded-full" style={{ background: e.color }} />
              <span className="mt-3 block text-[18px] font-semibold group-hover:underline underline-offset-4">{lang === "he" ? e.he : e.en}</span>
              <span className="mt-1 block text-[14px] text-muted-foreground">{lang === "he" ? e.bodyHe : e.bodyEn}</span>
              <span className="mt-2 block text-[12px] font-semibold" style={{ color: e.color }}>{e.partner} →</span>
            </Out>
          </li>
        ))}
      </ul>
      <Disclosure className="mt-3" />
    </section>
  );
};

/** "Hotels in Neve Tzedek": inside guides, where to stay in the area being described. */
export const StayCard = ({ area, text }: { area: string; text?: string }) => {
  const { t } = useI18n();
  return (
    <div className="mt-6 rounded-xl border-2 border-[#0057ff] p-4 sm:flex sm:items-center sm:justify-between gap-4">
      <div>
        <p className="text-[13px] font-semibold text-[#0057ff]">{t("aff.stayIn")}</p>
        <p className="text-[20px] font-display leading-tight">{area}</p>
        {text && <p className="mt-1 text-[14px] text-muted-foreground">{text}</p>}
      </div>
      <div className="mt-3 sm:mt-0 flex shrink-0 gap-2">
        <BookButton name={area} />
        <Link to="/hotels" className="inline-flex items-center h-11 rounded-lg border border-border px-4 text-[14px] font-medium hover:bg-secondary">{t("aff.map")}</Link>
      </div>
    </div>
  );
};
