import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";

import "@/styles/globals.css";
import { StructuredData } from "@/onchain-suite-website/components";
import { generateMetadata } from "@/onchain-suite-website/config";
import { ClarityAnalytics } from "@/shared/components/clarity-analytics";
import { DatabuddyAnalytics } from "@/shared/components/databuddy-analytics";
import {
  geistMono,
  instrumentSans,
  inter,
  jetbrainsMono,
  outfit,
} from "@/shared/fonts/fonts";
import { RootProviders } from "@/shared/providers";

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
        <ClarityAnalytics />
        <DatabuddyAnalytics />
      </body>
    </html>
  );
}
