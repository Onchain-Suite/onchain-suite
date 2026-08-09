import { Skeleton } from "@/components/ui/skeleton";

import { TableSkeleton } from "@/shared/components/page/page-skeleton";

/**
 * Mirrors CampaignsListsView: header (title + view-mode pill + create button)
 * → analytics overview strip (5 compact stat cards, same h-20 rounded-2xl
 * shape as the client-side skeleton in analytics-overview.tsx) → search +
 * filter toolbar → campaigns table.
 */
export default function CampaignsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-1 h-4 w-80 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-64 rounded-full" />
          <Skeleton className="h-8 w-40 rounded-xl" />
        </div>
      </div>

      {/* Analytics overview strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => i).map((i) => (
          <Skeleton key={`stat-${i}`} className="h-20 rounded-2xl" />
        ))}
      </div>

      {/* Search + filters toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full rounded-lg sm:w-64" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      <TableSkeleton rows={6} />
    </div>
  );
}
