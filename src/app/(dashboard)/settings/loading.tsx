import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors SettingsPage: a two-column layout - left title + vertical nav rail,
 * right stack of section cards. (The reference rebuild moved the old horizontal
 * PageTabs bar into this left sub-nav.)
 */
export default function SettingsLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:gap-12"
      aria-hidden="true"
    >
      <aside className="lg:w-56 lg:shrink-0">
        <Skeleton className="mb-6 h-9 w-32" />
        <div className="space-y-1">
          {Array.from({ length: 6 }, (_, i) => i).map((i) => (
            <Skeleton key={`nav-${i}`} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}
