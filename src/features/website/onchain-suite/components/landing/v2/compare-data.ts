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

export interface FaqItem {
  q: string;
  a: string;
}

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

/** Per-competitor FAQ, keyed by slug (crawled from the demo). */
export const COMPARISON_FAQS: Record<string, FaqItem[]> = {
  "customer-io": [
    {
      q: "Does Customer.io read wallet data?",
      a: "No. It fires on events you send it. On-chain activity would be yours to capture and forward; OnchainSuite does that for you.",
    },
    {
      q: "Is OnchainSuite as flexible?",
      a: "For on-chain retention, yes, with wallet identity and prebuilt Plays. Customer.io stays broader for generic Web2 lifecycle messaging.",
    },
    {
      q: "Can I message wallets with no email?",
      a: "Yes, by in-app push. Customer.io needs a known Web2 identifier and channel.",
    },
    {
      q: "How long is setup?",
      a: "Add the SDK and you are live in minutes. Chains are read into triggers automatically.",
    },
  ],
  braze: [
    {
      q: "Can Braze message wallets?",
      a: "Not on its own. Braze targets known users on channels tied to Web2 identifiers. OnchainSuite reaches wallets directly with in-app push.",
    },
    {
      q: "Is OnchainSuite cheaper?",
      a: "Usually. Suite starts at $0 (PAYG) or $27 a month on Launch, with no enterprise minimum, versus Braze's contact-sales model.",
    },
    {
      q: "Does it scale for large protocols?",
      a: "Yes. Pricing scales with tracked wallets and subscribers, and the largest volumes move to custom.",
    },
    {
      q: "How is on-chain data handled?",
      a: "We read cross-chain activity into clean events and segments, so you skip the data engineering.",
    },
  ],
  dotdigital: [
    {
      q: "Does Dotdigital support wallets or crypto?",
      a: "No. It has no blockchain source and no wallet-native channel.",
    },
    {
      q: "Why pick OnchainSuite?",
      a: "Because your key moments are on-chain and your audience is wallets, neither of which Dotdigital can reach.",
    },
    {
      q: "Can OnchainSuite send email too?",
      a: "Yes, to wallets that opt in, alongside in-app push for those without one.",
    },
    {
      q: "Is migration hard?",
      a: "No. You add an SDK and we read your chains. There is no pipeline to build.",
    },
  ],
  emailoctopus: [
    {
      q: "Can EmailOctopus trigger on behaviour?",
      a: "Only basic list automations. There is no product-event or on-chain triggering.",
    },
    {
      q: "Is OnchainSuite overkill next to it?",
      a: "If you only send newsletters, EmailOctopus is fine. If you want to retain wallets on on-chain behaviour, the two are not comparable.",
    },
    {
      q: "Does it cost a lot more?",
      a: "Suite starts at $0 (PAYG) or $27 a month, more than a newsletter tool because it does far more. For email only, Send is $6 a month plus $2.60 per 1,000 subscribers.",
    },
  ],
  sendgrid: [
    {
      q: "Is SendGrid a competitor?",
      a: "Only on the delivery slice. OnchainSuite can sit on top of it and adds the triggers, segments, and in-app push SendGrid does not do.",
    },
    {
      q: "Can I use SendGrid with OnchainSuite?",
      a: "Yes. SendGrid can be the delivery layer while OnchainSuite drives the logic.",
    },
    {
      q: "Does OnchainSuite handle deliverability?",
      a: "We send to opted-in wallets. Teams with strict deliverability needs can pair us with their provider.",
    },
  ],
  brevo: [
    {
      q: "Does Brevo work for Web3?",
      a: "Only as a generic email and SMS tool. It cannot see or act on on-chain behaviour.",
    },
    {
      q: "Why choose OnchainSuite?",
      a: "Because your customers are wallets and your triggers are on-chain, neither of which Brevo supports.",
    },
    {
      q: "Can it fully replace Brevo?",
      a: "For Web3 retention, yes. If you also need generic SMS marketing, keep a tool like Brevo alongside.",
    },
  ],
  formo: [
    {
      q: "Is Formo a direct competitor?",
      a: "They overlap on onchain data, but Formo leans analytics and OnchainSuite leans messaging. They fit together well.",
    },
    {
      q: "Can Formo message wallets?",
      a: "No. Formo is analytics. OnchainSuite provides the in-app push and email that acts on the insight.",
    },
    {
      q: "Should we run both?",
      a: "Often yes. Formo for insight, OnchainSuite to act on it.",
    },
    {
      q: "Does OnchainSuite have analytics?",
      a: "Basic dashboards for retention and campaigns. Deep product analytics is Formo's strength.",
    },
  ],
  addressable: [
    {
      q: "Which do I need?",
      a: "Different halves of the funnel. Addressable acquires wallets through ads; OnchainSuite retains and re-engages them.",
    },
    {
      q: "Does Addressable send retention messages?",
      a: "No. It handles acquisition and attribution. OnchainSuite owns owned-channel retention.",
    },
    {
      q: "Can they work together?",
      a: "Yes. Acquire with Addressable, retain with OnchainSuite.",
    },
  ],
  galxe: [
    {
      q: "Can I use both?",
      a: "Yes. Run quests on Galxe and let OnchainSuite retain those wallets automatically.",
    },
    {
      q: "Is Galxe a retention tool?",
      a: "It drives campaign engagement. OnchainSuite provides the always-on retention between campaigns.",
    },
    {
      q: "Does OnchainSuite run quests?",
      a: "No. It focuses on behaviour-triggered messaging. Pair it with a quest platform like Galxe.",
    },
  ],
};

/** Closing CTA shared across comparison pages. */
export const COMPARE_CTA = {
  title: "Start acting on what your users do on-chain.",
  body: "Write your first rule today. It fires the moment a wallet acts, day or night, until you pause it.",
  note: "Suite from $0 · Send email-only · founding rates for early teams",
};

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

/* ---------------------------------------------------------------------------
   /compare index page (crawled 1:1 from the demo). Each card carries its own
   category eyebrow, badge, filter group and short blurb. The filter tabs match
   a card's `group` exactly - some cards (Customer.io, SendGrid, Brevo) sit in
   groups with no tab, so they only appear under "All", matching the demo.
   ------------------------------------------------------------------------- */

export interface CompareCard {
  slug: string;
  name: string;
  /** Small category eyebrow above the title. */
  category: string;
  /** Corner badge (Head to head / Enterprise / Budget / Infrastructure / …). */
  badge: string;
  /** Filter group; the tab bar shows a card when the active tab === group. */
  group: string;
  /** One-line card description. */
  blurb: string;
}

export const COMPARE_CARDS: CompareCard[] = [
  {
    slug: "customer-io",
    name: "Customer.io",
    category: "Lifecycle messaging",
    badge: "Head to head",
    group: "Lifecycle messaging",
    blurb:
      "Strong event-driven messaging for web2 apps. We compare its event pipeline against native wallet triggers.",
  },
  {
    slug: "braze",
    name: "Braze",
    category: "Enterprise CRM",
    badge: "Enterprise",
    group: "Enterprise",
    blurb:
      "Enterprise scale and price. Where Braze needs a data team to see onchain behaviour, we index it for you.",
  },
  {
    slug: "dotdigital",
    name: "Dotdigital",
    category: "Email marketing",
    badge: "Head to head",
    group: "Email marketing",
    blurb:
      "Mature ecommerce email suite. The gap shows the moment your audience is a wallet, not a customer record.",
  },
  {
    slug: "emailoctopus",
    name: "EmailOctopus",
    category: "Email marketing",
    badge: "Budget",
    group: "Email marketing",
    blurb:
      "Cheap broadcast email. Fine for a newsletter, no segmentation on anything that happens onchain.",
  },
  {
    slug: "sendgrid",
    name: "SendGrid",
    category: "Email infrastructure",
    badge: "Infrastructure",
    group: "Email infrastructure",
    blurb:
      "A delivery API, not a marketing platform. Many teams keep it underneath us rather than instead of us.",
  },
  {
    slug: "brevo",
    name: "Brevo",
    category: "SMB suite",
    badge: "Budget",
    group: "SMB suite",
    blurb:
      "Email, SMS and chat in one SMB bundle. We compare its automation ceiling with onchain automations.",
  },
  {
    slug: "formo",
    name: "Formo",
    category: "Web3 analytics",
    badge: "Web3 native",
    group: "Web3 native",
    blurb:
      "Onchain product analytics with forms. Strong at measurement, thinner once you need to act on a segment.",
  },
  {
    slug: "addressable",
    name: "Addressable",
    category: "Web3 growth",
    badge: "Web3 native",
    group: "Web3 native",
    blurb:
      "Wallet-to-social targeting for paid acquisition. Different job: they buy attention, we own the relationship.",
  },
  {
    slug: "galxe",
    name: "Galxe",
    category: "Quests and rewards",
    badge: "Web3 native",
    group: "Web3 native",
    blurb:
      "Quests, credentials and campaigns. We compare one-off incentive spikes against retained, messaged users.",
  },
];

/** Competitor logos, keyed by slug (Cloudinary). Used on compare cards + pages. */
export const COMPARE_LOGOS: Record<string, string> = {
  braze:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787608717/Braze_idbqGpQ8ss_1_kumqcl.png",
  brevo:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787608705/Brevo_idgQGSgZ6E_1_slz5hz.png",
  "customer-io":
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787608696/Customer-io_Logo_1_ircnlc.png",
  emailoctopus:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787608681/logo-land-purple_hvs0gj.png",
  dotdigital:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787608680/DD_logo_close_crop_DD_Full_colourclose_crop_osfnls.png",
  addressable:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787608681/idYzvVdO_4_logos_vxelrw.jpg",
  galxe:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787608680/idiXUsqDvE_logos_cvpwju.jpg",
  formo:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787608681/idoG7Dz5FO_logos_pfrvcm.png",
  sendgrid:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1787608666/twilio-sendgrid-seeklogo_zoxlif.png",
};

/** Competitor brand colours (monogram tile) for the "More comparisons" cards. */
export const COMPARE_BRAND: Record<string, string> = {
  "customer-io": "#6c5ce7",
  braze: "#8236f5",
  dotdigital: "#00b2a9",
  emailoctopus: "#1e6fd9",
  sendgrid: "#1a82e2",
  brevo: "#0b996e",
  addressable: "#e5326e",
  galxe: "#16182b",
  formo: "#10b981",
};

/** Filter tabs on the /compare index (a subset of the card groups + All). */
export const COMPARE_FILTERS = [
  "All",
  "Email marketing",
  "Web3 native",
  "Enterprise",
] as const;

export const COMPARE_INDEX = {
  eyebrow: "Compare",
  title: "Every tool your team already considered.",
  sub: "Honest, current comparisons between OnchainSuite and the email platforms, web3 CRMs and airdrop tools teams evaluate alongside us. We name the cases where the other one wins.",
  meta: [
    "9 comparisons",
    "Updated April 2026",
    "Pricing verified from public pages",
  ],
};

/** "At a glance" table - the four questions that decide most evaluations. */
export const AT_A_GLANCE = {
  title: "At a glance",
  sub: "The four questions that decide most evaluations.",
  cols: [
    "Platform",
    "Wallet triggers",
    "Identity resolution",
    "Email + push",
    "Entry price",
  ],
  rows: [
    [
      "OnchainSuite",
      "Native",
      "Wallet + email + push",
      "Both",
      "$0 to 5k wallets",
    ],
    ["Customer.io", "Via custom events", "Email only", "Both", "$100/mo"],
    ["Braze", "Via data team", "Email only", "Both", "Quote only"],
    ["Dotdigital", "None", "Email only", "Email", "$150/mo"],
    ["Formo", "Read-only", "Wallet only", "Neither", "$0 to 10k events"],
    ["Galxe", "Quest-based", "Wallet only", "Neither", "Rev share"],
  ] as string[][],
  note: "Sourced from public pricing and documentation, April 2026. Tell us if something here is out of date and we will correct it.",
};

export const COMPARE_INDEX_CTA = {
  title: "Still comparing? Bring your stack.",
  body: "Send us the tools you run today. We will map what stays, what OnchainSuite replaces, and what migration actually costs you in a 30-minute session.",
};
