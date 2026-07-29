import { Skeleton } from "@/components/ui/skeleton";

import { PageHeaderSkeleton } from "@/shared/components/page/page-skeleton";

/**
 * Mirrors SettingsPage: header → PageTabs pill bar (Profile / Account /
 * Billing / Integrations / Rewards) → centered max-w-6xl stack of section
 * cards.
 */
export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      {/* Tab pill bar */}
      <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        {Array.from({ length: 5 }, (_, i) => i).map((i) => (
          <Skeleton key={`tab-${i}`} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      {/* Section cards */}
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}
