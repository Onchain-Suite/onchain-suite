/**
 * Single source of truth for OnchainSuite marketing copy.
 * Sourced from the OnchainSuite v2 Product Definition + Business Plan.
 * Keeping copy here keeps sections consistent and makes SEO edits one-stop.
 */

export const HERO = {
  badge: "Retention automation for Web3",
  title: "The communication infrastructure layer for Web3",
  subtitle:
    "OnchainSuite turns on-chain behavior into automated, multi-channel messaging. When a wallet deposits, swaps, mints, unstakes, or votes, your protocol responds automatically, in the right channel, within seconds.",
  primaryCta: { label: "Get early access", href: "#contact" },
  secondaryCta: { label: "See how it works", href: "#product" },
  stats: [
    { value: "<10 min", label: "First valuable cohort insight" },
    { value: "100%", label: "Of connected wallets reachable via in-app push" },
    { value: "4+ chains", label: "Ethereum · Solana · Base · Polygon" },
  ],
};

export const CHAINS = ["Ethereum", "Solana", "Base", "Polygon", "Optimism"];

export const PROBLEM = {
  eyebrow: "What we solve",
  title: "Web3 has a retention crisis, and your marketing stack is blind to it",
  description:
    "Brands spend millions acquiring users, then lose most of them within months. The root cause isn't product-market fit, it's a missing communication layer that can act on on-chain behavior.",
  stats: [
    { value: "Up to 60%", label: "DeFi user churn within 180 days" },
    { value: "25–35%", label: "Lending-protocol retention by month 3" },
    { value: "~6%", label: "Average day-30 retention across mobile apps" },
    {
      value: "Zero",
      label:
        "Ability to reach users after an on-chain action, with today's tools",
    },
  ],
};

/** Four product pillars. */
export const PILLARS = [
  {
    icon: "identity",
    title: "Wallet-first identity",
    body: "The wallet is the canonical user record. Email, ENS, and chat handles attach as optional channels, resolved lazily via privacy-preserving zero-knowledge methods. Value from minute one, no email match required.",
  },
  {
    icon: "channels",
    title: "Multi-channel activation",
    body: "One trigger and segment fan out to every channel a wallet is reachable on, in-app push, email, Telegram, and Discord, through shared delivery nodes. Add a channel without rebuilding a campaign.",
  },
  {
    icon: "plays",
    title: "Protocol Plays library",
    body: "Pre-built, fork-and-edit automations replace the blank canvas: First Deposit Welcome, Churn Win-Back, LP Unbonding Reminder, Whale Concierge and more, with pre-wired triggers, segments, and copy.",
  },
  {
    icon: "firstmile",
    title: "Sub-10-minute first-mile",
    body: "Connect your contract addresses and OnchainSuite auto-indexes 90 days of normalized events, then surfaces one valuable cohort insight before you build anything, predictive infrastructure, not just a dashboard.",
  },
];

/** The automated retention loop (product demo / how it works). */
export const LOOP_STEPS = [
  {
    step: "01",
    title: "Detect",
    body: "Capture any on-chain action in real time across supported chains.",
  },
  {
    step: "02",
    title: "Resolve",
    body: "Link the wallet to a verified identity with zero-knowledge privacy.",
  },
  {
    step: "03",
    title: "Segment",
    body: "Auto-cohort wallets: whales, churn-risk, dormant, new minters.",
  },
  {
    step: "04",
    title: "Activate",
    body: "Fire behavior-triggered campaigns across every reachable channel.",
  },
  {
    step: "05",
    title: "Measure",
    body: "Attribute revenue from on-chain event to open to re-engagement.",
  },
];

/** Competitive moat / details. */
export const MOAT = [
  {
    title: "Protocol Normalization System",
    body: "A proprietary cross-chain schema makes a 'liquidity deposit' look identical on Uniswap, Aave, or Aerodrome, so a marketer can think 'email everyone who removed liquidity this week' and just do it.",
  },
  {
    title: "Native multi-chain pipeline",
    body: "Real-time ingestion from Ethereum, Solana, Base, and Polygon through shared infrastructure, not brittle third-party aggregators or per-tool configuration.",
  },
  {
    title: "Privacy-by-design identity bridge",
    body: "Wallets are public; email, FID, and social handles stay bridged via zero-knowledge proofs. GDPR-compliant by architecture, opt-in by the user.",
  },
];

export const FAQS = [
  {
    q: "How is OnchainSuite different from Mailchimp or Klaviyo?",
    a: "Web2 tools have no idea what a wallet is. OnchainSuite is wallet-native: it detects on-chain behavior, resolves identity with zero-knowledge privacy, and triggers messaging automatically, replacing the Mailchimp + Privy + Dune + CSV patchwork with one real-time loop.",
  },
  {
    q: "Do my users need to share an email to be reachable?",
    a: "No. The wallet is the identity. In-app push reaches 100% of connected wallets with no extra identifier. Email, Telegram, and other channels are added lazily and only when available, a wallet with zero linked channels is still a valid contact.",
  },
  {
    q: "Which blockchains and protocols are supported?",
    a: "Ethereum, Solana, Base, and Polygon at launch, tracking protocols like Uniswap, Aave, Compound, Jupiter, Marinade, Aerodrome, and QuickSwap. The Protocol Normalization System standardizes events so they look the same across every chain and protocol.",
  },
  {
    q: "How fast can I see value?",
    a: "Under 10 minutes. Connect your contract addresses, OnchainSuite auto-indexes the last 90 days of normalized events, and an auto-generated cohort report appears before you build a single campaign.",
  },
  {
    q: "How do you handle privacy and GDPR?",
    a: "Wallet addresses are public and indexed directly. Personal identifiers (email, FID, social handles) are bridged via zero-knowledge proofs and stored off-chain in deletable storage, consent-gated, with a documented erasure workflow. GDPR-compliant by architecture.",
  },
  {
    q: "What does it cost?",
    a: "Usage-based pricing on tracked active wallets and monthly send credits, starting at $299/mo. You pay for what you use, with in-app push as the lowest-cost, highest-retention channel. See pricing below.",
  },
];

export const PRICING = {
  tiers: [
    {
      name: "Starter",
      price: "$299",
      cadence: "/mo",
      tagline: "Ship your first retention plays.",
      features: [
        "5,000 tracked wallets",
        "50,000 sends / mo",
        "1 chain",
        "Email + in-app push",
        "Starter Protocol Plays",
      ],
      cta: "Start",
      featured: false,
    },
    {
      name: "Growth",
      price: "$999",
      cadence: "/mo",
      tagline: "Scale multi-channel across chains.",
      features: [
        "25,000 tracked wallets",
        "250,000 sends / mo",
        "3 chains",
        "All channels except SMS",
        "Advanced Plays + peer benchmarks",
      ],
      cta: "Start",
      featured: true,
    },
    {
      name: "Scale",
      price: "$2,999",
      cadence: "/mo",
      tagline: "Every chain, every channel, white-glove.",
      features: [
        "100,000+ tracked wallets",
        "All chains",
        "All channels incl. SMS",
        "White-glove onboarding",
        "Revenue attribution suite",
      ],
      cta: "Talk to sales",
      featured: false,
    },
    {
      name: "Enterprise",
      price: "Custom",
      cadence: "",
      tagline: "On-prem PNS and dedicated SLAs.",
      features: [
        "Unlimited wallets",
        "On-prem Protocol Normalization",
        "Dedicated SLAs",
        "Custom integrations",
        "Priority support",
      ],
      cta: "Contact us",
      featured: false,
    },
  ],
};

export const TESTIMONIALS = [
  {
    quote:
      "If you don't speak when the user acts, a competitor will. OnchainSuite gives us the timing, context, and channel to win that moment, without airdropping just to stay visible.",
    name: "Web3 Growth Marketer",
    role: "DeFi protocol",
  },
  {
    quote:
      "We replaced four disconnected tools and the manual glue between them with one automated loop. A win-back flow that used to take weeks now ships in minutes.",
    name: "Head of Growth",
    role: "Lending protocol",
  },
  {
    quote:
      "The sub-10-minute cohort insight is the demo. Seeing '142 dormant LPs, median deposit $4.2k, 38 also active on Aave' on our own users, before building anything, closed it.",
    name: "Protocol Operator",
    role: "DEX",
  },
];

export const POSTS = [
  {
    title: "Why Web3's retention crisis is an infrastructure problem",
    excerpt:
      "Lending cohorts retain 25–35% by month three, DEXs 15–25%. The fix isn't louder ads - it's a communication layer that can act on on-chain behavior.",
    tag: "Retention",
    readTime: "6 min read",
  },
  {
    title: "Wallet-first identity: email is one channel, not a prerequisite",
    excerpt:
      "Treating the wallet as the canonical record removes the biggest source of onboarding friction and unlocks in-app push to 100% of connected wallets.",
    tag: "Product",
    readTime: "5 min read",
  },
  {
    title: "Case study: turning dormant LPs into re-engaged depositors",
    excerpt:
      "How a Base-native protocol used the Churn Win-Back Play to reach near-churn wallets the moment they crossed the 30-day inactivity threshold.",
    tag: "Case study",
    readTime: "4 min read",
  },
];
