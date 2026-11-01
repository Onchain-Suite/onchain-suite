import { describe, expect, it } from "vitest";

import {
  isOpen,
  leafCount,
  spreadCount,
  spreadOf,
  spreadPages,
  step,
} from "@/onchain-suite-website/utils/book-spread";

describe("book spreads", () => {
  it("opens the cover alone on the right, then pairs the pages", () => {
    expect(spreadPages(0, 10)).toEqual({ left: null, right: 0 });
    expect(spreadPages(1, 10)).toEqual({ left: 1, right: 2 });
    expect(spreadPages(5, 10)).toEqual({ left: 9, right: null });
  });

  it("counts spreads and leaves", () => {
    expect(spreadCount(10)).toBe(6);
    expect(spreadCount(9)).toBe(5);
    expect(leafCount(9)).toBe(5);
  });

  it("knows which spread a page is in", () => {
    expect([0, 1, 2, 3, 4].map(spreadOf)).toEqual([0, 1, 1, 2, 2]);
  });

  it("steps a spread at a time, and a page at a time in single mode", () => {
    expect(step(0, 1, "spread", 10)).toBe(1);
    expect(step(2, 1, "spread", 10)).toBe(3);
    expect(step(1, -1, "spread", 10)).toBe(0);
    expect(step(9, 1, "spread", 10)).toBe(9);
    expect(step(4, 1, "single", 10)).toBe(5);
    expect(step(0, -1, "single", 10)).toBe(0);
  });

  it("shows both pages of a spread as open", () => {
    expect(isOpen(1, 2, "spread", 10)).toBe(true);
    expect(isOpen(3, 2, "spread", 10)).toBe(false);
    expect(isOpen(1, 2, "single", 10)).toBe(false);
  });
});
