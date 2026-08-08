import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import {
  Geist_Mono,
  Instrument_Sans,
  Inter,
  JetBrains_Mono,
  Outfit,
} from "next/font/google";

import "@/styles/globals.css";
import { StructuredData } from "@/onchain-suite-website/components";
import { generateMetadata } from "@/onchain-suite-website/config";
import { RootProviders } from "@/shared/providers";

// App design system (DESIGN.md §4): Instrument Sans for UI/prose, Geist Mono
// for data - metrics, wallet addresses, hashes, timestamps, code.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Marketing landing - terminal design system (Inter / Outfit / JetBrains Mono)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = generateMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The font variables live on <html> so `:root` in globals.css can resolve
  // them (--font-sans/--font-mono reference them; a custom property is
  // substituted on the element that declares it, not on descendants).
  return (
    <html
      lang="en"
      className={`scroll-smooth ${instrumentSans.variable} ${geistMono.variable} ${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <StructuredData />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <RootProviders>{children}</RootProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
