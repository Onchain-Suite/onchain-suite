import type { Metadata } from "next";

import { SITE_CONFIG_META } from "./site";

const TITLE = `${SITE_CONFIG_META.name}: retention and CRM for blockchain companies`;

export function generateMetadata(): Metadata {
  return {
    title: {
      default: TITLE,
      template: `%s · ${SITE_CONFIG_META.name}`,
    },
    description: SITE_CONFIG_META.description,
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
      title: TITLE,
      description:
        "Win back the customers who stopped using your protocol. OnchainSuite reads wallet activity and sends email and in-app messages when someone goes quiet.",
      url: SITE_CONFIG_META.url,
      siteName: SITE_CONFIG_META.name,
      images: [
        {
          url: SITE_CONFIG_META.ogImage,
          width: 1200,
          height: 630,
          alt: TITLE,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_CONFIG_META.name}: retention for blockchain companies`,
      description:
        "When a wallet goes quiet, your win-back message sends. Email and in-app, triggered by what happens on the chain.",
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
  };
}
