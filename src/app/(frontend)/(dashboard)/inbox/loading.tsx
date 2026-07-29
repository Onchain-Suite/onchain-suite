import { Skeleton } from "@/components/ui/skeleton";

import { PageHeaderSkeleton } from "@/shared/components/page/page-skeleton";

/**
 * Mirrors InboxPages: header → a single full-height two-pane card (thread
 * list w-80 with a right border, reading pane filling the rest), matching
 * the page's h-[calc(100vh-8rem)] shell so there is no height jump.
 */
export default function InboxLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <PageHeaderSkeleton />

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
        {/* Thread list pane */}
        <div className="flex w-full shrink-0 flex-col border-border lg:w-80 lg:border-r">
          <div className="space-y-3 border-b border-border p-4">
            <Skeleton className="h-9 w-full rounded-lg" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }, (_, i) => i).map((i) => (
              <div key={`thread-${i}`} className="flex items-start gap-3 p-4">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reading pane */}
        <div className="hidden min-h-0 flex-1 flex-col lg:flex">
          <div className="space-y-2 border-b border-border p-5">
            <Skeleton className="h-5 w-72 max-w-full" />
            <Skeleton className="h-4 w-44" />
          </div>
          <div className="flex-1 space-y-3 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
