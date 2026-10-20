import { ReactNode } from "react";
import { BottomTabs, SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export type Zone = "night" | "lines";

// `fill` makes the main area take the remaining viewport height with no footer (used by the live map).
// `zone` switches the look: "night" for the going-out pages, "lines" for transport.
export const SiteLayout = ({ children, fill = false, zone }: { children: ReactNode; fill?: boolean; zone?: Zone }) => (
  <div data-zone={zone} className={fill ? "h-[100dvh] flex flex-col overflow-hidden bg-background" : "min-h-screen flex flex-col bg-background overflow-x-clip"}>
    <SiteHeader />
    <main className={fill ? "relative flex-1 min-h-0 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0" : "flex-1 pb-20 lg:pb-0"}>
      {children}
    </main>
    {!fill && <SiteFooter />}
    <BottomTabs />
  </div>
);
