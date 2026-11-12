import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Every new page opens at the top. Back/forward keep the browser's own scroll position,
// in-page filter changes (replace) don't jump, and anchor links (#privacy) still go to the anchor.
export const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();
  const nav = useNavigationType();
  useLayoutEffect(() => {
    if ((nav === "POP" || nav === "REPLACE") && !hash) return;
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search, hash, nav]);
  return null;
};
