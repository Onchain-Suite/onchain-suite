import { Skeleton } from "@/components/ui/skeleton";

import {
  StatCardsSkeleton,
  TableSkeleton,
} from "@/shared/components/page/page-skeleton";

/**
 * Mirrors CampaignsListsView: header (title + Create) → 4 analytics stat cards
 * → status filter chips → campaigns table. (The old view-mode pill and
 * search/filter toolbar were removed in the reference rebuild.)
 */
export default function CampaignsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      {/* Analytics overview - four stat cards (label + value + hint) */}
      <StatCardsSkeleton withIcon={false} />

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }, (_, i) => i).map((i) => (
          <Skeleton key={`chip-${i}`} className="h-8 w-20 rounded-lg" />
        ))}
      </div>

      <TableSkeleton rows={6} />
    </div>
  );
}
