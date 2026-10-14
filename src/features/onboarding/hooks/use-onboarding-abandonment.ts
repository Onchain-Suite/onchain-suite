"use client";

import { useEffect, useRef } from "react";

import { API_BASE_URL } from "@/lib/api-client";

import { elapsedSeconds } from "../utils/onboarding-timing";

interface UseOnboardingAbandonmentOptions {
  /** Only arm the flush while the wizard is actually open and unfinished. */
  enabled: boolean;
  /** When the current wizard session started (ms epoch). */
  startedAtMs: number;
  /** The step the protocol is on when they leave. */
  stepName: string;
  /** Flow version string, matching the wizard's completed/started events. */
  flowVersion?: string;
}

/**
 * Report onboarding time for protocols that LEAVE the wizard without finishing.
 *
 * The wizard only sends a total on completion, so an abandoned onboarding
 * reported no duration and "time per protocol" quietly excluded everyone still
 * in flight. This arms a one-shot flush on the two events that fire when a page
 * is backgrounded or closed:
 * - `visibilitychange` -> hidden: the reliable signal on mobile and tab switches.
 * - `pagehide`: desktop close/navigate-away.
 *
 * It uses `navigator.sendBeacon`, not the axios client: a beacon is delivered by
 * the browser after the page is gone, where an async fetch would be cancelled.
 * Auth is cookie-based and the URL is same-origin and relative, so the session
 * rides along automatically. A ref guards against double-sending when both
 * events fire for the same departure, and `markCompleted()` disarms it so a
 * normal finish is never also logged as an abandonment.
 */
export function useOnboardingAbandonment({
  enabled,
  startedAtMs,
  stepName,
  flowVersion = "onboarding-v1",
}: UseOnboardingAbandonmentOptions): { markCompleted: () => void } {
  const sentRef = useRef(false);
  const completedRef = useRef(false);
  // Keep the latest inputs in a ref so the listeners (registered once) always
  // read current values without re-subscribing on every step/time change.
  const stateRef = useRef({ startedAtMs, stepName, flowVersion });
  stateRef.current = { startedAtMs, stepName, flowVersion };

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return;

    const flush = () => {
      if (sentRef.current || completedRef.current) return;
      const {
        startedAtMs: startMs,
        stepName: step,
        flowVersion: version,
      } = stateRef.current;
      const timeSpentSeconds = elapsedSeconds(startMs);
      // Nothing meaningful to report if they left instantly.
      if (timeSpentSeconds <= 0) return;
      sentRef.current = true;
      const body = JSON.stringify({
        stepName: step,
        action: "abandoned",
        timeSpentSeconds,
        flowVersion: version,
        metadata: { reason: "page_hidden" },
      });
      try {
        navigator.sendBeacon(
          `${API_BASE_URL}/onboarding/track`,
          new Blob([body], { type: "application/json" })
        );
      } catch {
        // Beaconing is best-effort telemetry; never surface or throw.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [enabled]);

  const markCompleted = () => {
    completedRef.current = true;
  };

  return { markCompleted };
}
