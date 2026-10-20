import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Bike, Bus, Plane, Search, SquareParking, TrainFront, CreditCard } from "lucide-react";
import { BoardRow, LineMap } from "@/components/lines/Lines";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useBuses, useParking, useTelofan, useTraffic } from "@/lib/live/hooks";

const Tip = ({ icon: Icon, title, body }: { icon: typeof Bus; title: StringKey; body: StringKey }) => {
  const { t } = useI18n();
  return (
    <li className="rounded-[4px] border-2 border-foreground p-4">
      <p className="flex items-center gap-2 text-[16px] font-medium"><Icon className="h-4 w-4 text-sea" aria-hidden />{t(title)}</p>
      <p className="mt-1.5 text-[14px] text-muted-foreground leading-relaxed">{t(body)}</p>
    </li>
  );
};

const GettingAround = () => {
  const { t, lang } = useI18n();
  const buses = useBuses();
  const parking = useParking();
  const docks = useTelofan();
  const traffic = useTraffic();

  useEffect(() => {
    document.title = lang === "he" ? "התניידות בעיר · Discover Tel Aviv" : "Getting around · Discover Tel Aviv";
  }, [lang]);

  const bikes = docks.data?.reduce((n, d) => n + d.bikes + d.ebikes, 0) ?? null;
  const freeLots = parking.data?.filter((k) => k.status === "free" || k.status === "few").length ?? null;
  const heavy = traffic.data?.jams.filter((j) => j.level >= 3).length ?? null;
  const closures = traffic.data?.reports.filter((r) => r.type === "ROAD_CLOSED").length ?? null;

  const L = (en: string, he: string) => (lang === "he" ? he : en);
  return (
    <SiteLayout zone="lines">
      <section className="container-page pt-12 pb-8">
        <h1 className="font-display text-[52px] sm:text-[88px] leading-[0.95] max-w-[13ch]">{L("Getting around, one stop at a time.", "מתניידים בעיר, תחנה אחר תחנה.")}</h1>
        <p className="mt-4 text-[19px] max-w-[54ch] text-muted-foreground">{L("Pick a stop on any line to see what's around it right now: bikes, car parks, what's open and what's on.", "בחרו תחנה בכל קו וראו מה יש סביבה עכשיו: אופניים, חניונים, מה פתוח ומה קורה.")}</p>
        <Link to="/live?where=1" className="mt-6 inline-flex h-12 items-center gap-2 rounded-[4px] bg-foreground text-background px-6 text-[15px] font-bold">
          <Search className="h-4 w-4" aria-hidden />{t("where.button")}
        </Link>
        <div className="mt-12"><LineMap /></div>
      </section>

      <section className="bg-[#101820] text-white py-12">
        <div className="container-page">
          <h2 className="font-display text-[34px] sm:text-[40px] mb-5">{L("The city board", "לוח העיר")}</h2>
          <div className="grid gap-[2px] bg-[#2b3540] sm:grid-cols-2 lg:grid-cols-3">
            <BoardRow code="B" color="#0072ce" label={t("now.busesMoving")} value={buses.data ? String(buses.data.buses.length) : "…"} to="/live" />
            <BoardRow code="T" color="#7b2d8e" label={t("go.jams")} value={heavy != null ? String(heavy) : "…"} to="/live?layers=traffic" />
            <BoardRow code="X" color="#e4002b" label={t("go.closures")} value={closures != null ? String(closures) : "…"} to="/live?layers=traffic" />
            <BoardRow code="P" color="#00a651" label={t("go.lots")} value={freeLots != null ? `${freeLots}${parking.data ? `/${parking.data.length}` : ""}` : "…"} to="/live?layers=parking" />
            <BoardRow code="O" color="#ff8200" label={t("go.bikes")} value={bikes != null ? String(bikes) : "…"} to="/live?layers=bikes" />
            <BoardRow code="S" color="#ffffff" label={L("Weekend shuttle and Shabbat times", "שאטל סופ״ש וזמני שבת")} value="→" to="/shabbat" />
          </div>
        </div>
      </section>

      <div className="container-page">
        <h2 className="mt-12 font-display text-[34px] sm:text-[40px]">{t("go.how")}</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          <Tip icon={CreditCard} title="go.payT" body="go.payB" />
          <Tip icon={TrainFront} title="go.railT" body="go.railB" />
          <Tip icon={Bus} title="go.shabbatT" body="go.shabbatB" />
          <Tip icon={Plane} title="go.airportT" body="go.airportB" />
          <Tip icon={Bike} title="go.bikeT" body="go.bikeB" />
          <Tip icon={SquareParking} title="go.parkT" body="go.parkB" />
        </ul>
        <div className="mt-8 flex flex-wrap gap-2">
          {[["/magazine/tel-aviv-light-rail-guide", L("Riding the light rail", "הרכבת הקלה")], ["/magazine/ben-gurion-airport-to-tel-aviv", L("Airport to the city", "מהשדה לעיר")], ["/magazine/shabbat-in-tel-aviv", L("Shabbat in Tel Aviv", "שבת בתל אביב")]].map(([to, label]) => (
            <Link key={to} to={to} className="h-10 inline-flex items-center rounded-[4px] border-2 border-foreground px-4 font-bold hover:bg-foreground hover:text-background">{label}</Link>
          ))}
        </div>
        <p className="mt-6 text-[12px] text-muted-foreground">{t("go.sources")}</p>
      </div>
    </SiteLayout>
  );
};

export default GettingAround;
