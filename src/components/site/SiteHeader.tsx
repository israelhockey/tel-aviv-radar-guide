import { NavLink, Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Logo } from "./Logo";

const NAV = [
  { to: "/events", label: "Tonight" },
  { to: "/weekend", label: "Weekend" },
  { to: "/food", label: "Food & Drink" },
  { to: "/nightlife", label: "Nightlife" },
  { to: "/free", label: "Free" },
  { to: "/business", label: "Business" },
  { to: "/news", label: "Local News" },
  { to: "/newsletter", label: "Newsletter" },
];

export const SiteHeader = () => (
  <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
    <div className="container-page flex items-center justify-between gap-6 py-4">
      <Logo />
      <nav className="hidden lg:flex items-center gap-7 text-[14px] font-semibold text-foreground/80">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `transition-colors hover:text-foreground ${isActive ? "text-foreground" : ""}`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <button aria-label="Search" className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition">
          <Search className="h-4 w-4" />
        </button>
        <Link
          to="/weekend"
          className="hidden sm:inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-bold text-accent-foreground hover:bg-accent/90 transition"
        >
          Get the Weekend Guide
        </Link>
      </div>
    </div>
  </header>
);
