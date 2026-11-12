/**
 * The org's plan and live usage, from `GET /billing/plan-usage/:organizationId`.
 *
 * Types only. Safe to import from anywhere.
 */

export type PlanUsageMeterStatus = "ok" | "warn" | "exceeded" | string;

/** One usage meter. A `limit` below zero means the plan does not cap it. */
export interface PlanUsageMeter {
  used: number;
  limit: number;
  percent: number;
  status: PlanUsageMeterStatus;
}

/**
 * Known meter keys (docs/backend.md 2026-07-03 pricing system, 2026-07-11
 * trackedWallets). `inAppPushesPerMonth` has been returned since in-app push
 * shipped and was missing here.
 */
export interface PlanUsageMeters {
  contacts?: PlanUsageMeter;
  trackedWallets?: PlanUsageMeter;
  emailsPerMonth?: PlanUsageMeter;
  inAppPushesPerMonth?: PlanUsageMeter;
  aiCredits?: PlanUsageMeter;
  goldrushCredits?: PlanUsageMeter;
  seats?: PlanUsageMeter;
  automations?: PlanUsageMeter;
  apiKeys?: PlanUsageMeter;
}

/** Response of `GET /billing/plan-usage/:organizationId`. */
export interface PlanUsageResponse {
  plan?: string;
  meters?: PlanUsageMeters;
  [key: string]: unknown;
}
