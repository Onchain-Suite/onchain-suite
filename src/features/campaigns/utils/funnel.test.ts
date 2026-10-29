import { describe, expect, it } from "vitest";

import { barWidth, pct, rate } from "./funnel";

describe("funnel helpers", () => {
  it("rate and pct guard a zero denominator", () => {
    expect(rate(50, 200)).toBe(25);
    expect(rate(1, 0)).toBe(0);
    expect(pct(320, 800)).toBe("40.0%");
    expect(pct(0, 0)).toBe("0.0%");
  });

  it("barWidth floors a present stage at 2% and draws nothing for zero", () => {
    expect(barWidth(800, 800)).toBe("100%");
    expect(barWidth(400, 800)).toBe("50%");
    // 1 of 1000 would be 0.1% -> floored to 2% so it stays visible.
    expect(barWidth(1, 1000)).toBe("2%");
    // A failed send draws nothing.
    expect(barWidth(0, 800)).toBe("0%");
    expect(barWidth(5, 0)).toBe("0%");
  });
});
