import type { RetentionCohortsReport } from "../contracts/reports";

/** The cohort grid's rows: share of each cohort still active, by week since joining. Pure. */

export interface CohortRow {
  label: string;
  size: number;
  /** Percent still active at week 0..n; null where the week has not happened yet. */
  cells: Array<number | null>;
}

export function cohortGrid(
  report: RetentionCohortsReport,
  weeks = 8
): CohortRow[] {
  return report.cohorts
    .filter((c) => c.size > 0)
    .slice(-weeks)
    .map((c) => {
      const d = new Date(c.cohortWeek);
      const label = Number.isNaN(d.getTime())
        ? c.cohortWeek
        : d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          });
      return {
        label,
        size: c.size,
        cells: Array.from({ length: weeks }, (_, k) =>
          k < c.retained.length
            ? Math.round(((c.retained[k] ?? 0) / c.size) * 1000) / 10
            : null
        ),
      };
    });
}
