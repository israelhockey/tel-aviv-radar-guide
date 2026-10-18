import { ReactNode } from "react";
import { BottomTabs, SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

// `fill` makes the main area take the remaining viewport height with no footer (used by the live map).
export const SiteLayout = ({ children, fill = false }: { children: ReactNode; fill?: boolean }) => (
  <div className={fill ? "h-[100dvh] flex flex-col overflow-hidden" : "min-h-screen flex flex-col"}>
    <SiteHeader />
    <main className={fill ? "relative flex-1 min-h-0 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0" : "flex-1 pb-20 md:pb-0"}>
      {children}
    </main>
    {!fill && <SiteFooter />}
    <BottomTabs />
  </div>
);
