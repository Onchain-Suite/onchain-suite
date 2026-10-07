import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "./ns.css";
import { PageShell } from "../landing/v2/shared";

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
 * Renders a redesigned ("ns") page body inside the retained legacy chrome
 * (PageShell = the existing Nav + Footer). The redesign styles are scoped to the
 * `.ns` wrapper so they never touch the app or the legacy `.ocs2` surfaces, and
 * Inter + JetBrains Mono are wired to the ns font variables via next/font.
 */
export function NsShell({ children }: { children: ReactNode }) {
  return (
    <PageShell>
      <div className={`ns ${inter.variable} ${jetbrainsMono.variable}`}>
        {children}
      </div>
    </PageShell>
  );
}
