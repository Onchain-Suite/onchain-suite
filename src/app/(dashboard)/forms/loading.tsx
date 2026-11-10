import { Skeleton } from "@/components/ui/skeleton";

import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/shared/components/page/page-skeleton";

/** Mirrors FormsPage (2.7 frame): header (the answer sentence, New form) → forms table. */
export default function FormsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <TableSkeleton rows={5} />
    </div>
  );
}
