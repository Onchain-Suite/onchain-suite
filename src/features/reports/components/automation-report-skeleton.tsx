import { Skeleton } from "@/ui/skeleton";

const TILE_KEYS = ["captured", "delivered", "domains", "completion"] as const;
const METER_KEYS = ["open", "ctr", "running"] as const;
const ROW_KEYS = ["r1", "r2", "r3", "r4", "r5"] as const;

/**
 * Mirrors AutomationReportPage: header → the hairline-joined 4-tile strip →
 * the 3-up rate meters → the per-automation table. Shared by the route-level
 * `loading.tsx` and the in-page wait for the workspace to resolve, so the two
 * never flicker between different shapes.
 */
export function AutomationReportSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 lg:grid-cols-4">
        {TILE_KEYS.map((key) => (
          <div key={key} className="bg-card px-5 py-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {METER_KEYS.map((key) => (
          <div
            key={key}
            className="rounded-xl border border-border bg-card p-5"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-40" />
        </div>
        {ROW_KEYS.map((key) => (
          <div
            key={key}
            className="flex items-center gap-6 border-b border-border px-5 py-4 last:border-0"
          >
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="ml-auto h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default AutomationReportSkeleton;
