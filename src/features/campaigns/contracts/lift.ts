/**
 * Contract for `GET /campaigns/:campaignId/lift` (2.7 holdout/lift experiment,
 * backend `feat/campaign-holdout-2.7` -> staging).
 *
 * The treated conversion rate vs the held control's, with a significance
 * verdict. The response is a discriminated union so the UI can say *why* lift
 * is unavailable (no goal / no holdout) instead of showing an empty chart.
 */

export type LiftVerdict = "significant" | "inconclusive" | "underpowered";

/** The lift numbers, spread onto the full-state response. */
export interface Lift {
  treatedRate: number;
  heldRate: number;
  /** Percentage points, treated minus held. */
  points: number;
  /** Relative: "1.8x more likely". 0 when the held rate is 0. */
  ratio: number;
  verdict: LiftVerdict;
  /** Two-sided p-value of the difference. */
  p: number;
  /** Minimum detectable effect (percentage points) at 80% power, alpha .05. */
  mde: number;
  /** Recipients needed across the whole audience to resolve the observed effect. */
  needed: number;
}

export interface LiftGoal {
  id: string;
  name: string;
  conversionType: string;
  attributionWindowDays: number;
}

export type CampaignLiftResult =
  | { campaignId: string; hasGoal: false; hasHoldout: false }
  | { campaignId: string; hasGoal: true; hasHoldout: false; goal: LiftGoal }
  | ({
      campaignId: string;
      hasGoal: true;
      hasHoldout: true;
      goal: LiftGoal;
      window: { start: string; end: string };
      treated: { n: number; converted: number };
      held: { n: number; converted: number };
    } & Lift);
