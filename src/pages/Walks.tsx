import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Navigation } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { WALKS, type Walk } from "@/content/walks";
import { distanceMeters } from "@/lib/live/geo";
import { MiniMap } from "@/components/radar/MiniMap";
import { Credit, usePhoto } from "@/components/article/Blocks";
import { Disclosure, ToursCard } from "@/components/site/Partners";
import { BandHero, PhotoHero, TILTS } from "@/components/postcard/ui";

const lengthOf = (w: Walk) => w.stops.slice(1).reduce((s, x, i) => s + distanceMeters(w.stops[i], x), 0) * 1.25; // streets aren't straight

const WalkCard = ({ w, tilt = "" }: { w: Walk; tilt?: string }) => {
  const { t, lang } = useI18n();
  const p = usePhoto(w.cover);
  const km = lengthOf(w) / 1000;
  return (
    <Link to={`/walks/${w.slug}`} className={`group postcard block text-[#0b1a33] dark:text-foreground ${tilt}`}>
      <span className="relative block overflow-hidden">
        {p ? <img src={p.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <span className="block w-full aspect-[4/3]" style={{ background: w.color }} />}
        <span className="absolute bottom-3 start-3 rounded-md px-2 py-0.5 text-[12px] font-semibold text-white" style={{ background: w.color }}>{km.toFixed(1)} km, {Math.round((km / 4.5) * 60)} {t("live.minutes")}</span>
      </span>
      <span className="mt-3 block font-display text-[24px] leading-tight">{lang === "he" ? w.titleHe : w.title}</span>
      <span className="mt-1 block text-[14px] text-muted-foreground">{w.dek}</span>
    </Link>
  );
};

export const Walks = () => {
  const { t, lang } = useI18n();
  useEffect(() => {
    document.title = lang === "he" ? "סיורים רגליים · Discover Tel Aviv" : "Walking tours · Discover Tel Aviv";
  }, [lang]);
  return (
    <SiteLayout>
      <BandHero title={t("walk.title")} dek={t("walk.body")} color="#ff5a4e" />
      <div className="container-page">
        <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {WALKS.map((w, i) => <WalkCard key={w.slug} w={w} tilt={TILTS[i % TILTS.length]} />)}
        </div>
        <ToursCard query="Tel Aviv" className="mt-12" />
        <Disclosure className="mt-2" />
      </div>
    </SiteLayout>
  );
};

export const WalkPage = () => {
  const { slug = "" } = useParams();
  const { t, lang } = useI18n();
  const w = WALKS.find((x) => x.slug === slug);
  const p = usePhoto(w?.cover);
  const line = useMemo(() => (w ? w.stops.map((s) => [s.lon, s.lat] as [number, number]) : []), [w]);

  useEffect(() => {
    if (w) document.title = `${w.title} · Discover Tel Aviv`;
    window.scrollTo(0, 0);
  }, [w]);

  if (!w) return <SiteLayout><div className="container-page py-20"><h1 className="font-display text-[40px]">{t("art.notFound")}</h1><Link to="/walks" className="text-sea underline">{t("walk.title")}</Link></div></SiteLayout>;
  const km = lengthOf(w) / 1000;
  const gmaps = `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${w.stops[0].lat},${w.stops[0].lon}&destination=${w.stops.at(-1)!.lat},${w.stops.at(-1)!.lon}&waypoints=${w.stops.slice(1, -1).map((s) => `${s.lat},${s.lon}`).join("|")}`;

  return (
    <SiteLayout>
      <PhotoHero
        photo={p?.src}
        bandColor={w.color}
        kicker={<Link to="/walks" className="underline underline-offset-4">{t("walk.title")}</Link>}
        title={lang === "he" ? w.titleHe : w.title}
        stamp={<div className="flex flex-col gap-1"><span className="text-[12px] font-bold">{t("walk.walking")}</span><span className="font-poster text-[54px]">{km.toFixed(1)} km</span><span className="text-[13px]">{t("walk.about")} {Math.round((km / 4.5) * 60)} {t("live.minutes")}, {w.stops.length} {t("walk.stops")}</span></div>}
        band={<div className="flex flex-wrap items-center gap-4"><p className="text-[19px] max-w-2xl">{w.dek}</p><a href={gmaps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-12 rounded-md bg-white text-[#0b1a33] px-5 text-[15px] font-extrabold"><Navigation className="h-4 w-4" aria-hidden />{t("walk.start")}</a></div>}
      />
      <div className="container-page mt-10 grid gap-8 lg:grid-cols-[1fr,460px]">
        <ol className="order-2 lg:order-1">
          {w.stops.map((s, i) => (
            <li key={s.name} className="relative flex gap-5 pb-8 last:pb-0">
              {i < w.stops.length - 1 && <span className="absolute start-[15px] top-8 bottom-0 w-[6px] -translate-x-1/2 rtl:translate-x-1/2" style={{ background: w.color }} aria-hidden />}
              <span className="relative h-8 w-8 shrink-0 rounded-full border-[6px] bg-background font-extrabold text-[13px] flex items-center justify-center" style={{ borderColor: w.color }}>{i + 1}</span>
              <span>
                <span className="block font-display text-[24px] leading-tight">{lang === "he" ? s.nameHe : s.name}</span>
                <span className="block mt-1 text-[16px] leading-relaxed text-muted-foreground">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="order-1 lg:order-2 space-y-3">
          <MiniMap lat={w.stops[0].lat} lon={w.stops[0].lon} line={line} className="h-[360px] lg:h-[520px]" />
          {p && <img src={p.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full aspect-[16/9] object-cover rounded-xl" />}
          {p && <Credit p={p} />}
        </div>
      </div>
      <div className="container-page">
        <ToursCard query={w.slug.includes("jaffa") ? "Jaffa" : w.slug.includes("carmel") ? "Tel Aviv food tour" : w.slug.includes("bauhaus") ? "Tel Aviv Bauhaus" : w.slug.includes("florentin") ? "Tel Aviv street art" : "Tel Aviv"} className="mt-12" />
        <Disclosure className="mt-2" />
      </div>
    </SiteLayout>
  );
};
