/**
 * Onboarding time accounting (v2.7 onboarding migration).
 *
 * "Time spent onboarding, per protocol" has two clocks:
 *
 * 1. The wizard clock - how long the `/onboarding` page took. The wizard already
 *    sends per-step `timeSpentSeconds` and a total `totalTimeSeconds` on
 *    completion. The gap this closes: a protocol that ABANDONS the wizard sent
 *    no total, so "each protocol" silently meant "each protocol that finished".
 *    The abandonment flush (see `hooks/use-onboarding-abandonment.ts`) beacons
 *    the elapsed time when the page is hidden/left.
 *
 * 2. The time-to-value clock - account created -> first contract indexed ->
 *    workspace "live" (see `utils/workspace.ts`). This is the meaningful
 *    onboarding duration: the wizard is a form, but value is the first indexed
 *    contract. We stamp the start durably (survives the wizard -> dashboard
 *    navigation and reloads) and close it when the workspace first goes live.
 *
 * This module is pure and server-safe: constants + math + formatting, no React,
 * no storage, no network. Storage/beacon live in the hooks so this stays
 * unit-testable without a DOM.
 */

/** Per-browser-session start of the wizard page (sessionStorage). */
export const WIZARD_STARTED_KEY = "onchain.onboarding.startedAt";

/**
 * Durable start of the first-mile clock (localStorage). Set when onboarding
 * begins and NOT cleared on wizard completion, so the clock keeps running until
 * the workspace goes live. One protocol = one org = one stamp.
 */
export const FIRST_MILE_STARTED_KEY = "onchain.onboarding.firstMileStartedAt";

/** Guard so time-to-value is reported exactly once per protocol (localStorage). */
export const TIME_TO_VALUE_REPORTED_KEY =
  "onchain.onboarding.timeToValueReported";

/**
 * The sector the protocol picked in onboarding (localStorage), stamped durably
 * so the dashboard first-mile can tell a web2 client (skip contract indexing)
 * from a web3 one. Empty/absent when onboarding predates this or never ran.
 */
export const FIRST_MILE_SECTOR_KEY = "onchain.onboarding.sector";

/**
 * Whole seconds between a start timestamp and now, never negative. A missing or
 * non-finite start yields 0 (nothing to measure), so a cleared stamp or a
 * garbage value reads as "no elapsed time" rather than a huge or negative one.
 */
export function elapsedSeconds(
  startedAtMs: number | null | undefined,
  nowMs: number = Date.now()
): number {
  if (typeof startedAtMs !== "number" || !Number.isFinite(startedAtMs)) {
    return 0;
  }
  return Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
}

/**
 * Human label for a duration in seconds: "2m 5s", or "45s" under a minute.
 * Matches the format the wizard already persists so both clocks read the same.
 */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
