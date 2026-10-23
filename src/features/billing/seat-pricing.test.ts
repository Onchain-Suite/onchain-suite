import { describe, expect, it } from "vitest";

import {
  clampExtraSeats,
  includedSeatsForPlan,
  SEAT_PRICE_USD,
  seatBilling,
} from "./seat-pricing";

describe("includedSeatsForPlan", () => {
  it("maps known tiers and defaults unknown/empty to the entry allowance", () => {
    expect(includedSeatsForPlan("growth")).toBe(4);
    expect(includedSeatsForPlan("PRO")).toBe(7);
    expect(includedSeatsForPlan("mystery")).toBe(2);
    expect(includedSeatsForPlan(null)).toBe(2);
  });
});

describe("clampExtraSeats", () => {
  it("clamps to [0, 50] integers and treats junk as 0", () => {
    expect(clampExtraSeats(3.6)).toBe(4);
    expect(clampExtraSeats(-5)).toBe(0);
    expect(clampExtraSeats(999)).toBe(50);
    expect(clampExtraSeats(NaN)).toBe(0);
    expect(clampExtraSeats(undefined)).toBe(0);
  });
});

describe("seatBilling", () => {
  it("is free and the next seat is free while under the allowance", () => {
    const b = seatBilling(2, 4);
    expect(b.extraSeats).toBe(0);
    expect(b.extraMonthlyUsd).toBe(0);
    expect(b.nextIsBillable).toBe(false);
  });

  it("flags the next seat as billable once the allowance is exactly full", () => {
    const b = seatBilling(4, 4);
    expect(b.extraSeats).toBe(0);
    expect(b.nextIsBillable).toBe(true);
  });

  it("prices seats beyond the allowance at the SSOT rate", () => {
    const b = seatBilling(6, 4);
    expect(b.extraSeats).toBe(2);
    expect(b.extraMonthlyUsd).toBe(2 * SEAT_PRICE_USD);
    expect(b.nextIsBillable).toBe(true);
  });

  it("clamps non-finite / negative inputs to zero", () => {
    expect(seatBilling(NaN, 4)).toEqual({
      extraSeats: 0,
      extraMonthlyUsd: 0,
      nextIsBillable: false,
    });
    expect(seatBilling(5, undefined)).toMatchObject({
      extraSeats: 5,
      nextIsBillable: true,
    });
  });
});
