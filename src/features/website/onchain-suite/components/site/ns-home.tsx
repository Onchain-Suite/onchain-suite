import { Inter, JetBrains_Mono } from "next/font/google";

import "./ns.css";
import { Home } from "./site-bundle";

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
 * Redesigned marketing home ("ns" design, Attio structure). The bundle self-
 * contains the chrome (nav + footer) under a `.ns` wrapper; ns.css is scoped to
 * `.ns` so it never touches the app or the legacy `.ocs2` landing. Phase 1 of
 * the site redesign - other pages follow in later PRs.
 */
export function NsHome() {
  return (
    <div className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <Home />
    </div>
  );
}

export default NsHome;
