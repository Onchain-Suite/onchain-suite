/**
 * Copy for /about, as approved by Olusegun on 25 Nov 2026. Change the words
 * here, not in components/about/about-body.tsx. Company facts (name, number,
 * dates) come from brand-facts.ts.
 */

export const ABOUT_HERO = {
  title: "The customer relationship layer for the onchain economy.",
  sub: "We give blockchain companies what the best brands in the world already have: customers who stay, come back and grow with them.",
} as const;

/** The contrast from /hypothesis: what the dashboard sees against what the user did. */
export const ABOUT_DASHBOARD: ReadonlyArray<{ k: string; v: string }> = [
  { k: "Email open rate", v: "42%" },
  { k: "Impressions", v: "18,000" },
  { k: "Signups this week", v: "320" },
];

export const ABOUT_USER: ReadonlyArray<{
  t: string;
  where: string;
  tone?: "bad";
}> = [
  { t: "Completed setup", where: "Your app" },
  { t: "Deposited 12,400 USDC", where: "The chain" },
  { t: "Opened your last three emails", where: "Your email tool" },
  { t: "Withdrew 9,800 USDC last week", where: "The chain", tone: "bad" },
];

export const JOURNEY_HEADING =
  "From one question to the platform blockchain companies run retention on.";

export const JOURNEY: ReadonlyArray<{
  year: string;
  title: string;
  body: string;
}> = [
  {
    year: "2022",
    title: "The problem, up close",
    body: "Our founder is running growth for more than a dozen blockchain companies. Every team has the same blind spot: the tools they use to talk to customers can't see what those customers do onchain. Every campaign starts with a developer's export.",
  },
  {
    year: "2024",
    title: "One question",
    body: "OnchainSuite is founded in Birmingham and research and development begins, with a simple question: what if one record could hold everything a customer does, in the product and on the chain?",
  },
  {
    year: "2025",
    title: "Into the arena",
    body: "Our first version goes into battle at Colosseum's Solana hackathon. Fourteen teams put it to work. Their verdict: it solves the problem, now make it simpler. We rebuild three applications into one platform.",
  },
  {
    year: "2026",
    title: "Real companies, real retention",
    body: "OnchainSuite Ltd is incorporated. The first customers sign on, and then more. Today companies across four countries run retention on OnchainSuite, from prediction markets to decentralised networks. Stripe welcomes us into its UK startup programme.",
  },
  {
    year: "2027",
    title: "Open to everyone",
    body: "Public launch, new channels, and a lifecycle model trained on how onchain customers really behave.",
  },
  {
    year: "Next",
    title: "The standard",
    body: "A world where every blockchain company knows its customers as well as the best brands on earth know theirs. That's what we're building.",
  },
];

export const CUSTOMERS_HEADING = "Trusted by teams building onchain.";

export const ABOUT_MISSION = {
  heading:
    "Retention is how great companies are built. Crypto deserves the same tools.",
  body: "Blockchain companies have some of the richest customer signals ever created, written to the chain in real time, and until now no way to use them. OnchainSuite brings every signal into one living picture and turns it into conversations that keep people coming back.",
} as const;

export const PLATFORM_HEADING =
  "See everyone. Understand everything. Reach the right customer at the right moment. Everywhere.";

export const PLATFORM: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "One customer, one record.",
    body: "Wallets, emails and product accounts in a single, always-current view.",
  },
  {
    title: "Lifecycle intelligence.",
    body: "Know who is thriving, who is drifting and who is about to leave.",
  },
  {
    title: "Moments, not campaigns.",
    body: "Email and in-app messages fire the instant a customer deposits, withdraws, stakes or goes quiet.",
  },
  {
    title: "Ask, don't query.",
    body: "Plain-English answers from your own product and onchain data.",
  },
];

export const ABOUT_CTA = {
  heading: "Your next loyal customer is already onchain.",
  primary: {
    label: "Book a walkthrough",
    href: "https://cal.com/onchainsuite/15min",
  },
  secondary: { label: "See pricing", href: "/pricing" },
} as const;
