import { describe, expect, it } from "vitest";

import {
  expectedHoldoutFraction,
  fmtPts,
  heldFromEligible,
  holdoutActive,
  isMeasurable,
  liftTone,
} from "./holdout";
import type { HoldoutPolicy } from "@/features/settings/holdout.service";

const policy = (over: Partial<HoldoutPolicy>): HoldoutPolicy => ({
  campaignPct: 0,
  globalPct: 0,
  globalEnabled: false,
  rotatedAt: "1970-01-01T00:00:00.000Z",
  singleCampaignFloor: 10_000,
  ...over,
});

describe("expectedHoldoutFraction", () => {
  it("is 0 when nothing is held", () => {
    expect(expectedHoldoutFraction(policy({}))).toBe(0);
  });

  it("uses the campaign layer alone when global is off", () => {
    expect(expectedHoldoutFraction(policy({ campaignPct: 10 }))).toBeCloseTo(
      0.1
    );
  });

  it("ignores global pct unless enabled", () => {
    expect(
      expectedHoldoutFraction(policy({ campaignPct: 10, globalPct: 5 }))
    ).toBeCloseTo(0.1);
  });

  it("combines both layers: gp + (1-gp)*cp", () => {
    // 0.05 + 0.95 * 0.10 = 0.145
    expect(
      expectedHoldoutFraction(
        policy({ campaignPct: 10, globalPct: 5, globalEnabled: true })
      )
    ).toBeCloseTo(0.145);
  });

  it("clamps out-of-range percentages", () => {
    expect(expectedHoldoutFraction(policy({ campaignPct: 150 }))).toBe(1);
    expect(expectedHoldoutFraction(policy({ campaignPct: -10 }))).toBe(0);
  });
});

describe("heldFromEligible + holdoutActive", () => {
  it("rounds the held count and reports activity", () => {
    const p = policy({ campaignPct: 10 });
    expect(heldFromEligible(12_345, p)).toBe(1235);
    expect(holdoutActive(p)).toBe(true);
    expect(heldFromEligible(0, p)).toBe(0);
    expect(holdoutActive(policy({}))).toBe(false);
  });
});

describe("isMeasurable", () => {
  it("needs the eligible audience to reach the floor", () => {
    expect(isMeasurable(9_999, 10_000)).toBe(false);
    expect(isMeasurable(10_000, 10_000)).toBe(true);
  });
});

describe("fmtPts + liftTone", () => {
  it("formats signed points to one decimal", () => {
    expect(fmtPts(2.34)).toBe("+2.3pt");
    expect(fmtPts(-1)).toBe("-1.0pt");
    expect(fmtPts(0)).toBe("+0.0pt");
  });

  it("is neutral unless the verdict is significant", () => {
    expect(liftTone("underpowered", 5)).toBe("neutral");
    expect(liftTone("inconclusive", 5)).toBe("neutral");
    expect(liftTone("significant", 5)).toBe("positive");
    expect(liftTone("significant", -2)).toBe("negative");
  });
});
