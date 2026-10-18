import { Link, NavLink } from "react-router-dom";
import { CalendarDays, Menu, Moon, Newspaper, Radar, Sun, SunMoon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type StringKey } from "@/lib/i18n";
import { Logo } from "./Logo";

export const TABS: { to: string; key: StringKey; icon: typeof Sun; end?: boolean }[] = [
  { to: "/", key: "nav.now", icon: Sun, end: true },
  { to: "/live", key: "nav.live", icon: Radar },
  { to: "/events", key: "nav.whatson", icon: CalendarDays },
  { to: "/news", key: "nav.news", icon: Newspaper },
];

const MORE: { to: string; key: StringKey }[] = [
  { to: "/food", key: "nav.food" },
  { to: "/nightlife", key: "nav.nightlife" },
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
      className="h-9 rounded-full border border-border px-3 text-[13px] font-medium hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
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
      className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
};

export const SiteHeader = () => {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="container-page flex h-14 items-center justify-between gap-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-1 text-[15px]" aria-label="Main">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-full px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${
                  isActive ? "bg-foreground text-background font-medium" : "text-foreground/75 hover:text-foreground hover:bg-secondary"
                }`
              }
            >
              <tab.icon className="h-4 w-4" aria-hidden />
              {t(tab.key)}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("nav.more")}
              className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea"
            >
              <Menu className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              {MORE.map((m) => (
                <DropdownMenuItem key={m.to} asChild>
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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4">
        {TABS.map((tab) => (
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
