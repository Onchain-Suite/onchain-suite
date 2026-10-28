/* Packs measured items into book pages, the way a printed book sets type.

   Items run on from one section to the next, so a page only ends when it is
   full. A paragraph that will not fit is cut between lines and carries on at
   the top of the next page, keeping at least two lines on each side. A
   heading never ends a page: it moves over with the start of what follows.
   Anything else that will not fit starts the next page, and an item taller
   than a whole page gets one to itself. */

/** Fewest lines of a cut paragraph left on either page. */
export const MIN_LINES = 2;

export interface PackItem {
  /** Height in px, including the space below it. */
  height: number;
  /** A heading: it must share its page with the start of the next item. */
  keepWithNext?: boolean;
  /** Set for a paragraph that may be cut between lines. */
  lines?: { lineHeight: number; content: number };
  /**
   * Extra height when the item opens a page: a table piece that joins the
   * piece before it shows its header again at the top of a new page.
   */
  startExtra?: number;
}

/**
 * One item, or one piece of it, on a page. `from` and `to` are offsets into
 * the item in px; `to` is absent when the piece runs to the item's end.
 */
export interface PackEntry {
  item: number;
  from: number;
  to?: number;
}

export function packFlow(items: PackItem[], capacity: number): PackEntry[][] {
  const pages: PackEntry[][] = [];
  let page: PackEntry[] = [];
  let used = 0;
  const newPage = () => {
    pages.push(page);
    page = [];
    used = 0;
  };
  // The least of an item that must fit beside a heading kept with it.
  const opening = (j: number) => {
    const next = items[j];
    if (!next) return 0;
    if (next.lines)
      return Math.min(next.height, next.lines.lineHeight * MIN_LINES);
    return Math.min(next.height, capacity);
  };

  items.forEach((it, i) => {
    let from = 0;
    // Each pass either places the rest of the item or starts a new page.
    for (let pass = 0; pass < 1000; pass++) {
      const left = capacity - used;
      const extra = page.length === 0 ? (it.startExtra ?? 0) : 0;
      const rest = it.height - from + extra;
      if (
        it.keepWithNext &&
        page.length > 0 &&
        it.height + opening(i + 1) > left
      ) {
        newPage();
        continue;
      }
      if (rest <= left || (page.length === 0 && !it.lines)) {
        page.push({ item: i, from });
        used += rest;
        return;
      }
      if (it.lines) {
        const { lineHeight, content } = it.lines;
        const total = Math.round(content / lineHeight);
        const done = Math.round(from / lineHeight);
        let take = Math.floor(left / lineHeight);
        if (total - done - take < MIN_LINES) take = total - done - MIN_LINES;
        if (take >= MIN_LINES) {
          const to = (done + take) * lineHeight;
          page.push({ item: i, from, to });
          from = to;
          newPage();
          continue;
        }
        if (page.length === 0) {
          // Too short to cut well even on an empty page: set it whole.
          page.push({ item: i, from });
          used += rest;
          return;
        }
      }
      newPage();
    }
  });
  if (page.length > 0) pages.push(page);
  return pages;
}
