import { Link, NavLink } from "react-router-dom";
import { BedDouble, BookOpen, CalendarDays, MapPinned, Menu, Moon, Radar, Search, Sun, SunMoon, UtensilsCrossed, Waves } from "lucide-react";
import { useTheme } from "@/lib/theme";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type StringKey } from "@/lib/i18n";
import { Logo } from "./Logo";

export const TABS: { to: string; key: StringKey; icon: typeof Sun; end?: boolean; desktopOnly?: boolean }[] = [
  { to: "/", key: "nav.now", icon: Sun, end: true },
  { to: "/events", key: "nav.whatson", icon: CalendarDays },
  { to: "/food", key: "nav.foodShort", icon: UtensilsCrossed },
  { to: "/beach", key: "nav.beach", icon: Waves },
  { to: "/magazine", key: "nav.magazine", icon: BookOpen, desktopOnly: true },
  { to: "/area", key: "nav.areas", icon: MapPinned, desktopOnly: true },
  { to: "/hotels", key: "nav.hotels", icon: BedDouble, desktopOnly: true },
  { to: "/live", key: "nav.live", icon: Radar },
];

const MORE: { to: string; key: StringKey; mobileOnly?: boolean }[] = [
  { to: "/magazine", key: "nav.magazine", mobileOnly: true },
  { to: "/area", key: "nav.areas", mobileOnly: true },
  { to: "/hotels", key: "nav.hotels", mobileOnly: true },
  { to: "/news", key: "nav.news" },
  { to: "/walks", key: "nav.walks" },
  { to: "/jobs", key: "nav.jobs" },
  { to: "/shabbat", key: "nav.shabbat" },
  { to: "/cinema", key: "nav.cinema" },
  { to: "/getting-around", key: "nav.around" },
  { to: "/guide", key: "nav.guide" },
  { to: "/weekend", key: "nav.weekend" },
  { to: "/free", key: "nav.free" },
  { to: "/newsletter", key: "nav.newsletter" },
  { to: "/submit", key: "nav.submit" },
];

export const LanguageToggle = () => {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "he" ? "en" : "he")}
      className="h-9 rounded-md bg-sea text-sea-foreground px-3.5 text-[14px] font-bold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground [[data-zone=night]_&]:rounded-full"
      lang={lang === "he" ? "en" : "he"}
    >
      {t("lang.switch")}
    </button>
  );
};

// Auto follows the real sunset; a tap pins day or night.
export const ThemeToggle = () => {
  const { choice, setChoice } = useTheme();
  const { lang } = useI18n();
  const next = choice === "auto" ? "day" : choice === "day" ? "night" : "auto";
  const Icon = choice === "auto" ? SunMoon : choice === "day" ? Sun : Moon;
  const label = lang === "he"
    ? ({ auto: "מצב תאורה: לפי השקיעה", day: "מצב תאורה: יום", night: "מצב תאורה: לילה" } as const)[choice]
    : ({ auto: "Theme: follows sunset", day: "Theme: day", night: "Theme: night" } as const)[choice];
  return (
    <button
      onClick={() => setChoice(next)}
      aria-label={label}
      title={label}
      className="h-9 w-9 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
};

export const SiteHeader = () => {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border [[data-zone=lines]_&]:border-b-2">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo />
        <nav className="hidden lg:flex items-center gap-0.5 text-[15px] font-semibold" aria-label="Main">
          {TABS.filter((tab) => tab.to !== "/").map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `relative px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea rounded-md ${
                  isActive ? "text-foreground after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[3px] after:bg-accent" : "text-foreground/80 hover:text-foreground"
                }`
              }
            >
              {t(tab.key)}
            </NavLink>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link to="/search" aria-label={t("nav.search")} className="h-9 w-9 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"><Search className="h-4 w-4" aria-hidden /></Link>
          <span className="hidden sm:inline-flex"><ThemeToggle /></span>
          <LanguageToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("nav.more")}
              className="h-9 w-9 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
            >
              <Menu className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              {MORE.map((m) => (
                <DropdownMenuItem key={m.to} asChild className={m.mobileOnly ? "lg:hidden" : undefined}>
                  <Link to={m.to}>{t(m.key)}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

// Mobile tab bar. Hidden from md up, where the tabs sit in the header.
export const BottomTabs = () => {
  const { t } = useI18n();
  return (
    <nav
      aria-label="Main"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5">
        {TABS.filter((tab) => !tab.desktopOnly).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[11px] ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon className={`h-5 w-5 ${isActive ? "text-accent" : ""}`} aria-hidden />
                {t(tab.key)}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
