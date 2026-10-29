"use client";

import { CommandBar } from "../components/command-bar";
import { OnboardingResumeBanner } from "../components/get-started";
import { MetricsDashboard } from "../components/metrics-dashboard";
import { TakeTheTourButton } from "../components/take-the-tour-button";
import { StartHereBanner } from "@/features/onboarding/components/start-here-banner";
import { useTimeToValue } from "@/features/onboarding/hooks/use-time-to-value";
import { useWorkspaceMode } from "@/features/onboarding/hooks/use-workspace-mode";

interface UserData {
  projectName: string;
  userType: "DeFi" | "Gaming" | "DAO";
  trialDaysLeft?: number;
  isNewUser: boolean;
  subscriptionTier:
    "free_trial" | "limited_free" | "full_paid" | "onchain_suite_only";
  fullName?: string;
  timezone?: string;
}

interface MainDashboardProps {
  userData: UserData;
  /**
   * Server-read `onchain.onboardingComplete` cookie. Picks the initial skeleton
   * (stats vs setup checklist) while the task-completion query resolves, so it
   * matches loading.tsx and the final view - one skeleton, not two.
   */
  onboardingHint?: boolean;
}

function getGreeting(tz?: string) {
  let hour = new Date().getHours();
  try {
    if (tz) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).formatToParts(new Date());
      const hourPart = parts.find((p) => p.type === "hour");
      if (hourPart) {
        hour = parseInt(hourPart.value, 10);
      }
    }
  } catch {
    hour = new Date().getHours();
  }
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function MainDashboard({ userData }: MainDashboardProps) {
  const greeting = getGreeting(userData.timezone);
  const name = userData.fullName ?? "there";

  // Gate the home on whether the workspace has any data yet. `mode` reads
  // "live" while the reads are in flight, so a slow load never flashes the
  // empty-state teaching UI at a populated account.
  const { mode } = useWorkspaceMode();
  const empty = mode === "empty";

  // Close the time-to-value clock once this workspace first reads as live
  // (reports once, only when the wizard set a first-mile start stamp).
  useTimeToValue();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl border border-border bg-card px-6 py-7">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {`Good ${greeting}, ${name}.`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {empty
            ? "Your workspace is set up. Nothing is indexed yet. Getting started, in the sidebar, is the way in."
            : "Here is what moved across your workspace today."}
        </p>
        {/* Empty workspaces get the way back into Cerebra's tour, under the
            greeting (matches 2.7's `.home__tour` placement). */}
        {empty ? <TakeTheTourButton /> : null}
      </div>

      <StartHereBanner />

      {/* Owner-only "finish onboarding" resume affordance; self-hides otherwise.
          The setup checklist now lives in the sidebar (GettingStarted). */}
      <OnboardingResumeBanner />

      {/* Empty workspaces have nothing to ask about and nothing to chart, so
          the assistant bar and metrics only appear once the workspace is live.
          Both own their own loading + honest empty states for the live case. */}
      {empty ? null : (
        <>
          <CommandBar />
          <MetricsDashboard />
        </>
      )}
    </div>
  );
}
