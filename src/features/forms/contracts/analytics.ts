/**
 * Form performance analytics (backend.md - forms analytics).
 *
 * The funnel is view -> start -> completion. Only completions are reliably
 * available today (they are the submissions we store); views and starts need a
 * backend that tracks the hosted page's view and first-interaction events, which
 * is not deployed yet - so every funnel field is OPTIONAL and the UI shows an
 * honest "not tracked yet" state rather than a fabricated number.
 *
 * Types only; no runtime. Safe to import from anywhere.
 */

export type FormAnalyticsRange = "7d" | "30d" | "90d" | "all";

export interface FormAnalyticsFunnel {
  /** Visitors who saw the form. Undefined when views are not tracked yet. */
  views?: number;
  /** Visitors who began the form (e.g. reached the wallet-connect step). */
  starts?: number;
  /** Completed submissions in the range. */
  completions?: number;
  /**
   * A one-line "biggest drop-off" insight, when the backend computes it (e.g.
   * "4,820 visitors saw the form but didn't start"). Optional.
   */
  biggestDropOff?: string;
  /** The range this payload reflects, echoed back by the backend. */
  range?: FormAnalyticsRange;
}

export const FORM_ANALYTICS_RANGES: Array<{
  value: FormAnalyticsRange;
  label: string;
}> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];
