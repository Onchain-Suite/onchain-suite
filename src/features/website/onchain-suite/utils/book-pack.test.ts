import { describe, expect, it } from "vitest";

import {
  MIN_LINES,
  packFlow,
  type PackItem,
} from "@/onchain-suite-website/utils/book-pack";

const block = (height: number): PackItem => ({ height });
const para = (lines: number, lineHeight = 20, gap = 16): PackItem => ({
  height: lines * lineHeight + gap,
  lines: { lineHeight, content: lines * lineHeight },
});
const heading = (height = 40): PackItem => ({ height, keepWithNext: true });

describe("packing a book", () => {
  it("fills pages in order and starts a page for a block that will not fit", () => {
    expect(packFlow([block(100), block(100), block(250)], 300)).toEqual([
      [
        { item: 0, from: 0 },
        { item: 1, from: 0 },
      ],
      [{ item: 2, from: 0 }],
    ]);
  });

  it("gives a block taller than a page a page of its own", () => {
    const pages = packFlow([block(50), block(500), block(50)], 300);
    expect(pages.map((p) => p.map((e) => e.item))).toEqual([[0], [1], [2]]);
  });

  it("cuts a paragraph between lines and carries it on", () => {
    // 200px used leaves room for 5 lines of a 10-line paragraph.
    const pages = packFlow([block(200), para(10)], 300);
    expect(pages).toEqual([
      [
        { item: 0, from: 0 },
        { item: 1, from: 0, to: 100 },
      ],
      [{ item: 1, from: 100 }],
    ]);
  });

  it("leaves at least two lines of a cut paragraph on each page", () => {
    // Room for 4 of 5 lines would strand one line, so only 3 go first.
    const pages = packFlow([block(210), para(5)], 300);
    expect(pages[0][1]).toEqual({ item: 1, from: 0, to: 3 * 20 });
    // Room for one line moves the paragraph to the next page whole.
    const moved = packFlow([block(275), para(5)], 300);
    expect(moved[1][0]).toEqual({ item: 1, from: 0 });
    expect(MIN_LINES).toBe(2);
  });

  it("never ends a page on a heading", () => {
    const pages = packFlow([block(240), heading(), block(100)], 300);
    expect(pages.map((p) => p.map((e) => e.item))).toEqual([[0], [1, 2]]);
  });

  it("lets a heading start mid-page when what follows fits", () => {
    const pages = packFlow([block(100), heading(), para(3)], 300);
    expect(pages).toHaveLength(1);
  });

  it("counts a table piece's header again when it opens a page", () => {
    const piece: PackItem = { height: 100, startExtra: 40 };
    const pages = packFlow([block(250), piece], 300);
    expect(pages.map((p) => p.map((e) => e.item))).toEqual([[0], [1]]);
    // On a page of its own it needs 140, which still fits.
    expect(packFlow([piece], 120)).toHaveLength(1);
  });
});
