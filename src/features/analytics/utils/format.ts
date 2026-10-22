import type { ChartData } from "../contracts/dashboards";

/** Formatting for analytics numbers. Pure; one place so every card agrees. */

const COUNT = new Intl.NumberFormat("en-US");
const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatCount = (
  n: number | null | undefined,
  compact = false
): string =>
  typeof n === "number" && Number.isFinite(n)
    ? compact && Math.abs(n) >= 10_000
      ? COMPACT.format(n)
      : COUNT.format(Math.round(n))
    : "–";

export const formatPercent = (n: number | null | undefined): string =>
  typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(1)}%` : "–";

/** Seconds as the largest sensible unit: "45s", "12 min", "3.2 h", "1.4 days". */
export function formatDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "–";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86_400) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86_400).toFixed(1)} days`;
}

export const formatValue = (
  n: number | null | undefined,
  unit: ChartData["unit"]
): string =>
  unit === "percent"
    ? formatPercent(n)
    : unit === "seconds"
      ? formatDuration(n)
      : formatCount(n);

export interface Delta {
  text: string;
  tone: "up" | "down" | "flat";
}

/**
 * A change against the previous period. Rates move in points ("+3.1pt"),
 * counts in percent ("+12.4%"). Null means there was nothing to compare with.
 */
export function formatDelta(
  current: number | null,
  previous: number | null,
  changePct: number | null,
  kind: "count" | "rate"
): Delta | null {
  if (kind === "rate") {
    if (current === null || previous === null) return null;
    const pt = Math.round((current - previous) * 10) / 10;
    return {
      text: `${pt > 0 ? "+" : ""}${pt.toFixed(1)}pt`,
      tone: pt > 0 ? "up" : pt < 0 ? "down" : "flat",
    };
  }
  if (changePct === null) return null;
  return {
    text: `${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%`,
    tone: changePct > 0 ? "up" : changePct < 0 ? "down" : "flat",
  };
}
