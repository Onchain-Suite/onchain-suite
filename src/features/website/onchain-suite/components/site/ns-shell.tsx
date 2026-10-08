import { Geist_Mono, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./ns.css";
import SiteHeader from "./real-nav/site-header";
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
 * Renders a redesigned ("ns") page body with the REAL marketing navbar
 * (`SiteHeader`, ported from onchainsuite-marketing) above the bundle's own
 * chrome. SiteChrome runs `headerless` so its built-in navbar is skipped; it
 * still provides the Sprite, dark footer and the scroll/reveal motion. SiteHeader
 * sits OUTSIDE `.ns` so its Tailwind/inline styles never collide with the
 * `.ns`-scoped redesign CSS. The font-variable classes on the wrapper feed both:
 * SiteHeader reads them directly, and they inherit into SiteChrome's `.ns` root.
 */
export function NsShell({ children }: { children: ReactNode }) {
  return (
    // The real SiteHeader renders outside `.ns`, so it would otherwise sit on
    // the app's dark-mode <body>; give the marketing surface its own light
    // background + colour-scheme so the translucent navbar blends correctly and
    // the page is isolated from the app theme.
    <div
      className={`${instrumentSans.variable} ${geistMono.variable}`}
      style={{
        background: "#FAFAF8",
        colorScheme: "light",
        minHeight: "100vh",
      }}
    >
      <SiteHeader />
      <SiteChrome headerless>{children}</SiteChrome>
    </div>
  );
}
