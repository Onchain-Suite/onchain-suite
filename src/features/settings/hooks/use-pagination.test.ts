import { describe, expect, it } from "vitest";

import { paginate } from "./use-pagination";

describe("paginate", () => {
  it("reports a single page when items fit", () => {
    expect(paginate(3, 5, 0)).toEqual({
      pageSafe: 0,
      pageCount: 1,
      start: 1,
      end: 3,
      hasPages: false,
    });
  });

  it("splits into pages and marks hasPages once over the size", () => {
    expect(paginate(12, 5, 0)).toMatchObject({
      pageCount: 3,
      start: 1,
      end: 5,
      hasPages: true,
    });
    expect(paginate(12, 5, 1)).toMatchObject({ start: 6, end: 10 });
    // Last page is short.
    expect(paginate(12, 5, 2)).toMatchObject({ start: 11, end: 12 });
  });

  it("clamps an out-of-range page to the last page (list shrank under it)", () => {
    expect(paginate(12, 5, 9)).toMatchObject({
      pageSafe: 2,
      start: 11,
      end: 12,
    });
    expect(paginate(12, 5, -3)).toMatchObject({
      pageSafe: 0,
      start: 1,
      end: 5,
    });
  });

  it("handles an empty list without going negative", () => {
    expect(paginate(0, 5, 0)).toEqual({
      pageSafe: 0,
      pageCount: 1,
      start: 0,
      end: 0,
      hasPages: false,
    });
  });

  it("treats exactly one full page as no pager", () => {
    expect(paginate(5, 5, 0)).toMatchObject({ pageCount: 1, hasPages: false });
    expect(paginate(6, 5, 0)).toMatchObject({ pageCount: 2, hasPages: true });
  });
});
