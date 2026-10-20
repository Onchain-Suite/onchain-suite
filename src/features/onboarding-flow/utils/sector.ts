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

export type SectorGroup = "web3" | "web2" | "other" | "unset";

/** Classify a chosen sector label into its group, for analytics and the web2-skips-indexing rule. */
export const sectorGroupOf = (sector: string): SectorGroup => {
  const s = sector.trim();
  if (!s) return "unset";
  if (WEB3_LABELS.has(s)) return "web3";
  if (WEB2_LABELS.has(s)) return "web2";
  return "other";
};
