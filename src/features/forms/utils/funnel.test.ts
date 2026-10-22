import { describe, expect, it } from "vitest";

import { computeFunnel, pct } from "./funnel";

describe("pct", () => {
  it("computes a one-decimal percentage", () => {
    expect(pct(5120, 9940)).toBe(51.5);
    expect(pct(3892, 5120)).toBe(76);
  });

  it("is undefined when inputs are missing or the whole is non-positive", () => {
    expect(pct(undefined, 10)).toBeUndefined();
    expect(pct(5, undefined)).toBeUndefined();
    expect(pct(5, 0)).toBeUndefined();
  });
});

describe("computeFunnel", () => {
  it("computes every rate when the full funnel is known", () => {
    const f = computeFunnel({ views: 9940, starts: 5120, completions: 3892 });
    expect(f.startsPctOfViews).toBe(51.5);
    expect(f.completionsPctOfStarts).toBe(76);
    expect(f.completionsPctOfViews).toBe(39.2);
  });

  it("omits rates that depend on an untracked views count", () => {
    const f = computeFunnel({ completions: 3892 });
    expect(f.startsPctOfViews).toBeUndefined();
    expect(f.completionsPctOfViews).toBeUndefined();
    expect(f.completions).toBe(3892);
  });

  it("derives a drop-off line from views minus starts", () => {
    const f = computeFunnel({ views: 9940, starts: 5120 });
    expect(f.dropOff).toMatch(/4,820 visitors saw the form but didn't start/);
  });

  it("prefers a backend-provided drop-off line", () => {
    const f = computeFunnel(
      { views: 9940, starts: 5120 },
      "Biggest drop-off: the wallet connect step."
    );
    expect(f.dropOff).toBe("Biggest drop-off: the wallet connect step.");
  });

  it("emits no drop-off when there is nothing to say", () => {
    expect(computeFunnel({ completions: 10 }).dropOff).toBeUndefined();
  });
});
