import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Footprints, Navigation } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n } from "@/lib/i18n";
import { WALKS, type Walk } from "@/content/walks";
import { distanceMeters } from "@/lib/live/geo";
import { MiniMap } from "@/components/radar/MiniMap";
import { Credit, usePhoto } from "@/components/article/Blocks";
import { Disclosure, ToursCard } from "@/components/site/Partners";

const lengthOf = (w: Walk) => w.stops.slice(1).reduce((s, x, i) => s + distanceMeters(w.stops[i], x), 0) * 1.25; // streets aren't straight

const WalkCard = ({ w }: { w: Walk }) => {
  const { t, lang } = useI18n();
  const p = usePhoto(w.cover);
  const km = lengthOf(w) / 1000;
  return (
    <Link to={`/walks/${w.slug}`} className="group block">
      <span className="relative block overflow-hidden rounded-lg">
        {p ? <img src={p.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <span className="block w-full aspect-[4/3]" style={{ background: w.color }} />}
        <span className="absolute bottom-3 start-3 rounded-md px-2 py-0.5 text-[12px] font-semibold text-white" style={{ background: w.color }}>{km.toFixed(1)} km, {Math.round((km / 4.5) * 60)} {t("live.minutes")}</span>
      </span>
      <span className="mt-3 block font-display text-[24px] leading-tight group-hover:text-[#ff5a4e]">{lang === "he" ? w.titleHe : w.title}</span>
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
      <div className="container-page pt-8 sm:pt-12">
        <h1 className="font-display text-[48px] sm:text-[72px] leading-[0.95]">{t("walk.title")}</h1>
        <p className="mt-2 text-[17px] text-muted-foreground max-w-xl">{t("walk.body")}</p>
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {WALKS.map((w) => <WalkCard key={w.slug} w={w} />)}
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
      <header className="container-page pt-8 sm:pt-12 max-w-4xl">
        <Link to="/walks" className="inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold text-white" style={{ background: w.color }}>{t("walk.title")}</Link>
        <h1 className="mt-3 font-display text-[40px] sm:text-[60px] leading-[1.02]">{lang === "he" ? w.titleHe : w.title}</h1>
        <p className="mt-3 text-[20px] text-muted-foreground">{w.dek}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-[15px]"><Footprints className="h-4 w-4" aria-hidden />{km.toFixed(1)} km, {t("walk.about")} {Math.round((km / 4.5) * 60)} {t("live.minutes")} {t("walk.walking")}, {w.stops.length} {t("walk.stops")}</span>
          <a href={gmaps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-10 rounded-lg bg-foreground text-background px-4 text-[14px] font-semibold"><Navigation className="h-4 w-4" aria-hidden />{t("walk.start")}</a>
        </div>
      </header>
      <div className="container-page mt-8 grid gap-8 lg:grid-cols-[1fr,460px]">
        <ol className="space-y-6 order-2 lg:order-1">
          {w.stops.map((s, i) => (
            <li key={s.name} className="flex gap-4">
              <span className="h-9 w-9 shrink-0 rounded-full text-white font-semibold flex items-center justify-center" style={{ background: w.color }}>{i + 1}</span>
              <span>
                <span className="block text-[20px] font-semibold">{lang === "he" ? s.nameHe : s.name}</span>
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
