import { Skeleton } from "@/components/ui/skeleton";

import {
  PageHeaderSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from "@/shared/components/page/page-skeleton";

/**
 * Mirrors AutomationList: header (+ "Create automation" action) → 4 stat
 * cards → tabs + search toolbar → automations table. Uses the same
 * StatCardsSkeleton/TableSkeleton the page renders while its queries load,
 * so the route → widget skeleton handoff doesn't jump.
 */
export default function AutomationsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-44 rounded-xl" />
      </div>

      <StatCardsSkeleton />

      {/* Tabs + search toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {Array.from({ length: 3 }, (_, i) => i).map((i) => (
            <Skeleton key={`tab-${i}`} className="h-9 w-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-lg sm:w-64" />
      </div>

      <TableSkeleton />
    </div>
  );
}
