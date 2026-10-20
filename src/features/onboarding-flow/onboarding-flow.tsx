"use client";

import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { useSession } from "@/lib/auth-client";

import { PlanSelectionStep } from "./components";
import {
  GuidedShell,
  type IllustrationLit,
  StepContract,
  StepDns,
  StepProject,
  StepTechnical,
} from "./components/guided";
import {
  EMPTY_PROFILE,
  flowFor,
  profileReady,
  type ProjectProfile,
  type Role,
  type StepId,
} from "./constants/guided";
import {
  resolveResumeFlowStep,
  useCreateOrganization,
  useOnboardingPersistence,
  useOnboardingTracking,
} from "./hooks";
import { type SuggestedContract } from "./onboarding.service";
import { type OnboardingData } from "./types";
import { useOnboardingAbandonment } from "@/features/onboarding/hooks/use-onboarding-abandonment";
import {
  FIRST_MILE_SECTOR_KEY,
  FIRST_MILE_STARTED_KEY,
  WIZARD_STARTED_KEY,
} from "@/features/onboarding/utils/onboarding-timing";
import { AUTH_ROUTES, PRIVATE_ROUTES } from "@/shared/config/app-routes";

const FLOW_VERSION = "onboarding-guided-v2";

// Which region of the product preview each step lights.
const LIT_FOR: Record<StepId, IllustrationLit> = {
  project: "workspace",
  technical: "channels",
  dns: "channels",
  contract: "audience",
  plan: "charts",
};

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
    data: formData,
    setStep,
    setData,
  } = useOnboardingPersistence<OnboardingData>();

  const { progress, resume, trackStep, completeOnboarding } =
    useOnboardingTracking();
  const createOrganization = useCreateOrganization();

  // The guided flow branches on who sets up the technical side (Section 0.5). Step index is the
  // position within that branched flow; the backend only knows `organization_setup` and
  // `plan_selection`, so everything up to the plan is tracked as the former.
  const [role, setRole] = React.useState<Role>("builder");
  const [profile, setProfile] = React.useState<ProjectProfile>(EMPTY_PROFILE);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [stepStartedAtMs, setStepStartedAtMs] = React.useState<number>(
    Date.now()
  );
  const [busy, setBusy] = React.useState(false);
  // The developer invited from the technical step, so the DNS step can say the
  // records travel with that invite.
  const [handoffSentTo, setHandoffSentTo] = React.useState<string | null>(null);
  // Contracts accepted from the suggestion panel on the contract step. They ride
  // along in the completion payload and seed index-after-plan.
  const [picked, setPicked] = React.useState<SuggestedContract[]>([]);

  const pickedKey = (c: SuggestedContract) =>
    `${c.name}::${c.chainHint}::${c.address ?? ""}`;
  const acceptContract = React.useCallback((c: SuggestedContract) => {
    setPicked((prev) =>
      prev.some((x) => pickedKey(x) === pickedKey(c)) ? prev : [...prev, c]
    );
  }, []);
  const removeContract = React.useCallback((c: SuggestedContract) => {
    setPicked((prev) => prev.filter((x) => pickedKey(x) !== pickedKey(c)));
  }, []);
  // Handing the technical setup over drops the contract step, so a pick made
  // before switching must not linger into completion.
  const chooseRole = React.useCallback((r: Role) => {
    setRole(r);
    if (r === "operator") setPicked([]);
  }, []);

  const flow = flowFor(role);
  const at: StepId = flow[Math.min(stepIndex, flow.length - 1)];

  // Report wizard time for protocols that leave before finishing. Measures the
  // current step's partial time (prior steps already sent their completed
  // times); `markCompleted` disarms it so a normal finish is not double-logged.
  const { markCompleted } = useOnboardingAbandonment({
    enabled: Boolean(user?.id),
    startedAtMs: stepStartedAtMs,
    stepName: at === "plan" ? "plan_selection" : "organization_setup",
  });

  // The server-side resume block seeds the starting step exactly once per
  // mount; afterwards local navigation + progress sync own the step.
  const resumeAppliedRef = React.useRef(false);
  // Seed the profile from persisted/resumed data exactly once.
  const seededRef = React.useRef(false);
  // The org is created on leaving the project step; guard against a repeat if
  // the user steps back into it and forward again.
  const orgCreatedRef = React.useRef(false);

  // Mirror the guided step into the persistence layer (URL `?step=` + localStorage) so a reload
  // or cross-device resume lands on the right screen.
  React.useEffect(() => {
    setStep(stepIndex + 1);
  }, [stepIndex, setStep]);

  // Seed the project profile from whatever the persistence/resume layer restored.
  React.useEffect(() => {
    if (seededRef.current) return;
    if (formData.organizationName || formData.websiteUrl || formData.sector) {
      seededRef.current = true;
      setProfile((p) => ({
        ...p,
        name: formData.organizationName ?? p.name,
        website: formData.websiteUrl ?? p.website,
        sector: formData.sector ?? p.sector,
        description: formData.description ?? p.description,
      }));
    }
  }, [formData]);

  const persistProfile = React.useCallback(
    (p: ProjectProfile) => {
      setData({
        organizationName: p.name,
        websiteUrl: p.website,
        sector: p.sector,
        description: p.description,
      });
    },
    [setData]
  );

  const goToIndex = (next: number) => {
    setStepIndex(next);
    setStepStartedAtMs(Date.now());
  };

  const handleBack = () => {
    if (stepIndex > 0) goToIndex(stepIndex - 1);
  };

  const handleContinue = async () => {
    const now = Date.now();
    const timeSpentSeconds = Math.max(
      0,
      Math.floor((now - stepStartedAtMs) / 1000)
    );

    if (at === "project") {
      if (!profileReady(profile) || busy) return;
      persistProfile(profile);

      if (!orgCreatedRef.current) {
        setBusy(true);
        const ok = await createOrganization({
          name: profile.name,
          websiteUrl: profile.website,
          description: profile.description,
        });
        setBusy(false);
        if (!ok) return;
        orgCreatedRef.current = true;

        if (user?.id) {
          trackStep({
            stepName: "organization_setup",
            action: "completed",
            timeSpentSeconds,
            currentStep: "organization_setup",
            stepData: {
              organizationName: profile.name,
              websiteUrl: profile.website,
              sector: profile.sector,
            },
            flowVersion: FLOW_VERSION,
            metadata: { completionPercentage: 50 },
          }).catch(() => {});
        }
      }
      goToIndex(stepIndex + 1);
      return;
    }

    // technical / dns / contract: nothing here blocks. Only the hop into the
    // plan step is worth a track event (it is a real backend step).
    const next = stepIndex + 1;
    if (flow[next] === "plan" && user?.id) {
      trackStep({
        stepName: "plan_selection",
        action: "started",
        timeSpentSeconds: 0,
        currentStep: "plan_selection",
        flowVersion: FLOW_VERSION,
      }).catch(() => {});
    }
    goToIndex(next);
  };

  const handleOnboardingComplete = async (
    stepData: Partial<OnboardingData>
  ) => {
    // A normal finish must not also fire the abandonment flush.
    markCompleted();
    const finalData = {
      ...formData,
      ...stepData,
      sector: profile.sector,
      ...(picked.length > 0 ? { contracts: picked } : {}),
    };

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
          flowVersion: FLOW_VERSION,
        });
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
    push(PRIVATE_ROUTES.DASHBOARD);
  };

  // Resumable onboarding: an `in_progress` resume block wins for the initial
  // step (cross-device continuity), then local navigation takes over. The
  // guided flow collapses the backend's two known steps onto its own ends -
  // `plan_selection` resumes at the plan step, anything else at the project
  // step (restarting a screen early is safe; skipping one is not).
  React.useEffect(() => {
    if (!user?.id) return;
    if (!progress || progress.is_completed) return;

    const useResume =
      !resumeAppliedRef.current && resume?.status === "in_progress";
    resumeAppliedRef.current = true;
    const landsOnPlan = useResume
      ? resolveResumeFlowStep(resume.step) === 2
      : progress.current_step === "plan_selection";
    const target = landsOnPlan ? flow.length - 1 : 0;
    if (target !== stepIndex) {
      setStepIndex(target);
      setStepStartedAtMs(Date.now());
    }

    if (progress.step_data && Object.keys(progress.step_data).length > 0) {
      setData(progress.step_data as Partial<OnboardingData>);
    }
  }, [user?.id, progress, resume, stepIndex, flow.length, setData]);

  // organization_setup starts when the project step is on screen.
  React.useEffect(() => {
    if (!user?.id) return;
    if (at === "project") {
      trackStep({
        stepName: "organization_setup",
        action: "started",
        currentStep: "organization_setup",
        flowVersion: FLOW_VERSION,
      }).catch(() => {});
    }
  }, [user?.id, at, trackStep]);

  // The plan step owns the full-width pricing layout and its own Back/Continue
  // (shared PlanPicker), so it renders outside the guided shell.
  if (at === "plan") {
    return (
      <PlanSelectionStep
        initialData={formData}
        onBack={handleBack}
        onNext={handleOnboardingComplete}
      />
    );
  }

  const skipping =
    at === "dns" ||
    (at === "contract" && !profile.contract.trim() && picked.length === 0);
  const continueDisabled = busy || (at === "project" && !profileReady(profile));

  return (
    <GuidedShell
      stepIndex={stepIndex}
      flow={flow}
      lit={LIT_FOR[at]}
      footer={
        <>
          {stepIndex > 0 ? (
            <Button variant="secondary" onClick={handleBack} disabled={busy}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant={skipping ? "secondary" : "default"}
            onClick={handleContinue}
            disabled={continueDisabled}
          >
            {busy ? "Saving…" : skipping ? "Skip for now" : "Continue"}
            {!busy && !skipping ? (
              <ArrowRightIcon aria-hidden="true" className="ml-1.5 h-4 w-4" />
            ) : null}
          </Button>
        </>
      }
    >
      {at === "project" && (
        <StepProject
          value={profile}
          onChange={setProfile}
          onEnter={handleContinue}
        />
      )}
      {at === "technical" && (
        <StepTechnical
          role={role}
          onRole={chooseRole}
          onHandoffSent={setHandoffSentTo}
        />
      )}
      {at === "dns" && (
        <StepDns
          handingOver={role === "operator"}
          handoffSent={Boolean(handoffSentTo)}
          website={profile.website}
        />
      )}
      {at === "contract" && (
        <StepContract
          value={profile.contract}
          onChange={(v) => setProfile((p) => ({ ...p, contract: v }))}
          picked={picked}
          onAccept={acceptContract}
          onRemove={removeContract}
          projectName={profile.name}
          sector={profile.sector}
        />
      )}
    </GuidedShell>
  );
}
