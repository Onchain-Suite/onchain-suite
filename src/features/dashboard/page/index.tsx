"use client";

import { OnboardingResumeBanner } from "../components/get-started";
import { TodayView } from "../components/home/today-view";
import { HomeFirstRun } from "../components/home-first-run";
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

  // Empty workspaces get the whole way in: greeting, the setup checklist with
  // a next-step hero, and the things that work before any data arrives. Home
  // carries it rather than pointing at the sidebar (v2.7 `HomeFirstRun`).
  if (empty) {
    return (
      <HomeFirstRun
        greeting={greeting}
        name={name}
        workspaceName={userData.projectName}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Owner-only "finish onboarding" resume affordance; self-hides otherwise. */}
      <OnboardingResumeBanner />
      <TodayView greeting={greeting} name={name} />
    </div>
  );
}
