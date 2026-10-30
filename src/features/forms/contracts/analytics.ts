/**
 * Form performance analytics (backend.md - forms analytics).
 *
 * The funnel is view -> start -> completion. Completions are the submissions we
 * store; views and starts come from the hosted page's beacon (deduped per
 * anonymous session). Every funnel field is OPTIONAL so the UI shows an honest
 * "not tracked yet" state rather than a fabricated number when the beacon has
 * not reported yet.
 *
 * Types only; no runtime. Safe to import from anywhere.
 */

export type FormAnalyticsRange = "7d" | "30d" | "90d" | "all";

/** Traffic source to a hosted form, by unique viewing session. */
export interface FormSourceCount {
  source: string;
  views: number;
}

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
  /** Top traffic sources by unique viewing session; empty/undefined until tracked. */
  bySource?: FormSourceCount[];
  /** The range this payload reflects, echoed back by the backend. */
  range?: FormAnalyticsRange;

  /** Double-opt-in funnel (undefined until the backend returns it). */
  doubleOptIn?: boolean;
  /** Total submissions in the range. */
  submissions?: number;
  /** Confirmation emails sent — incl. operator re-sends ("we emailed them"). */
  confirmationsSent?: number;
  /** Submitters who clicked the confirmation link. */
  confirmed?: number;
  /** Emailed but not yet confirmed (= confirmationsSent − confirmed). */
  pendingConfirmation?: number;
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
