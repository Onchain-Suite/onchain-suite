import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors ReportDetailPage: back button + title/meta row with a refresh
 * action → 4-up metric cards (Recipients / Open Rate / Click Rate /
 * Revenue).
 */
export default function ReportDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Back + title row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="mt-2 h-4 w-44" />
        </div>
        <Skeleton className="ml-auto h-9 w-24 rounded-lg" />
      </div>

      {/* Metric cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => i).map((i) => (
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
    </div>
  );
}
