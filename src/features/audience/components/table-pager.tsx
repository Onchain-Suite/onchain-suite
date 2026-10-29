"use client";

import { Button } from "@/components/ui/button";

/**
 * Client-side pager for the Audience tables (Lists, Tags). Renders a
 * "Showing X–Y of Z" line + Prev/Next, and nothing at all when everything fits
 * on one page. The rows themselves are sliced by the caller, so only the current
 * page is in the DOM. Mirrors the Contacts tab's footer.
 */
export function TablePager({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
      <span>
        Showing {start}–{end} of {totalItems.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
