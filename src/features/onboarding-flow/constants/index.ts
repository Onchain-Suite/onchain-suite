export const contactRanges = [
  { value: "0-500", label: "0 - 500" },
  { value: "501-1500", label: "501 - 1,500" },
  { value: "1501-2500", label: "1,501 - 2,500" },
  { value: "2501-5000", label: "2,501 - 5,000" },
  { value: "5001-10000", label: "5,001 - 10,000" },
  { value: "10001-15000", label: "10,001 - 15,000" },
  { value: "15001-20000", label: "15,001 - 20,000" },
  { value: "20001-25000", label: "20,001 - 25,000" },
  { value: "25001-30000", label: "25,001 - 30,000" },
  { value: "30001-40000", label: "30,001 - 40,000" },
  { value: "40001-50000", label: "40,001 - 50,000" },
  { value: "50001-75000", label: "50,001 - 75,000" },
  { value: "75001-100000", label: "75,001 - 100,000" },
  { value: "100001-130000", label: "100,001 - 130,000" },
  { value: "130001-150000", label: "130,001 - 150,000" },
  { value: "150001-200000", label: "150,001 - 200,000" },
  { value: "200000+", label: "200,000+" },
];

export const featureOptions = [
  {
    id: "email-templates",
    label: "Email templates",
  },
  {
    id: "advanced-reporting",
    label: "Advanced reporting",
  },
  {
    id: "automations",
    label: "Automations",
  },
  {
    id: "forms-landing-pages",
    label: "Forms and landing pages",
  },
  {
    id: "optimized-send-times",
    label: "Optimized send times",
  },
  {
    id: "ai-generated-content",
    label: "AI-generated content",
  },
  {
    id: "audience-segmentation",
    label: "Audience Segmentation",
  },
  {
    id: "crm",
    label: "CRM",
  },
];

export const organizationOptions = [
  {
    id: "de-fi-protocol",
    label: "DeFi Protocol",
    description:
      "Building decentralized finance solutions like lending, borrowing, or yield farming platforms.",
  },
  {
    id: "decentralized-exchange",
    label: "Decentralized Exchange (DEX)",
    description:
      "Operating a trading platform for tokens without intermediaries.",
  },
  {
    id: "nft-marketplace",
    label: "NFT Marketplace or Project",
    description:
      "Focused on creating, selling, or curating non-fungible tokens and digital collectibles.",
  },
  {
    id: "blockchain-protocol",
    label: "Blockchain Protocol",
    description:
      "Developing a foundational blockchain or layer-2 scaling solution for the Web3 ecosystem.",
  },
  {
    id: "web3-infrastructure",
    label: "Web3 Infrastructure",
    description:
      "Providing tools, APIs, or services (e.g., node providers, wallets, or oracles) that power decentralized apps.",
  },
  {
    id: "crypto-community",
    label: "Crypto Community or DAO",
    description:
      "Representing a decentralized autonomous organization or a community-driven crypto initiative.",
  },
  {
    id: "gaming-platform",
    label: "Gaming Platform",
    description:
      "Creating virtual worlds, play-to-earn games, or immersive experiences powered by blockchain.",
  },
  {
    id: "tokenized-asset-platform",
    label: "Tokenized Asset Platform",
    description:
      "Tokenizing real-world assets (e.g., real estate, art) or creating utility/stablecoins.",
  },
  {
    id: "web3-marketing-agency",
    label: "Web3 Marketing or Agency",
    description:
      "Specializing in promoting crypto projects, building communities, or managing token launches.",
  },
  {
    id: "other-web3-innovator",
    label: "Other Web3 Innovator",
    description:
      "If your project doesn't fit the above, let us know about your unique decentralized vision.",
  },
];

/**
 * Web2 sectors — we now onboard non-crypto teams too, so the Sector picker
 * offers these alongside the Web3 list above.
 */
export const web2Options = [
  {
    id: "ecommerce-retail",
    label: "E-commerce or Retail",
    description: "Selling physical or digital products online.",
  },
  {
    id: "saas-software",
    label: "SaaS or Software",
    description: "Building a software product or platform.",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    description: "Connecting buyers and sellers of goods or services.",
  },
  {
    id: "media-creator",
    label: "Media, Content or Creator",
    description: "Publishing, newsletters, or a creator business.",
  },
  {
    id: "education",
    label: "Education or EdTech",
    description: "Courses, training, or learning products.",
  },
  {
    id: "fintech-finance",
    label: "Fintech or Finance",
    description: "Payments, banking, investing, or financial services.",
  },
  {
    id: "healthcare-wellness",
    label: "Healthcare or Wellness",
    description: "Health, fitness, or wellness products and services.",
  },
  {
    id: "real-estate",
    label: "Real Estate or PropTech",
    description: "Property, rentals, or real-estate technology.",
  },
  {
    id: "travel-hospitality",
    label: "Travel or Hospitality",
    description: "Travel, events, food, or hospitality.",
  },
  {
    id: "agency-services",
    label: "Agency or Professional Services",
    description: "Marketing, consulting, or other client services.",
  },
];

/**
 * Sentinel value for the "Other" sector option. Selecting it reveals a free-text
 * field so the user can name a sector we didn't list.
 */
export const SECTOR_OTHER_VALUE = "__other__";

export const goalOptions = [
  {
    id: "drive-sales",
    label: "Drive sales, revenue, or conversions",
  },
  {
    id: "helpful-emails",
    label: "Send emails people find helpful or entertaining",
  },
  {
    id: "launch-campaign",
    label: "Launch a communication layer campaign ",
  },
  {
    id: "grow-subscribers",
    label: "Grow my list of email subscribers",
  },
];
