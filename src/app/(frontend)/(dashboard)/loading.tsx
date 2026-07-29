import { Skeleton } from "@/components/ui/skeleton";

/**
 * Group-level loading state. After the section routes gained their own
 * loading.tsx files this effectively only catches /dashboard, so it mirrors
 * MainDashboard's real structure: greeting card → command bar → "Get started"
 * header + task-card row + pager dots. The task cards match the client-side
 * TaskCardSkeleton in get-started.tsx so the route → widget skeleton handoff
 * doesn't jump.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen rounded-2xl bg-background">
      <div className="space-y-6">
        {/* Greeting card */}
        <div className="mx-auto max-w-6xl rounded-2xl border border-border bg-card px-4 py-8 text-center md:px-6">
          <Skeleton className="mx-auto h-8 w-72 max-w-full" />
          <Skeleton className="mx-auto my-2 h-4 w-56 max-w-full" />
        </div>

        <div className="mx-auto max-w-6xl px-3 py-6 md:px-6 md:py-8">
          {/* Command bar */}
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
              <Skeleton className="h-5 w-5 shrink-0" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>

          {/* Get started section */}
          <div className="my-6 md:my-8">
            <div className="mb-4 flex items-center justify-between md:mb-6">
              <div className="flex items-center gap-2 md:gap-3">
                <Skeleton className="h-6 w-28" />
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

            <div className="mt-4 flex items-center justify-center gap-2">
              <Skeleton className="h-2 w-6 rounded-full" />
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-2 w-2 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
