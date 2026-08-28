import { Skeleton } from "@/components/ui/skeleton";

const STAT_KEYS = ["active", "entries", "completion", "conversions"] as const;
const TAB_KEYS = ["all", "active", "paused", "draft"] as const;
const ROW_KEYS = ["r1", "r2", "r3", "r4", "r5", "r6"] as const;

// Matches the automations table: Automation · Status · Entries (30d) ·
// Completed · Conversions · Last triggered · (menu).
const COLS = "grid-cols-[2fr_0.9fr_0.9fr_0.9fr_0.9fr_1fr_2.25rem]";

/**
 * Mirrors AutomationsListView: centered max-w-7xl shell → header (+ "New
 * automation") → the joined 4-cell stat strip → search + status tabs toolbar →
 * the 7-column automations table.
 */
export default function AutomationsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-44 rounded-xl" />
      </div>

      {/* Joined stat strip - one segmented card, no icons/hints */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border lg:grid-cols-4">
        {STAT_KEYS.map((k) => (
          <div key={k} className="bg-card px-5 py-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Search + status tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-full rounded-lg sm:w-64" />
        {TAB_KEYS.map((k) => (
          <Skeleton key={k} className="h-8 w-20 rounded-lg" />
        ))}
      </div>

      {/* Automations table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className={`grid ${COLS} gap-4 border-b border-border px-4 py-3`}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <span />
        </div>
        {ROW_KEYS.map((k) => (
          <div
            key={k}
            className={`grid ${COLS} items-center gap-4 border-b border-border px-4 py-3.5 last:border-0`}
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-7 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
