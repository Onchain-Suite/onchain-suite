import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "./ns.css";
import { SiteChrome } from "./site-bundle";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/**
 * Renders a redesigned ("ns") page body inside the redesign's own chrome
 * (SiteChrome = the new navbar + announcement bar + dark footer + the
 * scroll/reveal + nav is-dark motion), matching the live marketing site. The
 * font-variable classes sit on a wrapper and the custom properties inherit into
 * SiteChrome's `.ns` root, which maps them to `--sans`/`--mono`. The `.ns` scope
 * keeps the redesign styles off the app and the legacy `.ocs2` surfaces.
 */
export function NsShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <SiteChrome>{children}</SiteChrome>
    </div>
  );
}
