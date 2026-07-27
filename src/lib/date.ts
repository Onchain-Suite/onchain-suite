/**
 * Canonical date/time formatting for the whole app.
 *
 * Backend timestamps arrive as ISO-8601 (`2026-07-22T08:37:01.061Z`). That is
 * a wire format, never something to render — surface one of these instead so
 * dates read the same way on every screen.
 *
 * All of them are locale-aware (`undefined` locale = the viewer's) and return
 * `""` for missing/unparseable input, so callers can render the result
 * directly without guarding.
 */

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && value.trim().length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** True when the value is a timestamp we can render. */
export const isDateLike = (value: unknown): boolean =>
  parseDate(value) !== null;

/** Absolute date + time ("Jul 22, 2026, 8:37 AM"). */
export function formatDateTime(value: unknown): string {
  const date = parseDate(value);
  if (!date) return "";
  try {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return date.toLocaleString();
  }
}

/** Absolute date only ("Jul 22, 2026") — for columns where time is noise. */
export function formatDate(value: unknown): string {
  const date = parseDate(value);
  if (!date) return "";
  try {
    return date.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return date.toLocaleDateString();
  }
}

const RELATIVE_UNITS: Array<{
  unit: Intl.RelativeTimeFormatUnit;
  seconds: number;
}> = [
  { unit: "year", seconds: 31_536_000 },
  { unit: "month", seconds: 2_592_000 },
  { unit: "week", seconds: 604_800 },
  { unit: "day", seconds: 86_400 },
  { unit: "hour", seconds: 3_600 },
  { unit: "minute", seconds: 60 },
];

/** Relative timestamp ("3 hours ago", "last week") for recency-oriented UI. */
export function formatRelativeTime(value: unknown): string {
  const date = parseDate(value);
  if (!date) return "";
  const deltaSeconds = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(deltaSeconds);
  if (abs < 60) return "just now";
  try {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    for (const { unit, seconds } of RELATIVE_UNITS) {
      if (abs >= seconds) {
        return rtf.format(Math.round(deltaSeconds / seconds), unit);
      }
    }
    return "just now";
  } catch {
    return formatDateTime(value);
  }
}

/**
 * Recency-first label with the exact timestamp for the `title` attribute:
 * `{ label: "3 hours ago", title: "Jul 22, 2026, 8:37 AM" }`. Use for
 * "Saved …" / "Last edited …" style text, where the reader wants "how long
 * ago" at a glance but occasionally needs the precise time.
 */
export function formatTimestampParts(value: unknown): {
  label: string;
  title: string;
} {
  return {
    label: formatRelativeTime(value),
    title: formatDateTime(value),
  };
}
