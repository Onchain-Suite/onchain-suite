import { describe, expect, it } from "vitest";

import {
  formatOpenRange,
  formatRate,
  hasHumanStats,
  readHumanStats,
} from "./human-engagement";

const block = {
  humanClicks: 41,
  humanClickRate: 3.12,
  opens: {
    humanEstimateLow: 180,
    humanEstimateHigh: 512,
    apple: 361,
    machine: 27,
    raw: 540,
    rates: {
      humanEstimateLow: 13.69,
      humanEstimateHigh: 38.94,
      apple: 27.45,
      machine: 2.05,
      raw: 41.06,
    },
  },
};

describe("readHumanStats", () => {
  it("reads the human-first block", () => {
    const s = readHumanStats({ uniqueOpens: 540, ...block });
    expect(s.humanClicks).toBe(41);
    expect(s.humanClickRate).toBe(3.12);
    expect(s.opens?.apple).toBe(361);
    expect(s.opens?.rates.raw).toBe(41.06);
    expect(hasHumanStats(s)).toBe(true);
  });

  it("gives nulls for older data without the fields", () => {
    const s = readHumanStats({ uniqueOpens: 10, uniqueClicks: 2 });
    expect(s).toEqual({ humanClicks: null, humanClickRate: null, opens: null });
    expect(hasHumanStats(s)).toBe(false);
    expect(readHumanStats(undefined)).toEqual(s);
  });

  it("drops a partial opens block instead of showing half a range", () => {
    const s = readHumanStats({
      opens: {
        humanEstimateLow: 1,
        humanEstimateHigh: 2,
        apple: 1,
        machine: 0,
        raw: 2,
      },
    });
    expect(s.opens).toBeNull();
  });
});

describe("formatting", () => {
  it("shows opens as a range estimate", () => {
    const s = readHumanStats(block);
    expect(formatOpenRange(s.opens as NonNullable<typeof s.opens>)).toBe(
      "13.7–38.9% (estimate)"
    );
  });

  it("collapses an equal range", () => {
    const s = readHumanStats({
      ...block,
      opens: {
        ...block.opens,
        rates: {
          ...block.opens.rates,
          humanEstimateLow: 20,
          humanEstimateHigh: 20,
        },
      },
    });
    expect(formatOpenRange(s.opens as NonNullable<typeof s.opens>)).toBe(
      "20% (estimate)"
    );
  });

  it("formats a rate or a dash", () => {
    expect(formatRate(3.12)).toBe("3.1%");
    expect(formatRate(null)).toBe("-");
  });
});
