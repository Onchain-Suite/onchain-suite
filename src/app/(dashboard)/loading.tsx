import { cookies } from "next/headers";

import { Skeleton } from "@/components/ui/skeleton";

import {
  DashboardOnboardingSkeleton,
  DashboardTodaySkeleton,
} from "@/features/dashboard/components/dashboard-skeletons";

/**
 * Group-level loading state (effectively only /dashboard, since section routes
 * have their own loading.tsx). It mirrors MainDashboard's real structure so the
 * route -> client handoff doesn't jump. Onboarded users (the
 * `onchain.onboardingComplete` cookie is set) see Home's greeting line and
 * to-do list; everyone else sees the setup-checklist skeleton - never both.
 */
export default async function DashboardLoading() {
  const onboarded =
    (await cookies()).get("onchain.onboardingComplete")?.value === "1";

  if (onboarded) {
    return (
      <div className="mx-auto max-w-7xl" aria-hidden="true">
        <div className="mb-[22px]">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
        <DashboardTodaySkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6" aria-hidden="true">
      <div className="rounded-2xl border border-border bg-card px-6 py-7">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <DashboardOnboardingSkeleton />
    </div>
  );
}
