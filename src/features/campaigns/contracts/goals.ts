// Backend contract for campaign conversion goals.
// Mirrors onchain-backend `src/campaign/campaign-goals.service.ts` +
// `campaign-goals.controller.ts` (routes under /campaigns/:campaignId/goals).
// Types only - no runtime, safe to import anywhere (CLAUDE.md s15.2).

/** Conversion states a goal can measure (the backend's `ConversionType`). */
export type GoalConversionType =
  | "email_open"
  | "email_click"
  | "onchain_activity"
  | "onchain_action"
  | "contact_score_gte";

/**
 * On-chain action categories an `onchain_action` goal targets. Matches the
 * `event_type` the runtime derives into `onchain_events`
 * (`deriveOnchainEventType`): swap|mint|stake|unstake|deposit|bridge.
 */
export type OnchainAction =
  "mint" | "swap" | "stake" | "unstake" | "deposit" | "bridge";

/** A persisted campaign goal. */
export interface CampaignGoal {
  id: string;
  campaignId: string;
  name: string;
  conversionType: GoalConversionType;
  /** For `onchain_action`, carries `{ action: OnchainAction }`. */
  conversionConfig: Record<string, unknown> | null;
  attributionWindowDays: number;
}

/** Body of `POST /campaigns/:campaignId/goals`. */
export interface CreateGoalPayload {
  name: string;
  conversionType: GoalConversionType;
  conversionConfig?: Record<string, unknown>;
  attributionWindowDays?: number;
}

/** Result of `GET /campaigns/:campaignId/goals/:goalId/measure`. */
export interface GoalMeasurement {
  goalId: string;
  name: string;
  conversionType: string;
  attributionWindowDays: number;
  /** ISO window the measurement covers: [sentAt, sentAt + windowDays]. */
  window: { start: string; end: string };
  /** Audience size measured (capped server-side). */
  measured: number;
  /** True when the audience exceeded the server cap. */
  truncated: boolean;
  converted: number;
  /** converted / measured, 0..1. */
  conversionRate: number;
}
