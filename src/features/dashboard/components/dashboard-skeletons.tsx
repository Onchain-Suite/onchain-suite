import { Skeleton } from "@/components/ui/skeleton";

/**
 * The two shapes the dashboard's lower region can take, extracted so the server
 * `loading.tsx` and the client `MainDashboard` render the SAME skeleton and the
 * route -> client handoff never shows two different ones. Which one is used is
 * decided by the `onchain.onboardingComplete` cookie (see loading.tsx / page).
 *
 * Pure JSX (no client hooks) so both a server and a client component can use it.
 */

/** Home for a workspace in use: the to-do list beside the two side panels. */
export function DashboardTodaySkeleton() {
  return (
    <div
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => i).map((i) => (
          <Skeleton key={`todo-${i}`} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
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
