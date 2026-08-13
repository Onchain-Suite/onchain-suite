import { Skeleton } from "@/components/ui/skeleton";

import { TableSkeleton } from "@/shared/components/page/page-skeleton";

/**
 * Mirrors AudiencePages: header (+ actions) → 4 stat cards →
 * Contacts/Lists/Tags/Suppressed tabs → wallet-first profiles table.
 */
export default function AudienceLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        {/* Import CSV, Export, Sync wallets, Delete all */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Four stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => i).map((i) => (
          <div
            key={`stat-${i}`}
            className="rounded-xl border border-border bg-card p-5"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-24" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Contacts / Lists / Tags / Suppressed tabs - wrapped chips */}
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }, (_, i) => i).map((i) => (
          <Skeleton key={`tab-${i}`} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      <TableSkeleton rows={8} />
    </div>
  );
}
