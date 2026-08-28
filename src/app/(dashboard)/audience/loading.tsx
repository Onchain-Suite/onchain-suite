import { Skeleton } from "@/components/ui/skeleton";

const STAT_KEYS = ["total", "email", "push", "suppressed"] as const;
const ROW_KEYS = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"] as const;
const TAB_KEYS = ["contacts", "lists", "tags", "suppressed"] as const;

// Matches the contacts table: Contact · Reachable via · Email · Tags · Lifetime
// · Last active (the last two right-aligned).
const COLS = "grid-cols-[1.6fr_0.9fr_1.8fr_1fr_0.7fr_0.9fr]";

/**
 * Mirrors AudiencePages: centered max-w-7xl shell → header (+ actions) → 4 stat
 * cards → Contacts/Lists/Tags/Suppressed tabs → the 6-column contacts table.
 */
export default function AudienceLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        {/* Import CSV · Export · Sync wallets */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Four stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_KEYS.map((k) => (
          <div key={k} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Contacts / Lists / Tags / Suppressed tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TAB_KEYS.map((k) => (
          <Skeleton key={k} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Contacts table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className={`grid ${COLS} gap-4 border-b border-border px-4 py-3`}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
        {ROW_KEYS.map((k) => (
          <div
            key={k}
            className={`grid ${COLS} items-center gap-4 border-b border-border px-4 py-3.5 last:border-0`}
          >
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-1.5">
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-48 max-w-full" />
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="ml-auto h-4 w-10" />
            <Skeleton className="ml-auto h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
