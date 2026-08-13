import { cn } from "@/lib/utils";

import { Skeleton } from "@/shared/components/ui/skeleton";

/** Header block: title + subtitle, matching PageHeader. */
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

/**
 * A row of metric/stat cards. `withIcon` (default true) draws the rounded
 * icon tile some cards show; pass `withIcon={false}` for label + value + hint
 * cards (e.g. campaigns analytics) so the skeleton matches the real layout.
 */
export function StatCardsSkeleton({
  count = 4,
  withIcon = true,
  className,
}: {
  count?: number;
  withIcon?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => i).map((i) => (
        <div
          key={`stat-${i}`}
          className="rounded-2xl border border-border bg-card p-4"
        >
          {withIcon ? <Skeleton className="h-10 w-10 rounded-xl" /> : null}
          <Skeleton className={cn("h-7 w-24", withIcon && "mt-4")} />
          <Skeleton className="mt-2 h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

/** A tab bar placeholder. */
export function TabsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex gap-1 rounded-xl border border-border bg-card p-1",
        className
      )}
    >
      {Array.from({ length: count }, (_, i) => i).map((i) => (
        <Skeleton key={`tab-${i}`} className="h-9 w-24 rounded-lg" />
      ))}
    </div>
  );
}

/** A table placeholder with header + rows. */
export function TableSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card",
        className
      )}
    >
      <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-5 py-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="ml-auto h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => i).map((i) => (
          <div key={`row-${i}`} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="ml-auto h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A stack of content cards. */
export function CardListSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }, (_, i) => i).map((i) => (
        <div
          key={`card-${i}`}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="mt-3 h-4 w-full max-w-md" />
          <Skeleton className="mt-2 h-4 w-3/4 max-w-sm" />
        </div>
      ))}
    </div>
  );
}

/**
 * Full dashboard-page skeleton: header + optional tabs + content.
 * Use as the single loading state for a section so it mirrors the real layout
 * (no double skeletons).
 */
export function DashboardSkeleton({
  variant = "cards",
  withTabs = true,
  withStats = false,
  className,
}: {
  variant?: "cards" | "table";
  withTabs?: boolean;
  withStats?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <PageHeaderSkeleton />
      {withStats ? <StatCardsSkeleton /> : null}
      {withTabs ? <TabsSkeleton /> : null}
      {variant === "table" ? <TableSkeleton /> : <CardListSkeleton />}
    </div>
  );
}

export default DashboardSkeleton;
