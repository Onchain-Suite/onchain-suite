import { Skeleton } from "@/components/ui/skeleton";

import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/shared/components/page/page-skeleton";

/** Mirrors FormsPage: header (+ "New form") → 4 stat cards → forms table. */
export default function FormsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Stats - matches FormStats StatBox cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => i).map((i) => (
          <div
            key={`stat-${i}`}
            className="rounded-xl border border-border bg-card p-5"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-8 w-20" />
          </div>
        ))}
      </div>

      <TableSkeleton rows={5} />
    </div>
  );
}
