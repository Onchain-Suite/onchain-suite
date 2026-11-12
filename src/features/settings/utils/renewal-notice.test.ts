import { describe, expect, it } from "vitest";

import { renewalNotice } from "./renewal-notice";

/** TraderComp as production reported it: Send, $18, paid up to 25 Nov. */
const offer = (over: Record<string, unknown> = {}) => ({
  available: true,
  planLabel: "Send",
  cycle: "monthly",
  priceUsd: 18,
  renewsAt: "2026-11-25T15:16:42.998Z",
  hasCard: false,
  ...over,
});

describe("renewalNotice", () => {
  // The two things a person hesitates over: the price, and being charged now.
  it("says the price stays and nothing is charged before the date", () => {
    expect(renewalNotice(offer())).toEqual({
      title: "Renew automatically",
      body: "Your Send plan is paid up to 25 Nov 2026. Add a card once. It renews by itself from then at $18 a month, the price you pay now. Nothing is charged before that date.",
      actionLabel: "Add a card",
    });
  });

  it("needs no card from a workspace Stripe already holds one for", () => {
    const notice = renewalNotice(offer({ hasCard: true }));
    expect(notice?.actionLabel).toBe("Renew automatically");
    expect(notice?.body).toContain("Put it on the card we have on record.");
    expect(notice?.body).not.toContain("Add a card");
  });

  it("names an annual price as a year's", () => {
    expect(
      renewalNotice(offer({ cycle: "annual", priceUsd: 216 }))?.body
    ).toContain("at $216 a year");
  });

  it("shows cents when the price has them", () => {
    expect(renewalNotice(offer({ priceUsd: 65.18 }))?.body).toContain(
      "at $65.18 a month"
    );
    expect(renewalNotice(offer({ priceUsd: 1622 }))?.body).toContain(
      "at $1,622 a month"
    );
  });

  it("reads without a plan name", () => {
    expect(renewalNotice(offer({ planLabel: null }))?.body).toMatch(
      /^Your plan is paid up to 25 Nov 2026\./
    );
    expect(renewalNotice(offer({ planLabel: "  " }))?.body).toMatch(
      /^Your plan is paid up to/
    );
  });

  // The date is the day it is paid up to wherever the reader is: 23:30 UTC on
  // the 25th is not "26 Nov" for someone east of Greenwich.
  it("names the date the same for every reader", () => {
    expect(
      renewalNotice(offer({ renewsAt: "2026-11-25T23:30:00.000Z" }))?.body
    ).toContain("25 Nov 2026");
  });

  it("says nothing to a workspace that cannot be moved", () => {
    for (const none of [
      null,
      undefined,
      {},
      offer({ available: false }),
      offer({ available: "true" }),
    ]) {
      expect(renewalNotice(none)).toBeNull();
    }
  });

  // Without the price or the date there is nothing true to promise.
  it("says nothing when it cannot name the price or the date", () => {
    for (const over of [
      { priceUsd: null },
      { priceUsd: 0 },
      { priceUsd: NaN },
      { priceUsd: "18" },
      { renewsAt: null },
      { renewsAt: "soon" },
    ]) {
      expect(renewalNotice(offer(over))).toBeNull();
    }
  });
});
