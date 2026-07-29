import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors SegmentDetailPage: back button + title row with a refresh action →
 * 3-up metric cards → settings card (name input + save) → profiles list
 * card.
 */
export default function SegmentDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Back + title row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <Skeleton className="ml-auto h-9 w-24 rounded-lg" />
      </div>

      {/* Metric cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => i).map((i) => (
          <div
            key={`metric-${i}`}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Settings card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-5 w-24" />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-1.5 h-9 w-full rounded-lg" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Profiles card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-5 w-28" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
