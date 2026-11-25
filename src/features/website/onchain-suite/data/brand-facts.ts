/**
 * Brand facts F1 to F12: the one set of company facts that /about, /llms.txt
 * and the site-wide JSON-LD all read from, so the three never disagree.
 *
 * Sources, in order: docs.onchainsuite.com (product), /pricing (plans and
 * prices, from PACKAGES and PRICING_FAQ in components/site/site-bundle.jsx) and
 * the company record on /team and the legal pages. Change a fact here, not in
 * the pages that show it. Do not add a channel, chain, price or number that
 * the docs or /pricing do not state.
 */

export const SITE_URL = "https://www.onchainsuite.com";
export const DOCS_URL = "https://docs.onchainsuite.com";

/** F1. The one-line description. Matches the homepage meta description. */
export const ONE_LINER =
  "OnchainSuite is retention and lifecycle software for blockchain companies. It lets companies message their users by email and in-app based on what those users do, in the app and on the chain.";

/** F2. Name and spelling. */
export const NAME = {
  brand: "OnchainSuite",
  legal: "OnchainSuite Ltd",
  howToWrite:
    "OnchainSuite, one word, with a capital O and a capital S. Not Onchain Suite, On-chain Suite or 0nchainSuite.",
} as const;

/** F3. Prices, in US dollars a month. Docs and /pricing agree on $39 and $349. */
export const PLANS = {
  suite: {
    name: "Suite",
    for: "blockchain companies",
    summary:
      "From $39 a month, priced by the number of contacts. Launch is $39 a month for 2,500 contacts and Growth is $349 a month for 25,000 contacts.",
  },
  send: {
    name: "Send",
    for: "companies without blockchain data",
    summary:
      "$6 a month plus $3.95 per 1,000 subscribers, for email without the blockchain layer.",
  },
  freePlan: "There is no free plan.",
} as const;

/** F4. The top tier, as /pricing shows it. */
export const TOP_TIER =
  "Enterprise, a custom annual contract from 75,000 contacts.";

/** F5. Chains, per the docs (automation/contract-based-flows). */
export const CHAINS =
  "Ethereum, Base, Arbitrum, Optimism and Polygon are watched automatically. Solana events come in through the API.";

/** F6. Channels that ship today, and the wording for what comes next. */
export const CHANNELS = {
  live: "Email and in-app. In-app reaches a wallet as a message inside your app, a web push when the tab is closed, or a mobile push.",
  upcoming:
    "More channels are on the roadmap. Until they ship, OnchainSuite does not send on Telegram, Discord or X.",
} as const;

/** F7. Official accounts. Only accounts the company owns and runs. */
const X_URL = "https://x.com/0nchainSuite";
const LINKEDIN_URL = "https://www.linkedin.com/company/onchainsuite";

/** Social profiles for the Organization JSON-LD sameAs. */
export const SAME_AS: ReadonlyArray<string> = [X_URL, LINKEDIN_URL];

export const OFFICIAL_ACCOUNTS: ReadonlyArray<{ label: string; url: string }> =
  [
    { label: "Website", url: SITE_URL },
    { label: "Documentation", url: DOCS_URL },
    { label: "X (@0nchainSuite)", url: X_URL },
    { label: "LinkedIn", url: LINKEDIN_URL },
  ];

/** F8. Developer surface. The SDK is the public package; the GitHub org is not listed until confirmed. */
export const DEVELOPERS =
  "An in-app SDK (@onchainsuite/sdk), a REST API and signed webhooks, documented at docs.onchainsuite.com.";

/** F9. Founders, as /team lists them. */
export const FOUNDERS: ReadonlyArray<{ name: string; role: string }> = [
  { name: "Olusegun Isaac Aborode", role: "Founder and CEO" },
  { name: "Joshua Obafemi", role: "Cofounder and CTO" },
  { name: "Joel Obafemi", role: "Cofounder and analytics lead" },
];

/** F10. OnchainSuite and Datum Labs. Said once, here and on /about, never in the JSON-LD. */
export const DATUM_LABS =
  "OnchainSuite is an independent company. It is not a Datum Labs product, and Datum Labs holds no shares in it. Datum Labs helped build the blockchain data warehouse that OnchainSuite reads from.";

/** F11. Company record, from the legal pages and Companies House. */
export const COMPANY = {
  incorporated: "30 July 2026",
  incorporatedIso: "2026-07-30",
  jurisdiction: "England and Wales",
  number: "17370357",
  based: "Birmingham, United Kingdom",
} as const;

/** F12. Public numbers on /about. Kept to the company record until others are approved. */
export const ABOUT_UPDATED = "2026-11-25";
