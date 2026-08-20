"use client";

import { useMemo } from "react";

import { CommandBar } from "../components/command-bar";
import {
  DashboardMetricsSkeleton,
  DashboardOnboardingSkeleton,
} from "../components/dashboard-skeletons";
import {
  GetStartedSection,
  useOrganizationId,
  useTaskCompletion,
} from "../components/get-started";
import { MetricsDashboard } from "../components/metrics-dashboard";

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

export function MainDashboard({
  userData,
  onboardingHint = false,
}: MainDashboardProps) {
  const greeting = getGreeting(userData.timezone);
  const name = userData.fullName ?? "there";

  // New / not-yet-onboarded workspaces see the setup checklist (task cards);
  // once every step is done the dashboard flips to the live metrics view. The
  // checklist reuses existing service reads, so React Query dedupes them.
  const { organizationId } = useOrganizationId();
  const { completionById, isLoading } = useTaskCompletion(organizationId);
  const onboardingComplete = useMemo(() => {
    const values = Object.values(completionById);
    return values.length > 0 && values.every(Boolean);
  }, [completionById]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl border border-border bg-card px-6 py-7">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {`Good ${greeting}, ${name}.`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here is what moved across your workspace today.
        </p>
      </div>

      <CommandBar />

      {isLoading ? (
        // One onboarding-aware skeleton (matches loading.tsx via the cookie
        // hint) instead of flashing the checklist while onboarding state loads.
        onboardingHint ? (
          <DashboardMetricsSkeleton />
        ) : (
          <DashboardOnboardingSkeleton />
        )
      ) : onboardingComplete ? (
        <MetricsDashboard />
      ) : (
        <GetStartedSection />
      )}
    </div>
  );
}
