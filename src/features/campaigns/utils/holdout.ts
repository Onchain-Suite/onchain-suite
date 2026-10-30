import type { HoldoutPolicy } from "@/features/settings/holdout.service";

/**
 * Pure holdout/lift helpers shared by the wizard note and the detail LiftRow.
 *
 * Mirrors the backend `src/common/holdout/{holdout,lift}.ts`: the expected
 * holdout fraction combines the two layers (global, then per-campaign), and the
 * lift display helpers match the API's formatting exactly so the UI never
 * disagrees with the server.
 */

const clampPct = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
};

/**
 * The fraction of an eligible audience withheld as a control, applying the
 * global layer first then the per-campaign layer:
 *   gp + (1 - gp) * cp
 * The global layer only counts when it is enabled. Matches
 * `expectedHoldoutFraction` on the backend.
 */
export function expectedHoldoutFraction(policy: HoldoutPolicy): number {
  const cp = clampPct(policy.campaignPct) / 100;
  const gp = policy.globalEnabled ? clampPct(policy.globalPct) / 100 : 0;
  return gp + (1 - gp) * cp;
}

/** How many of an eligible audience would be held back under this policy. */
export function heldFromEligible(
  eligible: number,
  policy: HoldoutPolicy
): number {
  if (!Number.isFinite(eligible) || eligible <= 0) return 0;
  return Math.round(eligible * expectedHoldoutFraction(policy));
}

/** Whether any holdout is actually in effect under this policy. */
export function holdoutActive(policy: HoldoutPolicy): boolean {
  return expectedHoldoutFraction(policy) > 0;
}

/**
 * Whether a single campaign of this size can resolve a lift. The backend's
 * `SINGLE_CAMPAIGN_FLOOR` is the eligible count below which the control is too
 * small to detect a realistic effect.
 */
export function isMeasurable(
  eligible: number,
  singleCampaignFloor: number
): boolean {
  return eligible >= singleCampaignFloor;
}

/** Percentage points, signed, one decimal - matches the backend `fmtPts`. */
export const fmtPts = (n: number): string =>
  `${n >= 0 ? "+" : ""}${n.toFixed(1)}pt`;

export type LiftTone = "positive" | "neutral" | "negative";

/**
 * Tone for a verdict + direction. A significant positive lift is good, a
 * significant negative one bad; everything unresolved is neutral.
 */
export function liftTone(
  verdict: "significant" | "inconclusive" | "underpowered",
  points: number
): LiftTone {
  if (verdict !== "significant") return "neutral";
  return points >= 0 ? "positive" : "negative";
}
