import { Caveat } from "next/font/google";

/**
 * Pen font for the hand-drawn layer: diagram labels, margin notes and the
 * chapter circles. Self-hosted by next/font, applied as --font-hand on the
 * page root only.
 */
export const handFont = Caveat({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-hand",
  display: "swap",
});
