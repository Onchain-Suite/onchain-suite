/* The workspace's 30-day totals: one set of numbers that every screen showing them reads.
 *
 * Analytics, Home and Campaigns each had their own, typed in separately, and they had drifted
 * into impossibility: 9,412 active wallets in a 7,166-wallet audience, 18,204 wallets reached by
 * 12,480 messages, and a Headline saying 41,280 in-app actions over a lane strip saying 3,351
 * for the same measure. These are chosen to hold together, workspaceTotals.test.ts checks that
 * they do, and the chart engine is calibrated to them, so a chart someone builds of the whole
 * audience agrees with the Headline above it. */

/** Wallets in the audience: the holder list the product indexes. */
export const AUDIENCE = 7_166;

export const TOTALS_30D = {
  /** Unique wallets sent at least one email or in-app push. */
  walletsReached: 5_480,
  /** Emails and in-app pushes sent. */
  messagesSent: 12_480,
  /** Every message event: sends, opens, clicks, push views and form submits. */
  messageEvents: 21_940,
  /** Events the operator's app sent through track(). */
  productEvents: 41_280,
  /** Wallets that completed the operator's setup flow. */
  onboardingFinished: 2_874,
  /** Wallets with at least one on-chain action. */
  activeWallets: 4_936,
  /** On-chain actions by audience wallets. */
  chainEvents: 18_640,
  /** Wallets that took a target on-chain action inside the attribution window after a message. */
  onchainConversions: 1_164,
} as const;

/** How the 30-day totals scale to the other windows. One table, so the Headline and the lane
 *  strip move together when the dashboard's range changes. */
export const RANGE_FACTOR: Record<'7d' | '30d' | '90d', number> = { '7d': 0.28, '30d': 1, '90d': 2.7 };
