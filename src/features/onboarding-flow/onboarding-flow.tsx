"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";

import { OrganizationSetupStep, PlanSelectionStep } from "./components";
import { OnboardingLayout } from "./components/onboarding-layout";
import {
  resolveResumeFlowStep,
  useOnboardingPersistence,
  useOnboardingTracking,
} from "./hooks";
import { type OnboardingData } from "./types";
import { useOnboardingAbandonment } from "@/features/onboarding/hooks/use-onboarding-abandonment";
import {
  FIRST_MILE_SECTOR_KEY,
  FIRST_MILE_STARTED_KEY,
  WIZARD_STARTED_KEY,
} from "@/features/onboarding/utils/onboarding-timing";
import { AUTH_ROUTES, PRIVATE_ROUTES } from "@/shared/config/app-routes";

export function OnboardingFlow() {
  const { push } = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const user = session?.user;

  React.useEffect(() => {
    if (!isPending && !session) {
      push(AUTH_ROUTES.LOGIN);
    }
  }, [session, isPending, push]);

  // Safety net: onboarding is the OWNER's journey. The backend marks
  // `user.onboardingCompleted` true for invited members on invite accept
  // (docs/backend.md 2026-07-29) - anyone carrying that flag is bounced
  // straight to the team dashboard, whatever path routed them here. New
  // owners (auto-provisioned org, flag false) still onboard normally.
  React.useEffect(() => {
    if (isPending || !session) return;
    const onboarded =
      (session.user as { onboardingCompleted?: unknown } | undefined)
        ?.onboardingCompleted === true;
    if (!onboarded) return;
    const activeOrgId = session.session?.activeOrganizationId;
    document.cookie =
      "onchain.onboardingComplete=1; Path=/; Max-Age=31536000; SameSite=Lax";
    if (typeof activeOrgId === "string" && activeOrgId.length > 0) {
      document.cookie = `onchain.selectedOrgId=${encodeURIComponent(
        activeOrgId
      )}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
    push(PRIVATE_ROUTES.DASHBOARD);
  }, [isPending, session, push]);

  React.useEffect(() => {
    const reason = searchParams?.get("reason") ?? null;
    if (reason === "missing_org") {
      toast.error("Please complete onboarding to continue.");
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (!isPending && session) {
      const now = String(Date.now());
      // Per-session wizard clock (cleared on completion).
      if (!sessionStorage.getItem(WIZARD_STARTED_KEY)) {
        sessionStorage.setItem(WIZARD_STARTED_KEY, now);
      }
      // Durable first-mile clock: survives the hop to the dashboard and reloads,
      // so time-to-value can be measured through to the workspace going live.
      // Not cleared here - `useTimeToValue` closes it.
      try {
        if (!localStorage.getItem(FIRST_MILE_STARTED_KEY)) {
          localStorage.setItem(FIRST_MILE_STARTED_KEY, now);
        }
      } catch {
        // storage blocked (private mode); time-to-value simply won't report
      }
    }
  }, [session, isPending]);

  const {
    step: currentStep,
    data: formData,
    setStep,
    setData,
  } = useOnboardingPersistence<OnboardingData>();

  const { progress, resume, trackStep, completeOnboarding } =
    useOnboardingTracking();
  const [stepStartedAtMs, setStepStartedAtMs] = React.useState<number>(
    Date.now()
  );

  // Report wizard time for protocols that leave before finishing. Measures the
  // current step's partial time (prior steps already sent their completed
  // times); `markCompleted` disarms it so a normal finish is not double-logged.
  const { markCompleted } = useOnboardingAbandonment({
    enabled: Boolean(user?.id),
    startedAtMs: stepStartedAtMs,
    stepName: currentStep === 2 ? "plan_selection" : "organization_setup",
  });
  // The server-side resume block seeds the starting step exactly once per
  // mount; afterwards local navigation + progress sync own the step.
  const resumeAppliedRef = React.useRef(false);

  const handleStepComplete = async (stepData: Partial<OnboardingData>) => {
    const now = Date.now();
    const timeSpentSeconds = Math.max(
      0,
      Math.floor((now - stepStartedAtMs) / 1000)
    );

    setData(stepData);
    const nextStep = currentStep + 1;
    setStep(nextStep);
    setStepStartedAtMs(now);

    if (user?.id) {
      await trackStep({
        stepName: "organization_setup",
        action: "completed",
        timeSpentSeconds,
        currentStep: "plan_selection",
        stepData,
        flowVersion: "onboarding-v1",
        metadata: { completionPercentage: 50 },
      });
      await trackStep({
        stepName: "plan_selection",
        action: "started",
        timeSpentSeconds: 0,
        currentStep: "plan_selection",
        flowVersion: "onboarding-v1",
      });
    }
  };

  const handleBack = () => {
    setStep(Math.max(1, currentStep - 1));
  };

  const handleOnboardingComplete = async (
    stepData: Partial<OnboardingData>
  ) => {
    // A normal finish must not also fire the abandonment flush.
    markCompleted();
    const finalData = { ...formData, ...stepData };

    // Stamp the sector durably so the dashboard first-mile can skip the
    // "index your contract" nudge for web2 clients (indexing is optional; for
    // web2 it does not apply at all).
    try {
      if (finalData.sector?.trim()) {
        localStorage.setItem(FIRST_MILE_SECTOR_KEY, finalData.sector.trim());
      }
    } catch {
      // storage blocked (private mode); the banner falls back to offering the
      // optional index nudge, which is safe.
    }

    const startRaw = sessionStorage.getItem(WIZARD_STARTED_KEY);
    const startedAtMs = startRaw ? Number(startRaw) : Date.now();
    const totalSeconds = Math.max(
      0,
      Math.floor((Date.now() - startedAtMs) / 1000)
    );
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    sessionStorage.removeItem(WIZARD_STARTED_KEY);
    localStorage.setItem(
      "onchain.onboarding.durationSeconds",
      String(totalSeconds)
    );
    localStorage.setItem("onchain.onboarding.durationFormatted", formatted);
    document.cookie = `onchain.onboarding_duration_seconds=${encodeURIComponent(
      String(totalSeconds)
    )}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.cookie = `onchain.onboarding_duration_formatted=${encodeURIComponent(
      formatted
    )}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.cookie =
      "onchain.onboardingComplete=1; Path=/; Max-Age=31536000; SameSite=Lax";

    try {
      if (user?.id) {
        await completeOnboarding({
          totalTimeSeconds: totalSeconds,
          currentStep: "plan_selection",
          stepData: finalData,
          flowVersion: "onboarding-v1",
        });
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
    push(PRIVATE_ROUTES.DASHBOARD);
  };

  React.useEffect(() => {
    if (!user?.id) return;
    if (!progress || progress.is_completed) return;

    // Resumable onboarding: an `in_progress` resume block wins for the
    // initial step (cross-device continuity), then progress sync takes over.
    const useResume =
      !resumeAppliedRef.current && resume?.status === "in_progress";
    resumeAppliedRef.current = true;
    const stepNumber = useResume
      ? resolveResumeFlowStep(resume.step)
      : progress.current_step === "plan_selection"
        ? 2
        : 1;
    if (stepNumber !== currentStep) {
      setStep(stepNumber);
      setStepStartedAtMs(Date.now());
    }

    if (progress.step_data && Object.keys(progress.step_data).length > 0) {
      setData(progress.step_data as Partial<OnboardingData>);
    }
  }, [user?.id, progress, resume, currentStep, setData, setStep]);

  React.useEffect(() => {
    if (!user?.id) return;
    if (currentStep === 1) {
      trackStep({
        stepName: "organization_setup",
        action: "started",
        currentStep: "organization_setup",
        flowVersion: "onboarding-v1",
      }).catch(() => {});
    }
  }, [user?.id, currentStep, trackStep]);

  const renderStep = () => {
    const commonProps = {
      initialData: formData,
      onBack: handleBack,
    };

    switch (currentStep) {
      case 1:
        return (
          <OrganizationSetupStep
            initialData={formData}
            onNext={handleStepComplete}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <PlanSelectionStep
            {...commonProps}
            onNext={handleOnboardingComplete}
          />
        );
      default:
        return (
          <div className="text-center">
            <h1 className="text-foreground mb-4 text-3xl font-bold">
              Welcome to Onchain Suite!
            </h1>
            <p className="text-muted-foreground">
              Your account has been set up successfully.
            </p>
          </div>
        );
    }
  };

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={2}>
      {renderStep()}
    </OnboardingLayout>
  );
}
