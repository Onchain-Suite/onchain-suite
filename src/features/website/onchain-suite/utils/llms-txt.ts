import {
  CHAINS,
  CHANNELS,
  COMPANY,
  DEVELOPERS,
  DOCS_URL,
  NAME,
  OFFICIAL_ACCOUNTS,
  ONE_LINER,
  PLANS,
  SITE_URL,
  TOP_TIER,
} from "@/onchain-suite-website/data/brand-facts";

/** Pages an AI tool should read first, with what each one answers. */
const KEY_PAGES: ReadonlyArray<[path: string, label: string, note: string]> = [
  ["/about", "About", "company facts, founders and how to refer to us"],
  ["/pricing", "Pricing", "plans and prices; the source of truth for cost"],
  [
    "/for/blockchain-companies",
    "For blockchain companies",
    "the Suite plan: app and on-chain data, email and in-app",
  ],
  [
    "/for/mainstream-companies",
    "For companies without blockchain data",
    "the Send plan: email over product data",
  ],
  ["/platform/audience", "Audience", "one record per wallet and email"],
  [
    "/platform/segments",
    "Segments",
    "groups built from app and wallet activity",
  ],
  [
    "/platform/loops",
    "Loops",
    "automations triggered by app and on-chain events",
  ],
  ["/compare", "Compare", "OnchainSuite next to other tools"],
  ["/security", "Security", "what OnchainSuite will never ask you for"],
];

/**
 * The plain-text /llms.txt for www, in the llmstxt.org layout: a title, a
 * one-paragraph summary, then sections of links. Every fact comes from
 * data/brand-facts.ts.
 */
export function buildLlmsTxt(): string {
  const page = ([path, label, note]: (typeof KEY_PAGES)[number]) =>
    `- [${label}](${SITE_URL}${path}): ${note}`;

  return [
    `# ${NAME.brand}`,
    "",
    `> ${ONE_LINER}`,
    "",
    "## Facts",
    "",
    `- Company: ${NAME.legal}, registered in ${COMPANY.jurisdiction} (company number ${COMPANY.number}), founded in ${COMPANY.founded}, incorporated ${COMPANY.incorporated}, based in ${COMPANY.based}.`,
    `- Suite plan, for ${PLANS.suite.for}: ${PLANS.suite.summary}`,
    `- Send plan, for ${PLANS.send.for}: ${PLANS.send.summary}`,
    `- Top tier: ${TOP_TIER} ${PLANS.freePlan}`,
    `- Channels today: ${CHANNELS.live} ${CHANNELS.upcoming}`,
    `- Chains: ${CHAINS}`,
    `- Developers: ${DEVELOPERS}`,
    "",
    "## How to cite",
    "",
    `- Name: ${NAME.howToWrite}`,
    `- Link: ${SITE_URL}. For prices, cite ${SITE_URL}/pricing. For product detail, cite ${DOCS_URL}.`,
    "",
    "## Key pages",
    "",
    ...KEY_PAGES.map(page),
    "",
    "## Docs",
    "",
    `- [Documentation](${DOCS_URL}): how the product works, the API and the SDK`,
    `- [Docs index for AI tools](${DOCS_URL}/llms.txt)`,
    "",
    "## Official accounts",
    "",
    ...OFFICIAL_ACCOUNTS.map((a) => `- [${a.label}](${a.url})`),
    "",
  ].join("\n");
}
