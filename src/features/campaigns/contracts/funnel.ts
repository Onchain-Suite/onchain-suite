// Backend contract for the campaign conversion funnel.
// Mirrors onchain-backend `src/campaign/analytics/campaign-funnel.ts` +
// `campaign-funnel.service.ts` (GET /campaigns/:campaignId/funnel).
// Types only (CLAUDE.md s15.2).

/** One channel's slice of the funnel. */
export interface FunnelChannelSlice {
  /** Lower-case channel key (email/inapp/x/telegram/discord/farcaster). */
  channel: string;
  reached: number;
  engaged: number;
  /** Channel-native engagement word: Opened / Viewed / Read. */
  engagedLabel: string;
}

/** The goal that defines "Converted", echoed for labelling. */
export interface FunnelGoal {
  id: string;
  name: string;
  conversionType: string;
  attributionWindowDays: number;
}

/** Result of `GET /campaigns/:campaignId/funnel`. */
export interface CampaignFunnel {
  campaignId: string;
  /** Messages that landed, across channels. */
  reached: number;
  /** Distinct recipients who opened / viewed / read. */
  engaged: number;
  /** Wallets that performed the goal's on-chain action in the window. */
  converted: number;
  /** Permanently lost: unsubscribed, blocked, muted, bounced, failed. */
  lost: number;
  channels: FunnelChannelSlice[];
  /** The goal defining Converted, or null for an awareness-only campaign. */
  goal: FunnelGoal | null;
}
