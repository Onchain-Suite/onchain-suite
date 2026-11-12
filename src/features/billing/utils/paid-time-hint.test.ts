import { describe, expect, it } from "vitest";

import { paidTimeHint } from "./paid-time-hint";
import { planSubmit } from "./plan-change";

const NOW = new Date("2026-11-12T14:19:00.000Z");

/** The report: Launch at 3,000 ($44) paid one-off, 5,000 ($65) picked. */
const hint = (over: Record<string, unknown> = {}) =>
  paidTimeHint({
    credited: true,
    paidThrough: "2026-11-24T20:50:00.000Z",
    currentMonthly: 44,
    newMonthly: 65,
    now: NOW,
    ...over,
  });

describe("paidTimeHint", () => {
  // They were told "the price shown is what you're billed", and were: $65 on
  // top of a month already paid for.
  it("says only the difference is charged today, and when the new price starts", () => {
    expect(hint()).toBe(
      "You have already paid up to 24 Nov 2026, so today you pay only the difference, about $21, on a secure Stripe checkout page. From that date the plan is $65/mo."
    );
  });

  it("names no amount while the quote for the new size is still loading", () => {
    expect(hint({ newMonthly: null })).toBe(
      "You have already paid up to 24 Nov 2026. Today you pay only the difference for a larger size, on a secure Stripe checkout page. The new price starts on that date."
    );
  });

  it("says nothing is charged today when the new plan costs no more", () => {
    for (const newMonthly of [44, 39]) {
      expect(hint({ newMonthly })).toMatch(
        /^You have already paid up to 24 Nov 2026, so nothing is charged today\. You'll add a card on a secure Stripe checkout page, and the plan is \$\d+\/mo from that date\.$/
      );
    }
  });

  // The server charges no difference inside the last two days of a cycle.
  it("says nothing is charged today inside the last two days", () => {
    expect(hint({ paidThrough: "2026-11-14T14:00:00.000Z" })).toMatch(
      /^You have already paid up to 14 Nov 2026, so nothing is charged today\./
    );
    expect(hint({ paidThrough: "2026-11-14T15:19:00.000Z" })).toMatch(
      /today you pay only the difference, about \$21/
    );
  });

  // The date is the day they are paid up to wherever the reader is.
  it("names the date the same for every reader", () => {
    expect(hint({ paidThrough: "2026-11-24T23:30:00.000Z" })).toContain(
      "24 Nov 2026"
    );
  });

  describe("says nothing, so the ordinary line is shown", () => {
    // A server that bills the whole month must not be spoken for.
    it("unless the server has said it credits paid time", () => {
      expect(hint({ credited: false })).toBeNull();
      expect(hint({ credited: undefined })).toBeNull();
    });

    it("to a workspace that pays for nothing", () => {
      for (const currentMonthly of [null, undefined, 0, -1, NaN]) {
        expect(hint({ currentMonthly })).toBeNull();
      }
    });

    it("with no date, a date already past, or one within two hours", () => {
      for (const paidThrough of [
        null,
        undefined,
        "",
        "soon",
        "2026-11-12T14:18:00.000Z",
        "2026-11-12T16:18:59.000Z",
      ]) {
        expect(hint({ paidThrough })).toBeNull();
      }
    });

    // An annual plan with months left: the server still bills from today.
    it("when paid up for more than a month ahead", () => {
      expect(hint({ paidThrough: "2026-12-12T14:19:01.000Z" })).toBeNull();
      expect(hint({ paidThrough: "2026-12-12T14:19:00.000Z" })).not.toBeNull();
    });
  });
});

/** The same, through what the picker's button actually calls. */
describe("the picker's line for a workspace paid up another way", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const submit = (over: Record<string, unknown> = {}) =>
    planSubmit({
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 5_000,
      selection: "suite",
      paymentMethod: "card",
      quote: {
        planLabel: "Launch",
        monthlyPrice: 65,
        units: 5_000,
        line: "suite",
      },
      current: {
        units: 3_000,
        hasSubscription: false,
        canResize: false,
        monthlyPrice: 44,
        paidThrough: new Date(Date.now() + 12 * DAY).toISOString(),
        paidTimeCredited: true,
      },
      ...over,
    });
  const ORDINARY =
    "You'll complete payment on a secure Stripe checkout page. The price shown is what you're billed.";

  it("says they pay the difference, not the price shown", () => {
    const out = submit();
    expect(out.change).toBe("resize");
    expect(out.disabled).toBe(false);
    expect(out.hint).toMatch(
      /^You have already paid up to \d{1,2} \w{3} \d{4}, so today you pay only the difference, about \$21, on a secure Stripe checkout page\. From that date the plan is \$65\/mo\.$/
    );
  });

  it("keeps the ordinary line on a server that bills the whole month", () => {
    const current = {
      units: 3_000,
      hasSubscription: false,
      canResize: false,
      monthlyPrice: 44,
      paidThrough: new Date(Date.now() + 12 * DAY).toISOString(),
    };
    expect(submit({ current }).hint).toBe(ORDINARY);
    expect(
      submit({ current: { ...current, paidTimeCredited: false } }).hint
    ).toBe(ORDINARY);
  });

  // Crypto is a one-off payment with its own rule; nothing is promised here.
  it("says nothing of it to someone paying in crypto", () => {
    expect(submit({ paymentMethod: "crypto" }).hint).toMatch(
      /^You'll pay in USDC/
    );
  });

  // A subscriber's change is made in place and has its own line.
  it("leaves a subscriber's line alone", () => {
    const out = submit({
      current: {
        units: 3_000,
        hasSubscription: true,
        canResize: true,
        upgradeChargedNow: true,
        monthlyPrice: 44,
        paidThrough: new Date(Date.now() + 12 * DAY).toISOString(),
        paidTimeCredited: true,
      },
    });
    expect(out.hint).toMatch(/^Your card is charged the difference/);
  });
});
