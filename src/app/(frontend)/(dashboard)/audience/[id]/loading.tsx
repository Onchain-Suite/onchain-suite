import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors ProfileDetailPage: back link → avatar + name/meta + Send Email →
 * tag chips → 3-column info cards → 4-up stat cards. Matches the page's own
 * per-widget skeleton-wave placeholders so the route → page handoff doesn't
 * jump.
 */
export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-32" />

      {/* Identity header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div>
            <Skeleton className="h-7 w-56 max-w-full" />
            <div className="mt-2 flex items-center gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Tag chips */}
      <div className="mb-10 flex flex-wrap gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      {/* Info cards */}
      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => i).map((i) => (
          <div
            key={`card-${i}`}
            className="rounded-xl border border-border bg-card p-6"
          >
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>

      {/* Stat cards */}
      <div className="mb-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => i).map((i) => (
          <div
            key={`stat-${i}`}
            className="rounded-xl border border-border bg-card p-6"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
