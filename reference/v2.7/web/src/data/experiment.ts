/* Holdouts and campaign lift (2.7).
 *
 * Everything the funnel reported before this was correlational. The wallets we messaged
 * converted; we had no idea how many would have converted anyway, so a win-back showing 12%
 * could have been reactivating nobody. For a product that sells retention lift, that is not
 * a missing feature — it is the central claim going unmeasured.
 *
 * A holdout fixes it for free: withhold a random slice, compare, and every campaign becomes
 * its own experiment. The discipline is entirely in refusing to report when the numbers
 * cannot support it, which is most of this file. */

/** Two holdouts, because they answer two different questions and get confused constantly. */
export interface HoldoutPolicy {
  /** Withheld from one campaign. Measures that message. */
  campaignPct: number;
  /** Withheld from everything. Measures the programme — is any of this worth doing? */
  globalPct: number;
  /** Rotated so the global holdout is not the same people forgotten forever. */
  seed: string;
  rotatedAt: string;
  globalEnabled: boolean;
}

/* 10%, not the industry-standard 5%.
 *
 * The control arm is what limits resolution, and ours are small: at 4,000 recipients a 5%
 * holdout is 200 people, which cannot resolve a genuine 5-point lift. Doubling it costs 5%
 * of reach on one campaign and is the difference between a measurable result and a number
 * nobody should act on. Below roughly 10,000 recipients even 10% will not settle a single
 * campaign — which is what the global holdout is for, since it accumulates across all of
 * them instead of restarting every send. */
export const DEFAULT_HOLDOUT: HoldoutPolicy = {
  campaignPct: 10,
  globalPct: 5,
  seed: 'h1',
  rotatedAt: 'Aug 1, 2026',
  globalEnabled: false,
};

/** Audience size below which no single campaign will settle anything, so the UI can say so
 *  before the send rather than after. Derived from the MDE curve at a typical base rate. */
export const SINGLE_CAMPAIGN_FLOOR = 10_000;

/* Assignment must be stable: the same wallet lands on the same side of the line every time
 * the same campaign is recomputed, or the "control" group changes composition between the
 * estimate and the send and the comparison means nothing. A hash of the pair does that
 * without storing an assignment per contact. FNV-1a — small, fast, good enough spread. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function inHoldout(contactId: string, scope: string, seed: string, pct: number): boolean {
  if (pct <= 0) return false;
  return (hash(`${seed}:${scope}:${contactId}`) % 10_000) < pct * 100;
}

/* ---------------- Whether a result can be reported at all ---------------- */

/** Two-proportion z-test. Returns the z score for treated vs held back. */
export function zScore(convA: number, nA: number, convB: number, nB: number): number {
  if (nA < 1 || nB < 1) return 0;
  const pA = convA / nA;
  const pB = convB / nB;
  const pooled = (convA + convB) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  return se === 0 ? 0 : (pA - pB) / se;
}

/** Two-sided p-value from z, via a standard-normal CDF approximation. */
export function pValue(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  // Abramowitz & Stegun 7.1.26 — plenty of precision for a significance badge.
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 1 - y;
}

/** The smallest lift this sample could have detected, in percentage points.
 *
 *  80% power at α=0.05. This is the number that decides whether a result gets shown: if
 *  the observed lift is smaller than the effect the sample could resolve, the honest
 *  reading is "we cannot tell", not a percentage with a plausible-looking decimal. */
export function minDetectableEffect(nTreated: number, nHeld: number, baseRate: number): number {
  if (nTreated < 1 || nHeld < 1) return Infinity;
  const p = Math.min(Math.max(baseRate, 0.01), 0.99);
  const harmonic = 1 / nTreated + 1 / nHeld;
  // (z_{α/2} + z_β)² = (1.96 + 0.84)² ≈ 7.85
  return Math.sqrt(7.85 * p * (1 - p) * harmonic) * 100;
}

/** How many recipients each arm would need to resolve a given lift. */
export function requiredN(baseRate: number, liftPts: number, holdoutPct: number): number {
  const p = Math.min(Math.max(baseRate, 0.01), 0.99);
  const d = Math.max(liftPts, 0.1) / 100;
  const perArm = (7.85 * p * (1 - p)) / (d * d);
  // perArm is the held-back arm, which is the small one; scale up to the whole audience.
  return Math.ceil(perArm / Math.max(holdoutPct / 100, 0.001));
}

export type LiftVerdict = 'significant' | 'inconclusive' | 'underpowered';

export interface Lift {
  treatedRate: number;
  heldRate: number;
  /** Percentage points, treated minus held. */
  points: number;
  /** Relative, for the sentence — "1.8× more likely". */
  ratio: number;
  verdict: LiftVerdict;
  p: number;
  /** Populated when underpowered: what it would take to answer the question. */
  needed: number;
  mde: number;
}

export function computeLift(
  treatedConv: number, nTreated: number,
  heldConv: number, nHeld: number,
  holdoutPct: number,
): Lift {
  const treatedRate = nTreated > 0 ? treatedConv / nTreated : 0;
  const heldRate = nHeld > 0 ? heldConv / nHeld : 0;
  const points = (treatedRate - heldRate) * 100;
  const mde = minDetectableEffect(nTreated, nHeld, heldRate || treatedRate);
  const z = zScore(treatedConv, nTreated, heldConv, nHeld);
  const p = pValue(z);

  /* Order matters. A sample too small to resolve the observed difference is underpowered
     whatever the p-value says — reporting "not significant" there implies we looked and
     found nothing, when in fact we never could have. */
  const verdict: LiftVerdict = Math.abs(points) < mde ? 'underpowered'
    : p < 0.05 ? 'significant'
    : 'inconclusive';

  return {
    treatedRate, heldRate, points,
    ratio: heldRate > 0 ? treatedRate / heldRate : 0,
    verdict, p, mde,
    needed: requiredN(heldRate || treatedRate || 0.05, Math.max(Math.abs(points), 1), holdoutPct),
  };
}

export const fmtPts = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}pt`;
