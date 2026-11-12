import { describe, expect, it } from "vitest";

import { subscriptionStatus } from "./subscription-status";

const sub = (over: Record<string, unknown> = {}) => ({
  hasSubscription: true,
  status: "active",
  cancelAtPeriodEnd: false,
  currentPeriodEnd: "2026-11-24T12:00:00.000Z",
  priceId: "price_launch",
  plan: "launch",
  planExpiresAt: "2026-11-24T12:00:00.000Z",
  ...over,
});

describe("subscriptionStatus", () => {
  it("has no label for a workspace with no card subscription", () => {
    expect(subscriptionStatus(undefined)).toEqual({ label: "" });
    expect(subscriptionStatus(sub({ hasSubscription: false }))).toEqual({
      label: "",
    });
  });

  it("is Active for a subscription in force", () => {
    expect(subscriptionStatus(sub())).toEqual({
      label: "Active",
      tone: "success",
    });
  });

  // Started over time already paid for: Stripe calls it a trial, and someone
  // who had just paid the difference was shown "Trialing".
  it("reads a subscription that bills nothing until its first charge as Active, with the date", () => {
    const status = subscriptionStatus(sub({ status: "trialing" }));
    expect(status.label).toBe("Active");
    expect(status.tone).toBe("success");
    expect(status.note).toMatch(/^Paid up to .*2026/);
  });

  it("names no date it does not have", () => {
    expect(
      subscriptionStatus(sub({ status: "trialing", currentPeriodEnd: null }))
    ).toEqual({ label: "Active", note: undefined, tone: "success" });
  });

  it("says a scheduled cancel is ending, whichever state it is in", () => {
    for (const status of ["active", "trialing"]) {
      const out = subscriptionStatus(sub({ status, cancelAtPeriodEnd: true }));
      expect(out.label).toBe("Canceling");
      expect(out.note).toMatch(/^Ends .*2026/);
      expect(out.tone).toBe("danger");
    }
  });

  it("names the states that need the card fixed", () => {
    expect(subscriptionStatus(sub({ status: "past_due" })).label).toBe(
      "Past due"
    );
    expect(subscriptionStatus(sub({ status: "unpaid" })).label).toBe("Unpaid");
    expect(subscriptionStatus(sub({ status: "canceled" })).label).toBe(
      "Canceled"
    );
  });

  it("shows a state it does not know as Stripe names it", () => {
    expect(subscriptionStatus(sub({ status: "paused" }))).toEqual({
      label: "Paused",
      tone: "pending",
    });
    expect(subscriptionStatus(sub({ status: null }))).toEqual({
      label: "Active",
      tone: "pending",
    });
  });
});
