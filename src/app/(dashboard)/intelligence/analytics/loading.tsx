import { AnalyticsSkeleton } from "@/features/analytics/analytics-skeleton";

/**
 * Route-level skeleton for /intelligence/analytics. Without this, navigation
 * fell through to the generic intelligence/loading.tsx, so the user saw two
 * different skeletons (generic → analytics). This mirrors the real page (header
 * + the shared AnalyticsSkeleton body) so it's the one true layout throughout.
 */
export default function AnalyticsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6" aria-hidden="true">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-8 w-40 animate-pulse rounded bg-card/60" />
        <div className="ml-auto flex items-center gap-2">
          <div className="h-9 w-28 animate-pulse rounded-lg border border-border/60 bg-card/60" />
          <div className="h-9 w-32 animate-pulse rounded-lg border border-border/60 bg-card/60" />
        </div>
      </div>
      <AnalyticsSkeleton />
    </div>
  );
}
