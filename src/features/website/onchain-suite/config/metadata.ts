import type { Metadata } from "next";

import { KEYWORDS, SITE_CONFIG_META } from "./site";

export function generateMetadata(): Metadata {
  return {
    title: {
      default: `${SITE_CONFIG_META.name} - Web3 Retention Automation & Communication Layer`,
      template: `%s · ${SITE_CONFIG_META.name}`,
    },
    description: SITE_CONFIG_META.description,
    keywords: KEYWORDS,
    applicationName: SITE_CONFIG_META.name,
    category: "technology",
    authors: [{ name: SITE_CONFIG_META.name }],
    creator: SITE_CONFIG_META.name,
    publisher: SITE_CONFIG_META.name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(SITE_CONFIG_META.url),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: `${SITE_CONFIG_META.name} - Web3 Retention Automation & Communication Layer`,
      description:
        "Turn on-chain behavior into automated, multi-channel messaging. Detect wallet activity, resolve identity with zero-knowledge privacy, and re-engage across in-app push, email, Telegram, and Discord. All native to Ethereum, Solana, Base, and Polygon.",
      url: SITE_CONFIG_META.url,
      siteName: SITE_CONFIG_META.name,
      images: [
        {
          url: SITE_CONFIG_META.ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE_CONFIG_META.name} - Web3 Marketing Platform`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_CONFIG_META.name} - Web3 Retention Automation`,
      description:
        "The communication infrastructure layer for Web3. When a wallet acts, your campaign fires, automatically, across every channel.",
      images: [SITE_CONFIG_META.twitterImage],
      creator: SITE_CONFIG_META.twitterHandle,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      google: "your-google-verification-code",
      yandex: "your-yandex-verification-code",
    },
  };
}
