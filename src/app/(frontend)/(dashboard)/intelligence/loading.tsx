import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors IntelligencePage: header (title + credit meter / enrichment
 * controls) → Chat/SQL/Segments/Reports tab pill bar → the large query
 * surface (same min-h-[760px] rounded-[32px] panel as the chat tab) with a
 * composer bar pinned to the bottom.
 */
export default function IntelligenceLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-1 h-4 w-72 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      {/* Tab pill bar */}
      <div className="inline-flex gap-1 rounded-2xl border border-border bg-card p-1.5">
        {Array.from({ length: 4 }, (_, i) => i).map((i) => (
          <Skeleton key={`tab-${i}`} className="h-9 w-28 rounded-xl" />
        ))}
      </div>

      {/* Query surface */}
      <div className="overflow-hidden rounded-[32px] border border-border bg-card">
        <div className="grid min-h-[760px] grid-rows-[auto_1fr_auto]">
          <div className="flex items-start justify-between border-b border-border/70 px-5 py-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          <div className="space-y-3 px-5 py-6">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="px-5 pb-5">
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
