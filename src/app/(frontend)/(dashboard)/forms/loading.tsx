import { Skeleton } from "@/components/ui/skeleton";

import { PageHeaderSkeleton } from "@/shared/components/page/page-skeleton";

/**
 * Mirrors FormsPage: header (+ "New form" action) → 4 stat cards → toolbar
 * (search, status select, view toggle) → form-card grid, matching the
 * client-side FormsSkeleton grid (h-64 rounded-xl cards).
 */
export default function FormsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => i).map((i) => (
          <div
            key={`stat-${i}`}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 min-w-0 flex-1 rounded-lg sm:max-w-xs" />
        <Skeleton className="h-9 w-[150px] rounded-lg" />
        <Skeleton className="ml-auto h-9 w-20 rounded-lg" />
      </div>

      {/* Form cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => i).map((i) => (
          <Skeleton key={`form-${i}`} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
