import { describe, expect, it } from "vitest";

import { elapsedSeconds, formatDuration } from "./onboarding-timing";

describe("elapsedSeconds", () => {
  it("returns whole seconds between start and now", () => {
    expect(elapsedSeconds(1_000_000, 1_125_400)).toBe(125);
  });

  it("floors partial seconds", () => {
    expect(elapsedSeconds(0, 1_900)).toBe(1);
  });

  it("never returns a negative value when now precedes start", () => {
    expect(elapsedSeconds(5_000, 1_000)).toBe(0);
  });

  it("treats a missing or non-finite start as zero elapsed", () => {
    expect(elapsedSeconds(null)).toBe(0);
    expect(elapsedSeconds(undefined)).toBe(0);
    expect(elapsedSeconds(Number.NaN, 10_000)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("renders minutes and seconds past a minute", () => {
    expect(formatDuration(125)).toBe("2m 5s");
  });

  it("renders only seconds under a minute", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("clamps negatives and floors fractions", () => {
    expect(formatDuration(-10)).toBe("0s");
    expect(formatDuration(61.9)).toBe("1m 1s");
  });
});
