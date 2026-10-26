import { describe, expect, it } from "vitest";

import {
  roughArrow,
  roughEllipse,
  roughLine,
  roughRect,
  seededRandom,
  seedFrom,
  wrapLines,
} from "./sketch";

describe("seededRandom", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("stays inside [0, 1)", () => {
    const r = seededRandom(7);
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("seedFrom", () => {
  it("is stable and differs between strings", () => {
    expect(seedFrom("01.02")).toBe(seedFrom("01.02"));
    expect(seedFrom("01.02")).not.toBe(seedFrom("01.03"));
  });
});

describe("rough shapes", () => {
  it("draw the same path for the same seed (no hydration drift)", () => {
    expect(roughRect(0, 0, 100, 40, seededRandom(3))).toBe(
      roughRect(0, 0, 100, 40, seededRandom(3))
    );
    expect(roughEllipse(50, 20, 40, 15, seededRandom(9))).toBe(
      roughEllipse(50, 20, 40, 15, seededRandom(9))
    );
  });

  it("produce valid path commands only", () => {
    const d = [
      roughLine(0, 0, 120, 0, seededRandom(1)),
      roughRect(10, 10, 80, 30, seededRandom(2)),
      roughEllipse(0, 0, 20, 10, seededRandom(4)),
      roughArrow(0, 0, 60, 0, seededRandom(5)),
    ].join("");
    expect(d).toMatch(/^[MQ0-9.\s-]+$/);
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it("keeps a line's ends within its wobble", () => {
    const d = roughLine(0, 0, 100, 0, seededRandom(11), 1.6);
    const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const [sx, sy] = nums;
    const [ex, ey] = nums.slice(-2);
    expect(Math.abs(sx)).toBeLessThanOrEqual(1.6);
    expect(Math.abs(sy)).toBeLessThanOrEqual(1.6);
    expect(Math.abs(ex - 100)).toBeLessThanOrEqual(1.6);
    expect(Math.abs(ey)).toBeLessThanOrEqual(1.6);
  });
});

describe("wrapLines", () => {
  it("wraps on word boundaries under the limit", () => {
    expect(wrapLines("Did the first real thing on chain", 14)).toEqual([
      "Did the first",
      "real thing on",
      "chain",
    ]);
  });

  it("never splits a long word", () => {
    expect(wrapLines("supercalifragilistic word", 6)).toEqual([
      "supercalifragilistic",
      "word",
    ]);
  });

  it("returns nothing for empty text", () => {
    expect(wrapLines("   ", 10)).toEqual([]);
  });
});
