/* Server-safe compare metadata (slug, name, intro) for the redesigned compare
   pages, extracted from the site-bundle's COMPETITORS. Used by the [slug] route's
   generateStaticParams + generateMetadata without importing the client bundle. */

export interface CompareMeta {
  slug: string;
  name: string;
  intro: string;
}

export const COMPARE_META: CompareMeta[] = [
  {
    slug: "klaviyo",
    name: "Klaviyo",
    intro:
      "Klaviyo runs email and SMS for ecommerce brands, keyed to store events like orders and carts. OnchainSuite does that same job for blockchain companies, only the triggers come from the chain and the audience is wallets. When one deposits, unstakes, or goes quiet, you reach it by in-app push or email, even if it never gave you an address.",
  },
  {
    slug: "customer-io",
    name: "Customer.io",
    intro:
      "Customer.io automates email, push, and in-app messages off product events your app sends it. OnchainSuite works the same way for wallets, but it reads the events straight from the chain, so nobody has to build a pipeline first.",
  },
  {
    slug: "braze",
    name: "Braze",
    intro:
      "Braze runs cross-channel messaging for large consumer apps. OnchainSuite brings that always-on model to blockchain companies, built around wallets and on-chain behaviour instead of Web2 profiles, and it does not need a data engineering project to start.",
  },
  {
    slug: "dotdigital",
    name: "Dotdigital",
    intro:
      "Dotdigital is a cross-channel email and automation suite for ecommerce and B2B teams. OnchainSuite covers the same retention job for blockchain companies, driven by what wallets do on-chain and delivered to wallets rather than mailing-list contacts.",
  },
  {
    slug: "emailoctopus",
    name: "EmailOctopus",
    intro:
      "EmailOctopus is a cheap, simple email tool built on Amazon SES. OnchainSuite sits in a different category, a retention platform for blockchain companies, but teams often weigh a basic email tool against doing retention properly.",
  },
  {
    slug: "sendgrid",
    name: "SendGrid",
    intro:
      "Twilio SendGrid is email infrastructure: an API that delivers transactional and marketing mail. OnchainSuite decides who to message and when based on on-chain behaviour, and SendGrid can even be the layer that delivers it.",
  },
  {
    slug: "brevo",
    name: "Brevo",
    intro:
      "Brevo, once Sendinblue, bundles email, SMS, and a light CRM for small businesses. OnchainSuite handles retention for blockchain companies whose customers are wallets and whose triggers live on-chain.",
  },
  {
    slug: "formo",
    name: "Formo",
    intro:
      "Formo is crypto-native product analytics: funnels, cohort retention, and wallet-level profiling for onchain apps. OnchainSuite is the layer that acts on all of it, turning the same behaviour into automated in-app and email campaigns.",
  },
  {
    slug: "addressable",
    name: "Addressable",
    intro:
      "Addressable helps blockchain companies target ads and attribute acquisition by matching wallets to Web2 identities. OnchainSuite works the other half of the funnel, keeping and re-activating the users you already have.",
  },
  {
    slug: "galxe",
    name: "Galxe",
    intro:
      "Galxe runs quests, campaigns, loyalty, and on-chain credentials for blockchain communities. OnchainSuite is the always-on layer beneath the campaigns, reacting to real wallet behaviour between them.",
  },
];

export const COMPARE_SLUGS = COMPARE_META.map((c) => c.slug);

export const COMPARE_BY_SLUG: Record<string, CompareMeta> = Object.fromEntries(
  COMPARE_META.map((c) => [c.slug, c])
);
