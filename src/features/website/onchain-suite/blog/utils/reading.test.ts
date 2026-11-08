import { describe, expect, it } from "vitest";

import { activeHeadingIndex, minutesLeft, readingProgress } from "./reading";

describe("readingProgress", () => {
  const viewport = 900;

  it("is 0 before the body reaches the navbar and 1 at its last line", () => {
    // Body 3000px tall; 840px of it fits under the 60px navbar.
    expect(readingProgress({ top: 400, height: 3000 }, viewport)).toBe(0);
    expect(readingProgress({ top: 60, height: 3000 }, viewport)).toBe(0);
    expect(readingProgress({ top: 60 - 2160, height: 3000 }, viewport)).toBe(1);
    expect(readingProgress({ top: -9000, height: 3000 }, viewport)).toBe(1);
  });

  it("is proportional in between", () => {
    expect(readingProgress({ top: 60 - 1080, height: 3000 }, viewport)).toBe(
      0.5
    );
  });

  it("treats a body shorter than the screen as read once fully visible", () => {
    expect(readingProgress({ top: 200, height: 500 }, viewport)).toBe(1);
    expect(readingProgress({ top: 600, height: 500 }, viewport)).toBe(0);
  });
});

describe("minutesLeft", () => {
  it("counts down in whole minutes and only hits 0 when finished", () => {
    expect(minutesLeft(8, 0)).toBe(8);
    expect(minutesLeft(8, 0.5)).toBe(4);
    expect(minutesLeft(8, 0.99)).toBe(1);
    expect(minutesLeft(8, 1)).toBe(0);
  });
});

describe("activeHeadingIndex", () => {
  it("picks the last heading above the line", () => {
    expect(activeHeadingIndex([-400, 20, 120, 600], 140)).toBe(2);
    expect(activeHeadingIndex([-400, 20, 300], 140)).toBe(1);
  });

  it("is null before the first heading and skips missing ones", () => {
    expect(activeHeadingIndex([300, 900], 140)).toBeNull();
    expect(activeHeadingIndex([null, 10, null], 140)).toBe(1);
  });
});
