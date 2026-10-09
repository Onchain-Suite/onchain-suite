import { Geist_Mono, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./ns.css";
import { SiteChrome } from "./site-bundle";

// Brand + app typography (brand.md / design.md §4): Instrument Sans for prose,
// Geist Mono for data/code. Wired to the ns.css --font-* variables below.
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
 * Renders a redesigned ("ns") page body inside the bundle's own chrome
 * (SiteChrome = the navbar matching the live Vercel site - Resources dropdown +
 * Developers + Pricing, with the ocs-mark + wordmark logo - plus the dark footer
 * and the scroll/reveal motion). The font-variable classes on the wrapper
 * inherit into SiteChrome's `.ns` root, which maps them to `--sans`/`--mono`;
 * the `.ns` scope keeps the redesign styles off the app and legacy surfaces.
 */
export function NsShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${instrumentSans.variable} ${geistMono.variable}`}>
      <SiteChrome>{children}</SiteChrome>
    </div>
  );
}
