import { cookies } from "next/headers";

import { Skeleton } from "@/components/ui/skeleton";

import {
  DashboardMetricsSkeleton,
  DashboardOnboardingSkeleton,
} from "@/features/dashboard/components/dashboard-skeletons";

/**
 * Group-level loading state (effectively only /dashboard, since section routes
 * have their own loading.tsx). It mirrors MainDashboard's real structure so the
 * route -> client handoff doesn't jump: greeting + command bar chrome, then the
 * ONE lower skeleton that matches what will actually render. Onboarded users
 * (the `onchain.onboardingComplete` cookie is set) see the stats skeleton;
 * everyone else sees the setup-checklist skeleton - never both.
 */
export default async function DashboardLoading() {
  const onboarded =
    (await cookies()).get("onchain.onboardingComplete")?.value === "1";

  return (
    <div className="mx-auto max-w-7xl space-y-6" aria-hidden="true">
      {/* Greeting card */}
      <div className="rounded-2xl border border-border bg-card px-6 py-7">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>

      {/* Command bar */}
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
        <Skeleton className="size-5 shrink-0" />
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="size-9 rounded-lg" />
      </div>

      {onboarded ? (
        <DashboardMetricsSkeleton />
      ) : (
        <DashboardOnboardingSkeleton />
      )}
    </div>
  );
}
