import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Layout-matching skeleton for the automation builder. Mirrors the real shell:
 * the one-row bar, then the canvas and the 344px settings panel, with the
 * flow's first steps drawn top-down. Shared by the route `loading.tsx` and the
 * in-component hydration state so the shape never jumps between navigation,
 * mount and hydration.
 */
export function AutomationBuilderSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex h-[calc(100dvh-88px)] min-h-[520px] w-full max-w-[1600px] flex-col gap-3 px-4 py-3"
    >
      {/* Bar: back, name, status on the left; tabs and actions on the right. */}
      <div className="flex shrink-0 items-center gap-3">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-7 w-56 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <span className="flex-1" />
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1fr)_344px]">
        {/* Canvas: the trigger and the first steps, top to bottom. */}
        <div className="flex min-h-[420px] flex-col items-center gap-2.5 rounded-xl border border-border bg-background pt-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-14 w-[280px] rounded-xl" />
          <Skeleton className="h-8 w-px" />
          <Skeleton className="h-14 w-[264px] rounded-xl" />
          <Skeleton className="h-8 w-px" />
          <Skeleton className="h-14 w-[264px] rounded-xl" />
        </div>

        {/* Settings panel (344px). */}
        <div className="hidden flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:flex">
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
