"use client";

import { useEffect, useRef } from "react";

import { apiClient } from "@/lib/api-client";

import {
  elapsedSeconds,
  FIRST_MILE_STARTED_KEY,
  formatDuration,
  TIME_TO_VALUE_REPORTED_KEY,
} from "../utils/onboarding-timing";
import { useWorkspaceMode } from "./use-workspace-mode";

/** localStorage read that never throws (private mode, blocked storage). */
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** localStorage write that never throws. */
function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function clearStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Close the time-to-value clock the first time the workspace goes live.
 *
 * The meaningful onboarding duration is account-created -> first contract
 * indexed -> workspace "live", not just the wizard form. The wizard stamps a
 * durable start (`FIRST_MILE_STARTED_KEY`) that survives the hop to the
 * dashboard; this hook, mounted on the dashboard, watches `useWorkspaceMode`
 * and, the first time it reads "live", reports the elapsed time once and clears
 * the stamp.
 *
 * Honest by construction:
 * - No stamp -> never reports. Protocols onboarded before this shipped, or any
 *   session that never ran the wizard, are left alone rather than fabricated.
 * - Reports once (a localStorage guard), so a reload after going live does not
 *   re-send.
 * - Waits out `isLoading` so a slow read never times a workspace as "instantly
 *   live".
 *
 * The milestone rides the existing `POST /onboarding/track` as metadata; a
 * first-class backend `timeToValueSeconds` field stays BACKEND-GATED.
 */
export function useTimeToValue(): void {
  const { mode, isLoading } = useWorkspaceMode();
  const reportedRef = useRef(false);

  useEffect(() => {
    if (reportedRef.current) return;
    if (isLoading || mode !== "live") return;

    const startRaw = readStorage(FIRST_MILE_STARTED_KEY);
    if (!startRaw) return; // no clock running; nothing to close
    if (readStorage(TIME_TO_VALUE_REPORTED_KEY) === "1") {
      reportedRef.current = true;
      return;
    }

    const startedAtMs = Number(startRaw);
    const timeToValueSeconds = elapsedSeconds(startedAtMs);
    reportedRef.current = true;
    writeStorage(TIME_TO_VALUE_REPORTED_KEY, "1");

    apiClient
      .post("/onboarding/track", {
        stepName: "plan_selection",
        action: "completed",
        flowVersion: "onboarding-v1",
        metadata: {
          milestone: "workspace_live",
          timeToValueSeconds,
          timeToValueFormatted: formatDuration(timeToValueSeconds),
        },
      })
      .then(() => {
        // Clock is closed and reported; drop the start stamp.
        clearStorage(FIRST_MILE_STARTED_KEY);
      })
      .catch(() => {
        // Telemetry only; if the report fails, leave the stamp so a later mount
        // can retry, and let the guard be re-armed.
        reportedRef.current = false;
        clearStorage(TIME_TO_VALUE_REPORTED_KEY);
      });
  }, [mode, isLoading]);
}
