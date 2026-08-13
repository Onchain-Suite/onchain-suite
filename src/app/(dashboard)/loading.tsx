import { Skeleton } from "@/components/ui/skeleton";

/**
 * Group-level loading state. After the section routes gained their own
 * loading.tsx files this effectively only catches /dashboard, so it mirrors
 * MainDashboard's real structure: left-aligned greeting card → command bar →
 * stat-card row → the activity / get-started two-column grid, so the route →
 * client handoff doesn't jump.
 */
export default function DashboardLoading() {
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

      {/* Stat cards */}
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

      {/* Get started checklist: section header + full-width card of task
          cards. Matches GetStartedSection's own TaskCardSkeleton grid so the
          route → client handoff doesn't jump. */}
      <div>
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20 rounded-full md:w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg md:h-8 md:w-8" />
            <Skeleton className="h-8 w-8 rounded-lg md:h-8 md:w-8" />
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
    </div>
  );
}
