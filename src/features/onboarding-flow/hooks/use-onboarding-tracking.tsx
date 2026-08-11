"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { isJsonObject } from "@/lib/utils";

type OnboardingStep =
  | "welcome"
  | "personal_info"
  | "business_address"
  | "organization_type"
  | "business_goal"
  | "important_features"
  | "contact_count"
  | "organization_setup"
  | "plan_selection";

interface OnboardingProgress {
  current_step: OnboardingStep;
  completion_percentage: number;
  step_data: Record<string, unknown>;
  is_completed: boolean;
}

export type OnboardingResumeStatus =
  "not_started" | "in_progress" | "completed";

/**
 * Resumable-onboarding block from `GET /onboarding/progress`
 * (docs/backend.md 2026-07-14 follow-up 4): route `in_progress` users back to
 * `resume.step` on login.
 */
export interface OnboardingResume {
  status: OnboardingResumeStatus;
  step: string | number | null;
  lastSeenAt: string | null;
}

interface UseOnboardingTracking {
  progress: OnboardingProgress | null;
  resume: OnboardingResume | null;
  isLoading: boolean;
  trackStep: (payload: {
    stepName: OnboardingStep;
    action: "started" | "completed" | "skipped";
    timeSpentSeconds?: number;
    currentStep?: OnboardingStep;
    stepData?: Record<string, unknown>;
    flowVersion?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  completeOnboarding: (payload: {
    totalTimeSeconds?: number;
    currentStep?: OnboardingStep;
    stepData?: Record<string, unknown>;
    flowVersion?: string;
  }) => Promise<void>;
}

const isRateLimited = (error: unknown) =>
  isJsonObject(error) &&
  isJsonObject(error.response) &&
  error.response.status === 429;

/**
 * POST that retries once after the backend's rate-limit window (3 requests /
 * 10 seconds) when it hits a 429, instead of failing immediately.
 */
async function postWithRateLimitRetry(
  url: string,
  body: Record<string, unknown>
): Promise<void> {
  try {
    await apiClient.post(url, body);
  } catch (error) {
    if (!isRateLimited(error)) throw error;
    await new Promise((resolve) => {
      window.setTimeout(resolve, 10_500);
    });
    await apiClient.post(url, body);
  }
}

const STEP_MAPPING: Record<number, OnboardingStep> = {
  1: "personal_info",
  2: "business_address",
  3: "organization_type",
  4: "business_goal",
  5: "important_features",
  6: "contact_count",
  7: "plan_selection",
};

const COMPLETION_PERCENTAGES: Record<OnboardingStep, number> = {
  welcome: 0,
  personal_info: 14,
  business_address: 28,
  organization_type: 42,
  business_goal: 57,
  important_features: 71,
  contact_count: 85,
  organization_setup: 50,
  plan_selection: 100,
};

const normalizeResume = (value: unknown): OnboardingResume | null => {
  if (!isJsonObject(value)) return null;
  const { status } = value;
  if (
    status !== "not_started" &&
    status !== "in_progress" &&
    status !== "completed"
  ) {
    return null;
  }
  return {
    status,
    step:
      typeof value.step === "string" || typeof value.step === "number"
        ? value.step
        : null,
    lastSeenAt: typeof value.lastSeenAt === "string" ? value.lastSeenAt : null,
  };
};

/**
 * Map the backend's `resume.step` (step name or numeric index) onto the
 * routed onboarding flow's two screens: 1 = organization setup,
 * 2 = plan selection. Unknown values fall back to step 1 - restarting a
 * screen early is safe, skipping one is not.
 */
export function resolveResumeFlowStep(step: OnboardingResume["step"]): 1 | 2 {
  const stepName =
    typeof step === "number" ? STEP_MAPPING[step] : (step ?? undefined);
  return stepName === "plan_selection" ? 2 : 1;
}

export function useOnboardingTracking(): UseOnboardingTracking {
  const { data: session } = useSession();
  const user = session?.user;
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [resume, setResume] = useState<OnboardingResume | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing progress on mount
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const loadProgress = async () => {
      try {
        const res = await apiClient.get("/onboarding/progress");
        const payload: unknown = res.data;
        const data =
          isJsonObject(payload) && "data" in payload ? payload.data : payload;
        const dataObj = isJsonObject(data) ? data : undefined;
        const nestedData = isJsonObject(dataObj?.data)
          ? dataObj.data
          : undefined;
        const pCandidate =
          dataObj?.progress ??
          nestedData?.progress ??
          dataObj?.progressData ??
          dataObj ??
          data;
        const p = isJsonObject(pCandidate) ? pCandidate : undefined;

        // The `resume` block rides alongside the progress payload (it may be
        // at the envelope level or nested with the progress object).
        setResume(
          normalizeResume(dataObj?.resume) ??
            normalizeResume(nestedData?.resume) ??
            normalizeResume(isJsonObject(p) ? p.resume : undefined)
        );

        if (
          p &&
          ("currentStep" in p ||
            "current_step" in p ||
            "isCompleted" in p ||
            "is_completed" in p)
        ) {
          const stepCandidate =
            p.current_step ?? p.currentStep ?? p.current_step_name ?? "welcome";
          setProgress({
            current_step:
              typeof stepCandidate === "string"
                ? (stepCandidate as OnboardingStep)
                : "welcome",
            completion_percentage:
              typeof p.completion_percentage === "number"
                ? p.completion_percentage
                : typeof p.completionPercentage === "number"
                  ? p.completionPercentage
                  : 0,
            step_data: isJsonObject(p.step_data)
              ? p.step_data
              : isJsonObject(p.stepData)
                ? p.stepData
                : {},
            is_completed:
              typeof p.is_completed === "boolean"
                ? p.is_completed
                : typeof p.isCompleted === "boolean"
                  ? p.isCompleted
                  : false,
          });
        }
      } catch (error) {
        console.error("Error loading onboarding progress:", error);
        toast.error("Failed to load onboarding progress");
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [user?.id]);

  const trackStep = useCallback(
    async (payload: {
      stepName: OnboardingStep;
      action: "started" | "completed" | "skipped";
      timeSpentSeconds?: number;
      currentStep?: OnboardingStep;
      stepData?: Record<string, unknown>;
      flowVersion?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id) {
        toast.error("User not authenticated");
        return;
      }

      const updatedStepData = payload.stepData ?? {};

      // Update local progress immediately - tracking is telemetry and must
      // never gate the user's step transition.
      const completionFromMeta =
        isJsonObject(payload.metadata) &&
        typeof payload.metadata.completionPercentage === "number"
          ? payload.metadata.completionPercentage
          : undefined;
      const completionPercentage =
        completionFromMeta ?? COMPLETION_PERCENTAGES[payload.stepName] ?? 0;

      setProgress((prev) => ({
        current_step: payload.currentStep ?? payload.stepName,
        completion_percentage: completionPercentage,
        step_data: {
          ...(prev?.step_data ?? {}),
          ...updatedStepData,
        },
        is_completed: false,
      }));

      // Fire-and-forget: the backend rate-limits at 3 requests / 10s, and a
      // step transition can fire multiple track events on top of the flow's
      // real API calls. A 429 (or any failure) must not surface an error or
      // block onboarding - retry once after the limit window, then give up
      // quietly.
      postWithRateLimitRetry("/onboarding/track", {
        stepName: payload.stepName,
        action: payload.action,
        timeSpentSeconds: payload.timeSpentSeconds,
        currentStep: payload.currentStep,
        stepData: updatedStepData,
        flowVersion: payload.flowVersion ?? "frontend-v1",
        metadata: payload.metadata,
      }).catch((error) => {
        console.warn("Onboarding step tracking failed (non-fatal):", error);
      });
    },
    [user?.id]
  );

  const completeOnboarding = useCallback(
    async (payload: {
      totalTimeSeconds?: number;
      currentStep?: OnboardingStep;
      stepData?: Record<string, unknown>;
      flowVersion?: string;
    }) => {
      if (!user?.id) {
        toast.error("User not authenticated");
        return;
      }

      try {
        const completeStepData = payload.stepData ?? {};

        // Completion is a real state change (unlike track), so we await it -
        // but ride out a rate-limit window instead of failing outright.
        await postWithRateLimitRetry("/onboarding/complete", {
          totalTimeSeconds: payload.totalTimeSeconds,
          currentStep: payload.currentStep,
          stepData: completeStepData,
          flowVersion: payload.flowVersion ?? "frontend-v1",
        });

        setProgress((prev) => ({
          current_step: (payload.currentStep ??
            "plan_selection") as OnboardingStep,
          completion_percentage: 100,
          step_data: {
            ...(prev?.step_data ?? {}),
            ...completeStepData,
          },
          is_completed: true,
        }));

        toast.success("Onboarding completed successfully!");
      } catch (error) {
        console.error("Error completing onboarding:", error);
        toast.error("Failed to complete onboarding");
      }
    },
    [user?.id]
  );

  return {
    progress,
    resume,
    isLoading,
    trackStep,
    completeOnboarding,
  };
}

// Helper function to get step from number
export function getStepFromNumber(stepNumber: number): OnboardingStep {
  return STEP_MAPPING[stepNumber] || "welcome";
}

// Helper function to get completion percentage for step
export function getCompletionPercentage(step: OnboardingStep): number {
  return COMPLETION_PERCENTAGES[step] || 0;
}

export async function fetchOnboardingAdminSummary(params?: {
  from?: string;
  to?: string;
}) {
  const res = await apiClient.get("/onboarding/admin/summary", { params });
  const payload: unknown = res.data;
  return isJsonObject(payload) && "data" in payload ? payload.data : payload;
}
