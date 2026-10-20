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
  StepContract,
  StepDns,
  StepProject,
  StepTechnical,
} from "./components/guided";
import {
  type ContractDraft,
  EMPTY_PROFILE,
  flowFor,
  type OnboardingContract,
  profileReady,
  type ProjectProfile,
  type Role,
  type StepId,
} from "./constants/guided";
import { chainByKey, DEFAULT_CHAIN } from "./data/chains";
import {
  resolveResumeFlowStep,
  useCreateOrganization,
  useOnboardingPersistence,
  useOnboardingTracking,
} from "./hooks";
import {
  onboardingService,
  type SuggestedContract,
} from "./onboarding.service";
import { type OnboardingData } from "./types";
import { sectorGroupOf } from "./utils/sector";
import { useOnboardingAbandonment } from "@/features/onboarding/hooks/use-onboarding-abandonment";
import {
  FIRST_MILE_SECTOR_KEY,
  FIRST_MILE_STARTED_KEY,
  WIZARD_STARTED_KEY,
} from "@/features/onboarding/utils/onboarding-timing";
import { AUTH_ROUTES, PRIVATE_ROUTES } from "@/shared/config/app-routes";

const FLOW_VERSION = "onboarding-guided-v2";

/** Stable client-only id for a contract editor row (localhost + https are secure contexts). */
const newDraftId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

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
  // Contracts accepted from the suggestion panel on the contract step.
  const [picked, setPicked] = React.useState<SuggestedContract[]>([]);
  // Contracts the user added by hand (address + chain), the multi-contract editor.
  const [manualContracts, setManualContracts] = React.useState<ContractDraft[]>(
    []
  );
  const contractSeededRef = React.useRef(false);

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
  const addManualContract = React.useCallback(() => {
    setManualContracts((prev) => [
      ...prev,
      {
        id: newDraftId(),
        address: "",
        chain: profile.chains[0] ?? DEFAULT_CHAIN,
      },
    ]);
  }, [profile.chains]);
  const updateManualContract = React.useCallback(
    (index: number, patch: Partial<OnboardingContract>) => {
      setManualContracts((prev) =>
        prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
      );
    },
    []
  );
  const removeManualContract = React.useCallback((index: number) => {
    setManualContracts((prev) => prev.filter((_, i) => i !== index));
  }, []);
  // Handing the technical setup over drops the contract step, so anything added
  // before switching must not linger into completion.
  const chooseRole = React.useCallback((r: Role) => {
    setRole(r);
    if (r === "operator") {
      setPicked([]);
      setManualContracts([]);
    }
  }, []);

  // The full list the backend indexes: hand-added rows (with an address) plus
  // accepted suggestions, each mapped to a chain.
  const allContracts: OnboardingContract[] = React.useMemo(
    () => [
      ...manualContracts
        .filter((c) => c.address.trim().length > 0)
        .map((c) => ({
          address: c.address.trim(),
          chain: c.chain,
          name: c.name,
        })),
      ...picked
        .filter((p) => p.address)
        .map((p) => ({
          address: p.address as string,
          chain: chainByKey(p.chainHint)?.key ?? DEFAULT_CHAIN,
          name: p.name,
        })),
    ],
    [manualContracts, picked]
  );

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
              sectorType: sectorGroupOf(profile.sector),
              hasContractAddress: profile.contract.trim().length > 0,
            },
            flowVersion: FLOW_VERSION,
            // guidedStep + role give the richer funnel its granularity while the
            // backend's step name stays one of its two known values.
            metadata: {
              completionPercentage: 50,
              guidedStep: "project",
              role,
              sectorType: sectorGroupOf(profile.sector),
            },
          }).catch(() => {});
        }
      }
      goToIndex(stepIndex + 1);
      return;
    }

    // technical / dns / contract: nothing here blocks. Each hop is tracked (coarse
    // step name, `guidedStep` for the real granularity) so drop-off per guided
    // step is visible; entering the plan flips to the plan_selection step.
    const next = stepIndex + 1;
    if (user?.id) {
      const enteringPlan = flow[next] === "plan";
      trackStep({
        stepName: enteringPlan ? "plan_selection" : "organization_setup",
        action: enteringPlan ? "started" : "completed",
        timeSpentSeconds,
        currentStep: enteringPlan ? "plan_selection" : "organization_setup",
        flowVersion: FLOW_VERSION,
        metadata: {
          guidedStep: at,
          nextGuidedStep: flow[next],
          role,
          ...(at === "contract"
            ? { contractsPicked: allContracts.length }
            : {}),
          ...(at === "technical"
            ? { handoffInvited: Boolean(handoffSentTo) }
            : {}),
        },
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
      // Everything we collected, so the server has the full picture to analyse by:
      // Web3 vs Web2, who set up the technical side, whether a developer was invited,
      // whether a contract was given, and which plan was chosen.
      sectorType: sectorGroupOf(profile.sector),
      role,
      handoffInvited: Boolean(handoffSentTo),
      hasContractAddress:
        profile.contract.trim().length > 0 || allContracts.length > 0,
      flowVersion: FLOW_VERSION,
      ...(allContracts.length > 0 ? { contracts: allContracts } : {}),
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

    // Index-after-plan: indexing is the part that costs, so it only starts once
    // a plan is chosen. With a plan and at least one picked contract that has an
    // address, kick off the initial historical indexing through the
    // `connect-chain` task - which also marks that card done on the dashboard.
    // Fire-and-forget: it must never delay the hop to the workspace.
    if (user?.id && finalData.selectedPlan && allContracts.length > 0) {
      onboardingService
        .completeTask("connect-chain", {
          contracts: allContracts.map((c) => ({
            address: c.address,
            chain: c.chain,
            name: c.name,
          })),
          lookbackDays: 90,
        })
        .catch((error) => {
          console.warn("Failed to start contract indexing:", error);
        });
    }

    push(PRIVATE_ROUTES.DASHBOARD);
  };

  // Resumable onboarding: seed the starting step exactly once per mount, then
  // never touch it again - local navigation owns the step after that. The
  // guard is essential: this effect re-runs on every `progress` change (each
  // track event updates it), and without it the seed would keep snapping the
  // user back to the project step the moment they advanced. The guided flow
  // collapses the backend's two known steps onto its own ends - `plan_selection`
  // resumes at the plan step, anything else starts at the project step (the
  // default), so we only ever move forward to the plan, never back.
  React.useEffect(() => {
    if (!user?.id || resumeAppliedRef.current) return;
    if (!progress || progress.is_completed) return;
    resumeAppliedRef.current = true;

    const landsOnPlan =
      resume?.status === "in_progress"
        ? resolveResumeFlowStep(resume.step) === 2
        : progress.current_step === "plan_selection";
    if (landsOnPlan) {
      setStepIndex(flow.length - 1);
      setStepStartedAtMs(Date.now());
    }

    if (progress.step_data && Object.keys(progress.step_data).length > 0) {
      setData(progress.step_data as Partial<OnboardingData>);
    }
  }, [user?.id, progress, resume, flow.length, setData]);

  // Each guided step logs a "started" event when it comes on screen. The backend step name stays
  // one of its two known values (so resume + completion stay compatible), while `guidedStep` in
  // the metadata carries the real per-step granularity the funnel needs.
  React.useEffect(() => {
    if (!user?.id) return;
    const coarse = at === "plan" ? "plan_selection" : "organization_setup";
    trackStep({
      stepName: coarse,
      action: "started",
      currentStep: coarse,
      flowVersion: FLOW_VERSION,
      metadata: { guidedStep: at },
    }).catch(() => {});
  }, [user?.id, at, trackStep]);

  // Carry a contract typed on step 1 into the step-4 editor as the first row,
  // once, so nothing is entered twice.
  React.useEffect(() => {
    if (at !== "contract" || contractSeededRef.current) return;
    contractSeededRef.current = true;
    // Always open the editor with one row (prefilled from step 1 when given), so the step is never
    // blank and the user can just type.
    if (manualContracts.length === 0) {
      setManualContracts([
        {
          id: newDraftId(),
          address: profile.contract.trim(),
          chain: profile.chains[0] ?? DEFAULT_CHAIN,
        },
      ]);
    }
  }, [at, profile.contract, profile.chains, manualContracts.length]);

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
    at === "dns" || (at === "contract" && allContracts.length === 0);
  const continueDisabled = busy || (at === "project" && !profileReady(profile));

  return (
    <GuidedShell
      stepIndex={stepIndex}
      flow={flow}
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
          contracts={manualContracts}
          onAdd={addManualContract}
          onUpdate={updateManualContract}
          onRemove={removeManualContract}
          picked={picked}
          onAcceptSuggestion={acceptContract}
          onRemoveSuggestion={removeContract}
          projectName={profile.name}
          sector={profile.sector}
          chains={profile.chains}
        />
      )}
    </GuidedShell>
  );
}
