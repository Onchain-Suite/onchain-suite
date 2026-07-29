import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors CreateSegmentPage: back button + title row → 3-column grid with
 * the rule-builder form (2 cols: name/import inputs + condition rows) and a
 * summary side card.
 */
export default function CreateSegmentLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Back + title row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rule builder */}
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-1.5 h-9 w-full rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1.5 h-9 w-full rounded-lg" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* Summary side card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-6 h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
