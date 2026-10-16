"use client";

import { cn } from "@/lib/utils";

import type { Pagination } from "../hooks/use-pagination";
import { Button } from "@/shared/components/ui/button";

interface ListPagerProps {
  /** The object returned by `usePagination`. */
  pagination: Pick<
    Pagination<unknown>,
    | "page"
    | "pageCount"
    | "start"
    | "end"
    | "total"
    | "hasPages"
    | "canPrev"
    | "canNext"
    | "prev"
    | "next"
  >;
  /** Optional noun for the range label, e.g. "invoices" -> "1-5 of 12 invoices". */
  label?: string;
  className?: string;
}

/**
 * The shared pager footer for settings lists: a "start-end of total" range on
 * the left and Previous / "page / count" / Next on the right. Renders nothing
 * for a single page, so callers can drop it in unconditionally.
 */
export function ListPager({ pagination, label, className }: ListPagerProps) {
  if (!pagination.hasPages) return null;
  const { page, pageCount, start, end, total, canPrev, canNext, prev, next } =
    pagination;

  return (
    <div
      className={cn(
        "mt-3 flex items-center justify-between border-t border-border/50 pt-3",
        className
      )}
    >
      <span className="text-xs text-muted-foreground">
        {start}-{end} of {total}
        {label ? ` ${label}` : ""}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={prev} disabled={!canPrev}>
          Previous
        </Button>
        <span className="px-1 text-xs text-muted-foreground">
          {page + 1} / {pageCount}
        </span>
        <Button variant="ghost" size="sm" onClick={next} disabled={!canNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
