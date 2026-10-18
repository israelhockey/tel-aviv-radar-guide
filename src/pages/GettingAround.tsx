import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Bike, Bus, Car, Plane, Search, SquareParking, TrainFront, CreditCard } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useBuses, useParking, useTelofan, useTraffic } from "@/lib/live/hooks";

const Tile = ({ to, icon: Icon, n, label, color, sub }: { to: string; icon: typeof Bus; n: string | number | null; label: string; color: string; sub?: string }) => (
  <Link to={to} className="group rounded-[var(--radius)] p-4 text-white shadow-[var(--shadow-card)] hover:brightness-105" style={{ background: color }}>
    <Icon className="h-5 w-5 opacity-90" aria-hidden />
    <p className="mt-3 font-display text-[36px] leading-none tabular">{n ?? "…"}</p>
    <p className="mt-1 text-[14px] font-medium">{label}</p>
    {sub && <p className="text-[12px] opacity-85">{sub}</p>}
  </Link>
);

const Tip = ({ icon: Icon, title, body }: { icon: typeof Bus; title: StringKey; body: StringKey }) => {
  const { t } = useI18n();
  return (
    <li className="rounded-[var(--radius)] bg-card shadow-[var(--shadow-card)] p-4">
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
    document.title = lang === "he" ? "התניידות בעיר · TLV Radar" : "Getting around · TLV Radar";
  }, [lang]);

  const bikes = docks.data?.reduce((n, d) => n + d.bikes + d.ebikes, 0) ?? null;
  const freeLots = parking.data?.filter((k) => k.status === "free" || k.status === "few").length ?? null;
  const heavy = traffic.data?.jams.filter((j) => j.level >= 3).length ?? null;
  const closures = traffic.data?.reports.filter((r) => r.type === "ROAD_CLOSED").length ?? null;

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #0b63e5 0%, #4263eb 45%, #7048e8 100%)" }}>
        <div className="container-page py-8 sm:py-12">
          <h1 className="font-display text-[42px] sm:text-[64px] leading-[0.95]">{t("go.title")}</h1>
          <p className="mt-2 text-[17px] text-white/90 max-w-xl">{t("go.body")}</p>
          <Link to="/live?where=1" className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-white text-[hsl(230_35%_10%)] px-6 text-[15px] font-semibold shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)]">
            <Search className="h-4 w-4" aria-hidden />{t("where.button")}
          </Link>
        </div>
      </section>

      <div className="container-page">
        <h2 className="mt-8 font-display text-[26px] leading-none">{t("go.now")}</h2>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile to="/live" icon={Bus} n={buses.data?.buses.length ?? null} label={t("now.busesMoving")} color="#0b63e5" />
          <Tile to="/live?layers=traffic" icon={Car} n={heavy} label={t("go.jams")} sub={closures != null ? `${closures} ${t("go.closures")}` : undefined} color="#e8590c" />
          <Tile to="/live?layers=parking" icon={SquareParking} n={freeLots} label={t("go.lots")} sub={parking.data ? `${t("bus.of")} ${parking.data.length}` : undefined} color="#1971c2" />
          <Tile to="/live?layers=bikes" icon={Bike} n={bikes} label={t("go.bikes")} sub={docks.data ? `${docks.data.length} ${t("go.docks")}` : undefined} color="#2f9e44" />
        </div>

        <h2 className="mt-10 font-display text-[26px] leading-none">{t("go.how")}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          <Tip icon={CreditCard} title="go.payT" body="go.payB" />
          <Tip icon={TrainFront} title="go.railT" body="go.railB" />
          <Tip icon={Bus} title="go.shabbatT" body="go.shabbatB" />
          <Tip icon={Plane} title="go.airportT" body="go.airportB" />
          <Tip icon={Bike} title="go.bikeT" body="go.bikeB" />
          <Tip icon={SquareParking} title="go.parkT" body="go.parkB" />
        </ul>
        <p className="mt-6 text-[12px] text-muted-foreground">{t("go.sources")}</p>
      </div>
    </SiteLayout>
  );
};

export default GettingAround;
