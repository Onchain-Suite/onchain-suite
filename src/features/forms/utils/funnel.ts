/**
 * Form performance funnel math (view -> start -> completion).
 *
 * Pure and honest: a percentage is computed ONLY when both its numerator and a
 * positive denominator are known, so an untracked views count never produces a
 * fake conversion rate. The derived "biggest drop-off" line is emitted only when
 * the data supports it; the backend's own line, when present, wins.
 */

export interface FunnelInput {
  views?: number;
  starts?: number;
  completions?: number;
}

export interface FunnelView extends FunnelInput {
  /** starts / views, one decimal, when both known. */
  startsPctOfViews?: number;
  /** completions / starts, one decimal, when both known. */
  completionsPctOfStarts?: number;
  /** completions / views, one decimal, when both known. */
  completionsPctOfViews?: number;
  /** One-line biggest drop-off, backend-provided or derived. */
  dropOff?: string;
}

/** Round a ratio to a one-decimal percentage, or undefined if not computable. */
export function pct(part?: number, whole?: number): number | undefined {
  if (typeof part !== "number" || typeof whole !== "number") return undefined;
  if (whole <= 0) return undefined;
  return Math.round((part / whole) * 1000) / 10;
}

export function computeFunnel(
  input: FunnelInput,
  biggestDropOff?: string
): FunnelView {
  const { views, starts, completions } = input;

  const startsPctOfViews = pct(starts, views);
  const completionsPctOfStarts = pct(completions, starts);
  const completionsPctOfViews = pct(completions, views);

  const trimmed = biggestDropOff?.trim();
  let dropOff = trimmed && trimmed.length > 0 ? trimmed : undefined;
  if (!dropOff && typeof views === "number" && typeof starts === "number") {
    const didNotStart = views - starts;
    if (didNotStart > 0) {
      dropOff = `${didNotStart.toLocaleString()} visitor${
        didNotStart === 1 ? "" : "s"
      } saw the form but didn't start.`;
    }
  }

  return {
    views,
    starts,
    completions,
    startsPctOfViews,
    completionsPctOfStarts,
    completionsPctOfViews,
    dropOff,
  };
}
