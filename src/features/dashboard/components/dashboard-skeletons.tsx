import { Skeleton } from "@/components/ui/skeleton";

/**
 * The two shapes the dashboard's lower region can take, extracted so the server
 * `loading.tsx` and the client `MainDashboard` render the SAME skeleton and the
 * route -> client handoff never shows two different ones. Which one is used is
 * decided by the `onchain.onboardingComplete` cookie (see loading.tsx / page).
 *
 * Pure JSX (no client hooks) so both a server and a client component can use it.
 */

/** Post-onboarding stats view: 4 metric cards + the activity / get-started row. */
export function DashboardMetricsSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => i).map((i) => (
          <div
            key={`stat-${i}`}
            className="space-y-3 rounded-xl border border-border bg-card p-5"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Pre-onboarding setup view: checklist header + a 3-up grid of task cards. */
export function DashboardOnboardingSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-4 flex items-center justify-between md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-20 rounded-full md:w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm md:rounded-2xl">
        <div className="min-w-full p-4 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => i).map((i) => (
              <div
                key={`task-${i}`}
                className="flex flex-col rounded-xl border border-border bg-background p-5 md:p-6"
              >
                <Skeleton className="mb-4 h-12 w-12 rounded-xl" />
                <Skeleton className="mb-2 h-5 w-3/4" />
                <Skeleton className="mb-1 h-4 w-full" />
                <Skeleton className="mb-4 h-4 w-2/3" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
