/**
 * Competitor comparison content, crawled 1:1 from the marketing demo
 * (onchainsuite-marketing /compare/<slug>). The feature-table rows and the
 * OnchainSuite column are constant across every competitor; only the
 * competitor column and the prose differ, so we store the shared rows once and
 * one aligned `comp[]` per brand.
 */

/** The 14 capability rows + OnchainSuite's (constant) answer, in table order. */
export const CAPABILITIES: { label: string; ocs: string }[] = [
  { label: "Pricing", ocs: "4 tiers, $0–$1,622/mo" },
  { label: "On-chain behaviour triggers", ocs: "Yes" },
  { label: "Wallet-native identity (no email)", ocs: "Yes" },
  { label: "In-app push to wallets", ocs: "Yes" },
  { label: "Email campaigns", ocs: "Yes" },
  { label: "Segment on on-chain activity", ocs: "Yes" },
  { label: "Cross-chain (ETH / SOL / Base / Polygon)", ocs: "Yes" },
  { label: "Retention automations & journeys", ocs: "Yes" },
  { label: "Telegram / Discord", ocs: "Roadmap" },
  { label: "SMS", ocs: "No" },
  { label: "Ads / acquisition attribution", ocs: "No" },
  { label: "Analytics / dashboards", ocs: "Basic" },
  { label: "SDK / API", ocs: "Yes" },
  { label: "Built for Web3", ocs: "Yes" },
];

/** OnchainSuite's own strengths - shared across every comparison. */
export const WHY_CARDS: { title: string; body: string }[] = [
  {
    title: "Triggers on-chain",
    body: "A rule fires the moment a wallet deposits, unstakes, or goes quiet. No manual event wiring.",
  },
  {
    title: "Reaches wallets",
    body: "In-app push needs only the address, so wallets with no email still hear from you. Email covers the rest.",
  },
  {
    title: "Plays, not projects",
    body: "Fork a win-back, onboarding, or whale-watch flow and ship it the same afternoon.",
  },
];

/** The shared "switching over" steps. */
export const SWITCH_STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Drop in the SDK",
    body: "Create a workspace and add the SDK. You are live in minutes.",
  },
  {
    n: "02",
    title: "We read the chains",
    body: "Activity across Ethereum, Solana, Base, and Polygon comes back as clean triggers and segments.",
  },
  {
    n: "03",
    title: "Turn on a Play",
    body: "Fork a flow or write a rule. It runs on its own, across in-app push and email.",
  },
];

export interface Comparison {
  slug: string;
  name: string;
  eyebrow: string;
  intro: string;
  whyBody: string;
  /** Competitor column, aligned to {@link CAPABILITIES} order (14 entries). */
  comp: string[];
  strengths: string[];
  betterCall: string;
  runningBoth: string;
}

export const COMPARISONS: Record<string, Comparison> = {
  "customer-io": {
    slug: "customer-io",
    name: "Customer.io",
    eyebrow: "Compare · Messaging automation",
    intro:
      "Customer.io automates email, push, and in-app messages off product events your app sends it. OnchainSuite works the same way for wallets, but it reads the events straight from the chain, so nobody has to build a pipeline first.",
    whyBody:
      "Customer.io is strong at event-driven messaging, but the events come from your app through its SDK. There is no wallet identity and no chain data underneath. OnchainSuite captures on-chain activity for you and lets you message wallets directly.",
    comp: [
      "From ~$100/mo",
      "No",
      "No",
      "Yes",
      "Yes",
      "Web2 events",
      "No",
      "Yes",
      "No",
      "Yes",
      "No",
      "Basic",
      "Yes",
      "No",
    ],
    strengths: [
      "Flexible visual workflows",
      "A first-class developer and API experience",
      "Email, push, in-app, and SMS in one place",
      "Solid data and deliverability controls",
    ],
    betterCall:
      "You run a Web2 app and already pipe first-party product events into a messaging tool.",
    runningBoth:
      "If you are standardised on Customer.io, forward on-chain events into it. Or let OnchainSuite own the wallet-native side end to end.",
  },
  braze: {
    slug: "braze",
    name: "Braze",
    eyebrow: "Compare · Enterprise engagement",
    intro:
      "Braze runs cross-channel messaging for large consumer apps. OnchainSuite brings that always-on model to Web3, built around wallets and on-chain behaviour instead of Web2 profiles, and it stands up in an afternoon rather than a quarter.",
    whyBody:
      "Braze is powerful, but it is organised around Web2 identity and app SDKs. It has no wallet identity and no chain triggers. OnchainSuite gives protocol teams the same orchestration on an on-chain foundation, at a fraction of the setup.",
    comp: [
      "Contact sales",
      "No",
      "No",
      "Yes",
      "Yes",
      "Web2 profiles",
      "No",
      "Yes",
      "Partial",
      "Yes",
      "No",
      "Yes",
      "Yes",
      "No",
    ],
    strengths: [
      "Orchestration that scales to millions",
      "Rich cross-channel journeys",
      "Strong analytics and experimentation",
      "A mature integrations ecosystem",
    ],
    betterCall:
      "You are a large consumer app with a Web2 identity graph that needs enterprise governance and scale.",
    runningBoth:
      "Big orgs can run Braze for Web2 channels and OnchainSuite for the wallet-native, on-chain-triggered layer.",
  },
  dotdigital: {
    slug: "dotdigital",
    name: "Dotdigital",
    eyebrow: "Compare · Email marketing",
    intro:
      "Dotdigital is a cross-channel email and automation suite for ecommerce and B2B teams. OnchainSuite covers the same retention job for Web3, driven by what wallets do on-chain and delivered to wallets rather than mailing-list contacts.",
    whyBody:
      "Dotdigital is a capable marketing suite, but it is entirely Web2. There is no wallet identity and no on-chain trigger. OnchainSuite is built to act on wallet behaviour Dotdigital cannot see.",
    comp: [
      "From ~£150/mo",
      "No",
      "No",
      "Limited",
      "Yes",
      "Web2 lists",
      "No",
      "Yes",
      "No",
      "Yes",
      "No",
      "Yes",
      "Yes",
      "No",
    ],
    strengths: [
      "Solid email and cross-channel automation",
      "Ecommerce and CRM integrations",
      "Good deliverability tooling",
      "Established support and services",
    ],
    betterCall: "You need a mature email suite for a Web2 audience.",
    runningBoth:
      "Run Dotdigital for existing Web2 email and OnchainSuite for wallet-native, on-chain retention.",
  },
  emailoctopus: {
    slug: "emailoctopus",
    name: "EmailOctopus",
    eyebrow: "Compare · Simple email",
    intro:
      "EmailOctopus is a cheap, simple email tool built on Amazon SES. OnchainSuite sits in a different category, a retention platform for Web3, but teams often weigh a basic email tool against doing retention properly.",
    whyBody:
      "EmailOctopus sends broadcasts and light automations. There is no event pipeline, no wallet identity, and no sense of what happens on-chain. If retention past the newsletter matters, OnchainSuite is the better fit.",
    comp: [
      "Free / from ~$9/mo",
      "No",
      "No",
      "No",
      "Yes",
      "List-based",
      "No",
      "Basic",
      "No",
      "No",
      "No",
      "Basic",
      "Limited",
      "No",
    ],
    strengths: [
      "Very affordable",
      "Simple and quick to use",
      "Good for newsletters",
      "A clean, no-frills UI",
    ],
    betterCall: "You just need cheap newsletters to a list.",
    runningBoth:
      "Keep EmailOctopus for basic sends and add OnchainSuite when you want on-chain-triggered retention.",
  },
  sendgrid: {
    slug: "sendgrid",
    name: "SendGrid",
    eyebrow: "Compare · Email API / delivery",
    intro:
      "Twilio SendGrid is email infrastructure: an API that delivers transactional and marketing mail. OnchainSuite decides who to message and when based on on-chain behaviour, and SendGrid can even be the layer that delivers it.",
    whyBody:
      "SendGrid delivers the emails you hand it. It is not a retention engine and has no wallet or chain layer. OnchainSuite supplies the triggers, segments, and in-app push it does not.",
    comp: [
      "Free / usage-based",
      "No",
      "No",
      "No",
      "Delivery layer",
      "Limited",
      "No",
      "Basic",
      "No",
      "Via Twilio",
      "No",
      "Deliverability",
      "Yes",
      "No",
    ],
    strengths: [
      "Reliable delivery at scale",
      "A strong developer API",
      "Good deliverability tooling",
      "Transactional and marketing email",
    ],
    betterCall:
      "You want raw sending infrastructure and will build the retention logic yourself.",
    runningBoth:
      "A good pairing. OnchainSuite owns the on-chain triggers, segments, and in-app push; SendGrid handles delivery.",
  },
  brevo: {
    slug: "brevo",
    name: "Brevo",
    eyebrow: "Compare · SMB marketing CRM",
    intro:
      "Brevo, once Sendinblue, bundles email, SMS, and a light CRM for small businesses. OnchainSuite handles retention for Web3 teams whose customers are wallets and whose triggers live on-chain.",
    whyBody:
      "Brevo is a generic Web2 email and SMS tool. It has no wallet identity and no on-chain events. OnchainSuite acts on wallet behaviour Brevo cannot see.",
    comp: [
      "Free / from ~$9/mo",
      "No",
      "No",
      "Limited",
      "Yes",
      "Web2 CRM",
      "No",
      "Yes",
      "No",
      "Yes",
      "No",
      "Basic",
      "Yes",
      "No",
    ],
    strengths: [
      "An affordable all-in-one",
      "Email, SMS, and a basic CRM",
      "Easy for small teams",
      "A generous free tier",
    ],
    betterCall:
      "You are an SMB wanting email, SMS, and a light CRM in one cheap tool.",
    runningBoth:
      "Use Brevo for generic email and SMS, and OnchainSuite for on-chain wallet retention.",
  },
  formo: {
    slug: "formo",
    name: "Formo",
    eyebrow: "Compare · Onchain analytics",
    intro:
      "Formo is crypto-native product analytics: funnels, cohort retention, and wallet-level profiling for onchain apps. OnchainSuite is the layer that acts on all of it, turning the same behaviour into automated in-app and email campaigns.",
    whyBody:
      "Formo is excellent at telling you what wallets did. It is measurement, though, not messaging. OnchainSuite detects the behaviour and does something about it, automatically.",
    comp: [
      "Free / $199 / $499",
      "Analytics",
      "Yes",
      "No",
      "No",
      "Yes",
      "Yes",
      "No",
      "No",
      "No",
      "Attribution",
      "Yes",
      "Yes",
      "Yes",
    ],
    strengths: [
      "Excellent onchain product analytics",
      "Wallet intelligence and profiles",
      "Offchain to onchain funnels",
      "SQL and natural-language querying",
    ],
    betterCall:
      "Your main need is onchain analytics, funnels, and wallet intelligence.",
    runningBoth:
      "A natural pair. Use Formo to understand behaviour and OnchainSuite to act on it. Plenty of teams run both.",
  },
  addressable: {
    slug: "addressable",
    name: "Addressable",
    eyebrow: "Compare · Web3 growth / ads",
    intro:
      "Addressable helps Web3 teams target ads and attribute acquisition by matching wallets to Web2 identities. OnchainSuite works the other half of the funnel, keeping and re-activating the users you already have.",
    whyBody:
      "Addressable is about finding and targeting new wallets through ads. OnchainSuite is about retaining and re-engaging existing ones through owned in-app and email channels triggered by on-chain behaviour.",
    comp: [
      "Contact sales",
      "Ads / signals",
      "Yes",
      "No",
      "No",
      "Audiences",
      "Yes",
      "No",
      "No",
      "No",
      "Yes",
      "Attribution",
      "Yes",
      "Yes",
    ],
    strengths: [
      "Wallet-based ad targeting",
      "Cross-channel acquisition attribution",
      "Campaign measurement for crypto",
      "A good fit for paid growth teams",
    ],
    betterCall:
      "Your priority is paid acquisition and tying ad spend to on-chain outcomes.",
    runningBoth:
      "Acquire wallets with Addressable, then retain and re-engage them with OnchainSuite. Two halves of one funnel.",
  },
  galxe: {
    slug: "galxe",
    name: "Galxe",
    eyebrow: "Compare · Quests & credentials",
    intro:
      "Galxe runs quests, campaigns, loyalty, and on-chain credentials for Web3 communities. OnchainSuite is the always-on layer beneath the campaigns, reacting to real wallet behaviour between them.",
    whyBody:
      "Galxe drives engagement through quests, which are moments. OnchainSuite runs continuously in the background, reacting to what wallets actually do and keeping them warm between campaigns.",
    comp: [
      "Free / campaign-based",
      "Quests",
      "Yes",
      "No",
      "No",
      "Credentials",
      "Yes",
      "Campaigns",
      "Limited",
      "No",
      "No",
      "Campaign",
      "Yes",
      "Yes",
    ],
    strengths: [
      "A large quest and campaign ecosystem",
      "On-chain credentials and loyalty",
      "Strong distribution and reach",
      "A good fit for token and community launches",
    ],
    betterCall:
      "You want to run quests, airdrops, and credential-based loyalty.",
    runningBoth:
      "Run quests on Galxe, then let OnchainSuite retain and re-engage those wallets based on what they do next.",
  },
};

export const COMPARISON_SLUGS = Object.keys(COMPARISONS);
