import { Skeleton } from "@/components/ui/skeleton";

import { PageHeaderSkeleton } from "@/shared/components/page/page-skeleton";

/** Mirrors FormsPage: header (+ "New form") → 4 stat cards → forms table. */
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
            className="rounded-2xl border border-border/60 bg-card/60 px-5 py-4"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="space-y-2 rounded-2xl border border-border/60 p-4">
        {Array.from({ length: 5 }, (_, i) => i).map((i) => (
          <Skeleton key={`row-${i}`} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
