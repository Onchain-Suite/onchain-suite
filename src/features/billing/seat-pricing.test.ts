import { describe, expect, it } from "vitest";

import {
  clampExtraSeats,
  includedSeatsForPlan,
  seatUsage,
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

describe("seatUsage", () => {
  it("counts members and pending invites as taken", () => {
    expect(seatUsage({ members: 1, pendingInvites: 1, limit: 4 })).toEqual({
      taken: 2,
      limit: 4,
      free: 2,
      isFull: false,
      percent: 50,
    });
  });

  // The backend refuses the next invite at members + pending invites = limit.
  it("is full when a pending invite holds the last seat", () => {
    const u = seatUsage({ members: 1, pendingInvites: 1, limit: 2 });
    expect(u).toMatchObject({ taken: 2, free: 0, isFull: true, percent: 100 });
  });

  it("stays full, and caps the meter, when over the limit", () => {
    const u = seatUsage({ members: 5, pendingInvites: 0, limit: 2 });
    expect(u).toMatchObject({ taken: 5, free: 0, isFull: true, percent: 100 });
  });

  it("says nothing when the limit is unknown or the plan has none", () => {
    expect(seatUsage({ members: 3, pendingInvites: 0, limit: undefined })).toBe(
      null
    );
    expect(seatUsage({ members: 3, pendingInvites: 0, limit: -1 })).toBeNull();
    expect(seatUsage({ members: 3, pendingInvites: 0, limit: 0 })).toBeNull();
    expect(seatUsage({ members: 3, pendingInvites: 0, limit: NaN })).toBeNull();
  });

  it("treats missing or junk counts as zero", () => {
    expect(
      seatUsage({ members: NaN, pendingInvites: undefined, limit: 2 })
    ).toMatchObject({ taken: 0, free: 2, isFull: false });
    expect(
      seatUsage({ members: -3, pendingInvites: null, limit: 2 })
    ).toMatchObject({ taken: 0 });
  });
});
