import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors CreateAutomation (the flow builder): one full-height rounded-[24px]
 * card with an h-20 header bar (back button, title, actions) over the canvas
 * area, matching the builder's h-[calc(100vh-…)] shell so there is no jump
 * when ReactFlow mounts.
 */
export default function AutomationDetailLoading() {
  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-[24px] border border-border bg-card shadow-sm md:h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)]">
      {/* Builder header bar */}
      <div className="flex h-20 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 p-6">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    </div>
  );
}
