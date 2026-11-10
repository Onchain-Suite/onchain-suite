import { apiClient } from "@/lib/api-client";
import { isJsonObject } from "@/lib/utils";

import type {
  CompleteOnboardingBody,
  OnboardingState,
  OnboardingStatus,
} from "./contracts/completion";

export type {
  CompleteOnboardingBody,
  OnboardingState,
  OnboardingStatus,
} from "./contracts/completion";

const TIMEOUT_MS = 10_000;
/** The backend allows 3 requests / 10 seconds on these routes. */
const RATE_LIMIT_WINDOW_MS = 10_500;
const SILENT = { "x-onchain-silent-error": "1" };

const STATUSES: OnboardingStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];
const isStatus = (v: unknown): v is OnboardingStatus =>
  STATUSES.includes(v as OnboardingStatus);

/**
 * The progress payload as the one fact the app needs. The envelope has varied
 * (`{ data }`, `{ data: { progress } }`, flat), and `resume` may sit beside
 * the progress object or inside it, so each is checked.
 */
export function toOnboardingState(payload: unknown): OnboardingState {
  const data =
    isJsonObject(payload) && "data" in payload ? payload.data : payload;
  const obj = isJsonObject(data) ? data : {};
  const nested = isJsonObject(obj.data) ? obj.data : {};
  const candidate = obj.progress ?? nested.progress ?? obj;
  const progress = isJsonObject(candidate) ? candidate : {};

  const resume = [obj.resume, nested.resume, progress.resume].find(
    isJsonObject
  );
  const completed =
    progress.isCompleted === true || progress.is_completed === true;
  const status: OnboardingStatus = completed
    ? "completed"
    : resume && isStatus(resume.status)
      ? resume.status
      : "not_started";

  const pct = progress.completionPercentage ?? progress.completion_percentage;
  return {
    status,
    completionPercentage: typeof pct === "number" ? pct : null,
  };
}

const isRateLimited = (error: unknown) =>
  isJsonObject(error) &&
  isJsonObject(error.response) &&
  error.response.status === 429;

export const completionService = {
  /** Where the signed-in person is with onboarding, per the server. */
  async getState(signal?: AbortSignal): Promise<OnboardingState> {
    const res = await apiClient.get<unknown>("/onboarding/progress", {
      signal,
      timeout: TIMEOUT_MS,
      headers: SILENT,
    });
    return toOnboardingState(res.data);
  },

  /**
   * Records completion. Idempotent on the server, so this rides out one
   * rate-limit window and callers may retry it later without harm.
   */
  async complete(body: CompleteOnboardingBody): Promise<void> {
    const post = () =>
      apiClient.post("/onboarding/complete", body, {
        timeout: TIMEOUT_MS,
        headers: SILENT,
      });
    try {
      await post();
    } catch (error) {
      if (!isRateLimited(error)) throw error;
      await new Promise((resolve) => {
        window.setTimeout(resolve, RATE_LIMIT_WINDOW_MS);
      });
      await post();
    }
  },
};
