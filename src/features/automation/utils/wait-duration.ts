import { parseDurationToSeconds } from "./builder-issues";

/**
 * A wait's length as the panel edits it: a number and a unit, side by side,
 * stored the way the runtime reads it (`duration` prose plus `seconds`).
 */

export type WaitUnit = "minutes" | "hours" | "days" | "weeks";

export const WAIT_UNITS: WaitUnit[] = ["minutes", "hours", "days", "weeks"];

const UNIT_SECONDS: Record<WaitUnit, number> = {
  minutes: 60,
  hours: 3600,
  days: 86400,
  weeks: 604800,
};

/** The amount and unit a stored wait reads as; days when nothing is set. */
export function readWait(data: { duration?: unknown; seconds?: unknown }): {
  amount: string;
  unit: WaitUnit;
} {
  const seconds =
    typeof data.seconds === "number" && data.seconds > 0
      ? data.seconds
      : parseDurationToSeconds(data.duration);
  if (seconds <= 0) return { amount: "", unit: "days" };
  // The largest unit that divides it evenly, so "2 days" reads as 2 days.
  for (const unit of [...WAIT_UNITS].reverse()) {
    if (seconds % UNIT_SECONDS[unit] === 0) {
      return { amount: String(seconds / UNIT_SECONDS[unit]), unit };
    }
  }
  return {
    amount: String(Math.max(1, Math.round(seconds / 60))),
    unit: "minutes",
  };
}

/** What a wait stores for an amount and unit; an empty amount clears it. */
export function writeWait(
  amount: string,
  unit: WaitUnit
): { duration: string; seconds: number } {
  const n = Number(amount);
  if (!amount.trim() || !Number.isFinite(n) || n <= 0) {
    return { duration: "", seconds: 0 };
  }
  const label = n === 1 ? unit.slice(0, -1) : unit;
  return {
    duration: `${n} ${label}`,
    seconds: Math.round(n * UNIT_SECONDS[unit]),
  };
}
