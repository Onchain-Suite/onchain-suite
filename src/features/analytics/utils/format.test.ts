import { describe, expect, it } from "vitest";

import {
  formatCount,
  formatDelta,
  formatDuration,
  formatPercent,
} from "./format";

describe("analytics formatting", () => {
  it("formats counts, percents and unknowns", () => {
    expect(formatCount(5480)).toBe("5,480");
    expect(formatCount(41280, true)).toBe("41.3K");
    expect(formatCount(null)).toBe("–");
    expect(formatPercent(42.31)).toBe("42.3%");
  });

  it("reads durations in the largest sensible unit", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(720)).toBe("12 min");
    expect(formatDuration(120_960)).toBe("1.4 days");
  });

  it("moves rates in points and counts in percent", () => {
    expect(formatDelta(42.3, 39.2, null, "rate")).toEqual({
      text: "+3.1pt",
      tone: "up",
    });
    expect(formatDelta(100, 120, -16.7, "count")).toEqual({
      text: "-16.7%",
      tone: "down",
    });
    expect(formatDelta(5, null, null, "count")).toBeNull();
  });
});
