import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Layout-matching skeleton for the automation builder. Mirrors the real shell:
 * the `max-w-[1600px]` column, the borderless header row, and the 3-pane body
 * (304px node library, flex-1 canvas, 344px property/flow-settings panel). Shared
 * by the route `loading.tsx` and the in-component hydration state so the shape
 * never jumps between navigation → mount → hydrated.
 */
export function AutomationBuilderSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-3"
    >
      {/* Header: back tile + name/meta on the left, tabs/toggle/save on the right. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-[180px] rounded-lg sm:w-[220px]" />
          <Skeleton className="hidden h-6 w-px sm:block" />
          <Skeleton className="h-6 w-11 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* 3-pane body. */}
      <div className="flex h-[75vh] min-h-[560px] gap-4">
        {/* Node library (304px). */}
        <div className="hidden w-[304px] shrink-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex">
          <Skeleton className="h-9 w-full rounded-lg" />
          {["a", "b", "c", "d", "e"].map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded-lg" />
          ))}
        </div>

        {/* Canvas (flex-1). */}
        <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-background">
          <Skeleton className="absolute left-4 top-4 h-8 w-8 rounded-lg" />
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-24 w-64 rounded-2xl" />
              <Skeleton className="h-6 w-px" />
              <Skeleton className="h-24 w-64 rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Property / flow-settings panel (344px). */}
        <div className="hidden w-[344px] shrink-0 flex-col gap-4 rounded-xl border border-border bg-card p-6 lg:flex">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-9 w-2/3 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default AutomationBuilderSkeleton;
