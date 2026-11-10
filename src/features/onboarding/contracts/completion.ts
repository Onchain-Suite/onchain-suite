/*
 * Onboarding completion: `GET /onboarding/progress` (the part the app reads to
 * decide whether someone has finished) and `POST /onboarding/complete`.
 * Types only.
 */

/** `resume.status` on the progress payload. */
export type OnboardingStatus = "not_started" | "in_progress" | "completed";

/** What the app needs to know from the progress payload. */
export interface OnboardingState {
  status: OnboardingStatus;
  /** 0-100 when the backend reports it. */
  completionPercentage: number | null;
}

/**
 * Body of `POST /onboarding/complete`. The endpoint is idempotent (2026-11-10):
 * a repeat call changes nothing but merges new `stepData`, so it is safe to
 * retry.
 */
export interface CompleteOnboardingBody {
  totalTimeSeconds?: number;
  currentStep?: string;
  stepData?: Record<string, unknown>;
  flowVersion?: string;
  /**
   * The server never recorded a completion we know happened. It records one
   * without a duration, so it stays out of the average completion time.
   */
  repaired?: boolean;
}
