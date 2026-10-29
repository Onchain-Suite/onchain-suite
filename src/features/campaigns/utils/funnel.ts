// Pure helpers for rendering the conversion funnel. Kept out of the component
// so they can be unit tested without rendering (CLAUDE.md s15.4).

/** A count as a percentage of a denominator; 0 when the denominator is 0. */
export const rate = (n: number, d: number): number =>
  d > 0 ? (n / d) * 100 : 0;

/** `rate` formatted as a 1-decimal percent string. */
export const pct = (n: number, d: number): string =>
  `${rate(n, d).toFixed(1)}%`;

/**
 * Bar width for a stage, as a CSS percentage string of `reached`. A non-zero
 * value floors at 2% so a tiny-but-present stage is still visible; a zero stays
 * 0 (a failed send draws nothing), matching the 2.7 funnel.
 */
export const barWidth = (n: number, reached: number): string => {
  if (reached <= 0 || n <= 0) return "0%";
  return `${Math.max(2, (n / reached) * 100)}%`;
};
