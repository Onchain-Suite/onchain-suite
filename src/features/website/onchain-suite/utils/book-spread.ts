/* Page arithmetic for a book read as two-page spreads.

   The book is a stack of leaves. Leaf k carries page 2k on its front, which
   is a right-hand page, and page 2k + 1 on its back, which becomes the
   left-hand page once the leaf is turned. So the cover (page 0) opens alone
   on the right, and spread s shows page 2s - 1 on the left and page 2s on the
   right. Pages are counted from 0 here and from 1 on screen. */

export type BookMode = "single" | "spread";

/** The spread a page sits in. */
export function spreadOf(page: number): number {
  return Math.floor((page + 1) / 2);
}

export function spreadCount(pages: number): number {
  return spreadOf(pages - 1) + 1;
}

export function leafCount(pages: number): number {
  return Math.ceil(pages / 2);
}

/** The pages open in spread `s`; either side may be empty. */
export function spreadPages(
  s: number,
  pages: number
): { left: number | null; right: number | null } {
  const left = 2 * s - 1;
  const right = 2 * s;
  return {
    left: left >= 0 && left < pages ? left : null,
    right: right < pages ? right : null,
  };
}

/** Whether page `page` is open when the reader is at `at`. */
export function isOpen(
  page: number,
  at: number,
  mode: BookMode,
  pages: number
): boolean {
  if (mode === "single") return page === at;
  const { left, right } = spreadPages(spreadOf(at), pages);
  return page === left || page === right;
}

/**
 * Where a step forward (+1) or back (-1) takes the reader: the next page in
 * single mode, the first open page of the next spread in spread mode.
 */
export function step(
  at: number,
  dir: 1 | -1,
  mode: BookMode,
  pages: number
): number {
  if (mode === "single") return Math.min(Math.max(at + dir, 0), pages - 1);
  const s = Math.min(Math.max(spreadOf(at) + dir, 0), spreadCount(pages) - 1);
  const { left, right } = spreadPages(s, pages);
  return left ?? right ?? 0;
}
