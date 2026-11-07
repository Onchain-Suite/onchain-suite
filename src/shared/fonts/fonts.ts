import localFont from "next/font/local";

/**
 * Every typeface the site and app use, self-hosted from ./files.
 *
 * These were `next/font/google`, which downloads the fonts from Google at BUILD
 * time. When that request hiccuped on a CI runner the loader crashed
 * ("Cannot read properties of null (reading '1')") and failed the whole build,
 * even though nothing had changed. Committing the files removes the network
 * from the build. Each file is Google's own latin variable woff2 for the same
 * weight range the google loader requested, and every CSS variable name is
 * unchanged, so the rendering is identical.
 *
 * To update a font, re-download its latin woff2 from fonts.googleapis.com
 * (`css2?family=<Name>:wght@<min>..<max>`) into ./files.
 */

// App design system (DESIGN.md §4): Instrument Sans for UI/prose, Geist Mono
// for data - metrics, wallet addresses, hashes, timestamps, code.
export const instrumentSans = localFont({
  src: "./files/instrument-sans.woff2",
  weight: "400 700",
  variable: "--font-instrument-sans",
  display: "swap",
});

export const geistMono = localFont({
  src: "./files/geist-mono.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
});

// Marketing landing - terminal design system (Inter / Outfit / JetBrains Mono).
export const inter = localFont({
  src: "./files/inter.woff2",
  weight: "300 600",
  variable: "--font-inter",
  display: "swap",
});

export const outfit = localFont({
  src: "./files/outfit.woff2",
  weight: "200 500",
  variable: "--font-outfit",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: "./files/jetbrains-mono.woff2",
  weight: "300 500",
  variable: "--font-jetbrains",
  display: "swap",
});

// Pen font for the retention playbook's hand-drawn layer (--font-hand).
export const caveat = localFont({
  src: "./files/caveat.woff2",
  weight: "400 600",
  variable: "--font-hand",
  display: "swap",
});
