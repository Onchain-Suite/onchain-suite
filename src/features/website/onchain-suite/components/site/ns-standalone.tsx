import type { ReactNode } from "react";

import "./ns.css";
import { geistMono, instrumentSans } from "@/shared/fonts/fonts";

// Brand + app typography (brand.md / design.md §4): Instrument Sans + Geist Mono.

/**
 * Wrapper for redesigned ("ns") pages that already bring their OWN chrome
 * (the bundle's ProductPage renders SiteChrome itself), unlike NsShell which
 * adds SiteChrome around a *Body. It only supplies the ns.css import and the
 * font variables, which inherit into the page's `.ns` root.
 */
export function NsStandalone({ children }: { children: ReactNode }) {
  return (
    <div className={`${instrumentSans.variable} ${geistMono.variable}`}>
      {children}
    </div>
  );
}
