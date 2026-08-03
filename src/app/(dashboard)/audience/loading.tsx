import { Skeleton } from "@/components/ui/skeleton";

import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/shared/components/page/page-skeleton";

/**
 * Mirrors AudiencePages: header (+ Cerebra / Add Profile actions) → search +
 * filter toolbar → profiles table. Matches the client-side loading branch so
 * the route → page skeleton swap is seamless.
 */
export default function AudienceLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeaderSkeleton />
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Search + filters toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full rounded-lg sm:w-64" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      <TableSkeleton rows={8} />
    </div>
  );
}
