import { NavLink, Link } from "react-router-dom";
import { Radio } from "lucide-react";

const NAV = [
  { to: "/news", label: "News" },
  { to: "/events", label: "Events" },
  { to: "/food", label: "Food" },
  { to: "/nightlife", label: "Nightlife" },
  { to: "/business", label: "Business" },
  { to: "/weekend", label: "Weekend" },
];

export const SiteHeader = () => {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <header className="border-b-2 border-foreground bg-background">
      <div className="container-page flex items-center justify-between py-2 text-[11px] uppercase tracking-widest">
        <span>{today} · Tel Aviv</span>
        <Link to="/submit" className="hidden sm:inline hover:text-accent">Submit an event →</Link>
      </div>
      <div className="rule" />
      <div className="container-page flex flex-col items-center py-6">
        <Link to="/" className="flex items-center gap-3 group">
          <span className="inline-flex h-9 w-9 items-center justify-center bg-accent text-accent-foreground poster-shadow">
            <Radio className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-5xl sm:text-6xl font-black leading-none tracking-tighter">
            TLV<span className="text-accent">·</span>RADAR
          </span>
        </Link>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          What's happening in Tel Aviv today
        </p>
      </div>
      <div className="rule" />
      <nav className="container-page flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-3 text-sm font-semibold uppercase tracking-wider">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `transition-colors hover:text-accent ${isActive ? "text-accent" : "text-foreground"}`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="rule border-t" />
    </header>
  );
};
