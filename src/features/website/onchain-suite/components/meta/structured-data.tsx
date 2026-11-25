import { SITE_CONFIG } from "@/features/website/onchain-suite/config";
import {
  COMPANY,
  NAME,
  ONE_LINER,
  SAME_AS,
} from "@/onchain-suite-website/data/brand-facts";

/**
 * Site-wide JSON-LD, rendered in the root layout, so every fact here goes out
 * on every page. Keep it to what is true site-wide and matches /pricing:
 * - Prices come from PACKAGES in components/site/site-bundle.jsx (Launch $39,
 *   Growth $349 a month, USD).
 * - Channels: email and in-app only. Telegram is not live; X and Discord DMs
 *   arrive later. Do not list them until they ship.
 * - No FAQPage here. Google expects FAQ markup to match questions shown on the
 *   page, so a page that shows an FAQ emits its own (compare pages do, from
 *   c.faqs in site-bundle.jsx). The homepage shows no FAQ today.
 */
export function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_CONFIG.url}/#organization`,
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
        logo: {
          "@type": "ImageObject",
          url: SITE_CONFIG.logo,
        },
        // OnchainSuite is independent of Datum Labs (brand fact F10). That is
        // said once, on /about, and never in the site-wide description.
        legalName: NAME.legal,
        description: ONE_LINER,
        foundingDate: COMPANY.incorporatedIso,
        sameAs: SAME_AS,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_CONFIG.url}/#website`,
        url: SITE_CONFIG.url,
        name: SITE_CONFIG.name,
        description:
          "Retention software for blockchain companies: email and in-app messages triggered by what customers do in your app and on the chain.",
        publisher: {
          "@id": `${SITE_CONFIG.url}/#organization`,
        },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_CONFIG.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_CONFIG.url,
        offers: [
          {
            "@type": "Offer",
            name: "Launch",
            price: "39",
            priceCurrency: "USD",
            url: `${SITE_CONFIG.url}/pricing`,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "39",
              priceCurrency: "USD",
              unitText: "MONTH",
            },
          },
          {
            "@type": "Offer",
            name: "Growth",
            price: "349",
            priceCurrency: "USD",
            url: `${SITE_CONFIG.url}/pricing`,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "349",
              priceCurrency: "USD",
              unitText: "MONTH",
            },
          },
        ],
        description: SITE_CONFIG.description,
        featureList: [
          "Every wallet and email on one customer record",
          "Email and in-app messaging",
          "Loops: automations triggered by in-app and on-chain events",
          "Segments built from app and wallet activity",
          "Intelligence MCP: ask your app and contract data questions in plain English",
          "Works on Ethereum, Base, Arbitrum, Optimism, Polygon and Solana",
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}
