import { Skeleton } from "@/components/ui/skeleton";

import { DashboardTodaySkeleton } from "@/features/dashboard/components/dashboard-skeletons";

/**
 * Group-level loading state (effectively only /dashboard, since section routes
 * have their own loading.tsx). It is the same shape Home shows while it works
 * out whether the workspace is new or in use (greeting line over the list
 * skeleton), so the route -> client hand-over is one skeleton, not two.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl" aria-hidden="true">
      <div className="mb-[22px]">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="mt-2.5 h-4 w-96 max-w-full" />
      </div>
      <DashboardTodaySkeleton />
    </div>
  );
}
