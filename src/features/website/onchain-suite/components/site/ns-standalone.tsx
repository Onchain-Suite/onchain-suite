import { Geist_Mono, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./ns.css";

// Brand + app typography (brand.md / design.md §4): Instrument Sans + Geist Mono.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

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
