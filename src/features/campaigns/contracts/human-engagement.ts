/**
 * Human-first email engagement (backend `modules/human-engagement/API.md`,
 * 2026-11-22). Added, optionally, to `email` on `GET /campaigns/:id/analytics`
 * and `GET /campaigns/analytics/overview`, and to each node of
 * `GET /automations/:id/stats/messages`. A failed read leaves the fields out
 * rather than reporting zero, so every one of them may be absent.
 */

export interface HumanOpenCounts {
  /** Opens that are neither machine nor Apple Mail Privacy Protection. */
  humanEstimateLow: number;
  /** `low` plus messages whose ONLY opens were Apple MPP prefetches. */
  humanEstimateHigh: number;
  /** Messages with any Apple MPP open (prefetch, or an IP in 17.0.0.0/8). */
  apple: number;
  /** Messages with an open flagged automated for another reason (proxy, scanner, SES isBotEvent). */
  machine: number;
  /** Every open: equals `uniqueOpens`. */
  raw: number;
}

export interface HumanOpens extends HumanOpenCounts {
  /** Percentages 0-100 over max(delivered, raw opens, unique clicks). */
  rates: HumanOpenCounts;
}

export interface HumanEngagement {
  /** Messages with a click the scanner review judged human. */
  humanClicks?: number;
  /** `humanClicks` over delivered, percent 0-100. */
  humanClickRate?: number;
  opens?: HumanOpens;
}
