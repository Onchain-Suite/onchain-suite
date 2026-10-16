import { useMemo, useState } from "react";

export interface PageMath {
  /** Current page, clamped into range (0-indexed). */
  pageSafe: number;
  /** Total number of pages (>= 1, even when empty). */
  pageCount: number;
  /** 1-indexed position of the first item on the page (0 when empty). */
  start: number;
  /** 1-indexed position of the last item on the page (0 when empty). */
  end: number;
  /** Whether there is more than one page worth of items. */
  hasPages: boolean;
}

/**
 * Pure paging math - no React - so it can be unit tested without rendering.
 * `page` is clamped into `[0, pageCount - 1]`; an out-of-range page (e.g. after
 * the list shrinks) resolves to the nearest valid page rather than a blank view.
 */
export const paginate = (
  total: number,
  pageSize: number,
  page: number
): PageMath => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(Math.max(0, page), pageCount - 1);
  return {
    pageSafe,
    pageCount,
    start: total === 0 ? 0 : pageSafe * pageSize + 1,
    end: Math.min((pageSafe + 1) * pageSize, total),
    hasPages: total > pageSize,
  };
};

export interface Pagination<T> extends PageMath {
  /** The current page's slice of the input array. */
  items: T[];
  /** Alias of `pageSafe` (the clamped current page). */
  page: number;
  /** Total item count across all pages. */
  total: number;
  canPrev: boolean;
  canNext: boolean;
  setPage: (page: number) => void;
  next: () => void;
  prev: () => void;
  jumpToLast: () => void;
}

/**
 * Client-side pagination for a settings list. Feed it the full array and a page
 * size; it owns the page index and hands back the visible slice plus the
 * controls the shared `<ListPager>` renders. The slice is memoised so a page
 * that hasn't changed doesn't re-map. Pair with `<ListPager pagination={...}>`.
 */
export function usePagination<T>(all: T[], pageSize: number): Pagination<T> {
  const [page, setPage] = useState(0);
  const total = all.length;
  const { pageSafe, pageCount, start, end, hasPages } = paginate(
    total,
    pageSize,
    page
  );
  const items = useMemo(
    () => all.slice(pageSafe * pageSize, pageSafe * pageSize + pageSize),
    [all, pageSafe, pageSize]
  );

  return {
    items,
    page: pageSafe,
    pageSafe,
    pageCount,
    start,
    end,
    total,
    hasPages,
    canPrev: pageSafe > 0,
    canNext: pageSafe < pageCount - 1,
    // Raw setter (no clamp): render clamps via `paginate`, so a caller may jump
    // to a page that only exists after the list grows (e.g. right after adding
    // a row that lands on a new last page). next/prev/jumpToLast derive from the
    // clamped page so button clicks stay in range.
    setPage,
    next: () => setPage(Math.min(pageCount - 1, pageSafe + 1)),
    prev: () => setPage(Math.max(0, pageSafe - 1)),
    jumpToLast: () => setPage(pageCount - 1),
  };
}
