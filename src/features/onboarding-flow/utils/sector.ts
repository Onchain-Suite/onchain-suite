/**
 * Sector helpers (onboarding revamp).
 *
 * The sector picker is grouped Web3 / Web2 (see the project step). These helpers are the single
 * source of the two label sets and classify a chosen sector into its group, which the onboarding
 * tracking sends to the server so the product can be analysed by Web3 vs Web2 vs a free-text
 * "other". Pure, server-safe.
 */

import { organizationOptions, web2Options } from "../constants";

// The Web3 list drops its own "Other" entry: the picker has a single free-text "Other" chip that
// covers Web3 and Web2 alike (mirrors the original organization-setup step).
export const WEB3_SECTOR_OPTIONS = organizationOptions.filter(
  (o) => o.id !== "other-web3-innovator"
);
export const WEB2_SECTOR_OPTIONS = web2Options;

const WEB3_LABELS = new Set(WEB3_SECTOR_OPTIONS.map((o) => o.label));
const WEB2_LABELS = new Set(WEB2_SECTOR_OPTIONS.map((o) => o.label));

export const KNOWN_SECTOR_LABELS = new Set([...WEB3_LABELS, ...WEB2_LABELS]);

/**
 * Short, plain-language names shown on the sector chips. The full descriptive label is still what
 * gets stored (so analytics keep the detail); this is display only. Keyed by option id.
 */
const SECTOR_SHORT_LABEL: Record<string, string> = {
  "de-fi-protocol": "DeFi",
  "decentralized-exchange": "DEX",
  "nft-marketplace": "NFT",
  "blockchain-protocol": "Blockchain",
  "web3-infrastructure": "Infrastructure",
  "crypto-community": "DAO",
  "gaming-platform": "Gaming",
  "tokenized-asset-platform": "Tokenized assets",
  "web3-marketing-agency": "Marketing",
  "ecommerce-retail": "E-commerce",
  "saas-software": "SaaS",
  marketplace: "Marketplace",
  "media-creator": "Media",
  education: "Education",
  "fintech-finance": "Fintech",
  "healthcare-wellness": "Healthcare",
  "real-estate": "Real estate",
  "travel-hospitality": "Travel",
  "agency-services": "Agency",
};

/** The short chip label for a sector option, falling back to its full label. */
export const shortSectorLabel = (option: {
  id: string;
  label: string;
}): string => SECTOR_SHORT_LABEL[option.id] ?? option.label;

export type SectorGroup = "web3" | "web2" | "other" | "unset";

/** Classify a chosen sector label into its group, for analytics and the web2-skips-indexing rule. */
export const sectorGroupOf = (sector: string): SectorGroup => {
  const s = sector.trim();
  if (!s) return "unset";
  if (WEB3_LABELS.has(s)) return "web3";
  if (WEB2_LABELS.has(s)) return "web2";
  return "other";
};
