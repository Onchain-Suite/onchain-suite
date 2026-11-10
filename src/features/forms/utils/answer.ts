import type { CaptureForm } from "../forms.service";

/**
 * The Forms page's one sentence (2.7), in place of four stat cards: how many
 * forms are live, what they brought in, and which did most of it. Counts are
 * all-time submissions, which is what the list returns.
 */
export function formsAnswer(forms: CaptureForm[]): {
  live: number;
  signups: number;
  /** The live form with the most submissions, when more than one is live. */
  top?: string;
} {
  const live = forms.filter((f) => f.status === "active");
  const signups = live.reduce((sum, f) => sum + (f.submissionCount || 0), 0);
  const top =
    live.length > 1
      ? [...live].sort((a, b) => b.submissionCount - a.submissionCount)[0]
      : undefined;
  return {
    live: live.length,
    signups,
    top: top && top.submissionCount > 0 ? top.name : undefined,
  };
}
