import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors IntelligencePage: a text-3xl "Intelligence" title + a single
 * enrichment status line, an underline-style two-tab bar (Chat + Segments),
 * then the chat surface (same rounded-2xl min-h-[520px] md:min-h-[640px]
 * panel as QueryTab) with a composer bar pinned to the bottom - so the
 * route → client handoff doesn't jump shape.
 */
export default function IntelligenceLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-44" />
        {/* Single status line: enrichment summary + refresh */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Underline tab bar (Chat + Segments) */}
      <div className="flex w-full items-center gap-6 border-b border-border pb-2.5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Chat surface */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid min-h-[520px] grid-rows-[1fr_auto] md:min-h-[640px]">
          <div className="space-y-3 px-5 py-6">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="border-t border-border px-5 py-4">
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
