import {
  organizationOptions,
  web2Options,
} from "@/features/onboarding-flow/constants";

/**
 * Web2 vs Web3 classification of the sector a protocol picked in onboarding
 * (v2.7 onboarding migration, step 3).
 *
 * The first mile assumes an indexed contract is the thing that fills the
 * workspace, but we now onboard non-crypto teams too. A web2 client has no
 * contract to index, so the "Start here: index your contract" nudge is wrong for
 * them and must be skipped - their first mile is importing an audience.
 *
 * The onboarding Sector picker stores a label (or a free-text "Other"). We
 * classify against the picker's own option lists so this never drifts from what
 * the user could actually choose. Matching is tolerant of id or label, trimmed
 * and case-insensitive, because the stored value has been a label historically
 * and could be an id.
 *
 * Pure and server-safe: data + matching, no React, no storage.
 */

export type SectorCategory = "web2" | "web3" | "unknown";

const web2Keys = new Set<string>([
  ...web2Options.map((o) => o.id),
  ...web2Options.map((o) => o.label.trim().toLowerCase()),
]);

const web3Keys = new Set<string>([
  ...organizationOptions.map((o) => o.id),
  ...organizationOptions.map((o) => o.label.trim().toLowerCase()),
]);

/**
 * Classify a stored sector value. A known web2 sector is "web2"; a known web3
 * sector is "web3"; anything else (empty, or a free-text "Other" we can't place)
 * is "unknown". Unknown is treated like web3 by the banner: indexing is still
 * offered, just optional, rather than assumed skippable.
 */
export function classifySector(
  sector: string | null | undefined
): SectorCategory {
  if (typeof sector !== "string") return "unknown";
  const trimmed = sector.trim();
  if (!trimmed) return "unknown";
  const lower = trimmed.toLowerCase();
  if (web2Keys.has(trimmed) || web2Keys.has(lower)) return "web2";
  if (web3Keys.has(trimmed) || web3Keys.has(lower)) return "web3";
  return "unknown";
}

/** True only when the sector is a recognised web2 sector (skip contract indexing). */
export function isWeb2Sector(sector: string | null | undefined): boolean {
  return classifySector(sector) === "web2";
}
