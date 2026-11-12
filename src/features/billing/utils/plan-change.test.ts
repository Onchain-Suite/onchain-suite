import { describe, expect, it } from "vitest";

import {
  type CurrentPlanSize,
  planChange,
  planSubmit,
  planSubmitHint,
  planSubmitLabel,
} from "./plan-change";

const subscriber = (
  units: number | null,
  canResize = true
): CurrentPlanSize => ({
  units,
  hasSubscription: true,
  canResize,
  upgradeChargedNow: true,
});
const paidAnotherWay = (units: number | null): CurrentPlanSize => ({
  units,
  hasSubscription: false,
  canResize: false,
});

describe("planChange", () => {
  // The report: on Launch at 5,000, wanting more contacts. Every size inside
  // Launch read as "Current plan" and the button was dead.
  it("lets a subscriber change size inside their tier", () => {
    expect(
      planChange({
        resolvedPlan: "launch",
        currentPlan: "launch",
        units: 12_000,
        current: subscriber(5_000),
      })
    ).toBe("resize");
    expect(
      planChange({
        resolvedPlan: "launch",
        currentPlan: "launch",
        units: 2_500,
        current: subscriber(5_000),
      })
    ).toBe("resize");
  });

  it("is the current plan only at the size they already have", () => {
    expect(
      planChange({
        resolvedPlan: "launch",
        currentPlan: "launch",
        units: 5_000,
        current: subscriber(5_000),
      })
    ).toBe("current");
  });

  it("is a switch when the slider lands in another tier", () => {
    expect(
      planChange({
        resolvedPlan: "growth",
        currentPlan: "launch",
        units: 30_000,
        current: subscriber(5_000),
      })
    ).toBe("switch");
  });

  // A server that has not said it resizes would answer with a second checkout,
  // and a second checkout is a second subscription billing beside the first.
  it("offers a subscriber nothing when the server cannot change the subscription in place", () => {
    for (const [resolvedPlan, units] of [
      ["launch", 12_000],
      ["growth", 30_000],
    ] as const) {
      expect(
        planChange({
          resolvedPlan,
          currentPlan: "launch",
          units,
          current: subscriber(5_000, false),
        })
      ).toBe("blocked");
    }
    // Still just "current" at the size they have: nothing was being offered.
    expect(
      planChange({
        resolvedPlan: "launch",
        currentPlan: "launch",
        units: 5_000,
        current: subscriber(5_000, false),
      })
    ).toBe("current");
  });

  it("lets a workspace paid another way buy a larger size, and offers nothing smaller", () => {
    expect(
      planChange({
        resolvedPlan: "launch",
        currentPlan: "launch",
        units: 9_000,
        current: paidAnotherWay(5_000),
      })
    ).toBe("resize");
    expect(
      planChange({
        resolvedPlan: "launch",
        currentPlan: "launch",
        units: 3_000,
        current: paidAnotherWay(5_000),
      })
    ).toBe("current");
  });

  it("keeps the old answer when the size they have is not known", () => {
    for (const current of [undefined, null, subscriber(null), subscriber(0)]) {
      expect(
        planChange({
          resolvedPlan: "launch",
          currentPlan: "launch",
          units: 12_000,
          current,
        })
      ).toBe("current");
    }
  });

  it("treats a first purchase as a switch", () => {
    expect(
      planChange({ resolvedPlan: "launch", currentPlan: "", units: 5_000 })
    ).toBe("switch");
    expect(
      planChange({
        resolvedPlan: "launch",
        currentPlan: "payg",
        units: 5_000,
        current: paidAnotherWay(null),
      })
    ).toBe("switch");
  });

  it("has no size to change on pay-as-you-go", () => {
    expect(
      planChange({
        resolvedPlan: "payg",
        currentPlan: "payg",
        units: 0,
        current: paidAnotherWay(1_000),
      })
    ).toBe("current");
  });
});

describe("planSubmitLabel", () => {
  const base = {
    isPayg: false,
    submitLabel: "Upgrade to",
    planLabel: "Launch",
    units: 12_000,
    unit: "contacts" as const,
  };

  it("names the new size for a change of size", () => {
    expect(planSubmitLabel({ ...base, change: "resize" })).toBe(
      "Update to 12,000 contacts"
    );
    expect(
      planSubmitLabel({
        ...base,
        change: "resize",
        units: 7_500,
        unit: "subscribers",
      })
    ).toBe("Update to 7,500 subscribers");
  });

  it("keeps the wording it had for the other cases", () => {
    expect(planSubmitLabel({ ...base, change: "current" })).toBe(
      "Current plan"
    );
    expect(planSubmitLabel({ ...base, change: "switch" })).toBe(
      "Upgrade to Launch"
    );
    expect(
      planSubmitLabel({ ...base, change: "switch", submitLabel: undefined })
    ).toBe("Continue with Launch");
    expect(planSubmitLabel({ ...base, change: "switch", isPayg: true })).toBe(
      "Upgrade to pay-as-you-go"
    );
    expect(
      planSubmitLabel({
        ...base,
        change: "switch",
        isPayg: true,
        submitLabel: undefined,
      })
    ).toBe("Start free");
  });

  it("points a subscriber it cannot help at Manage billing", () => {
    expect(planSubmitLabel({ ...base, change: "blocked" })).toBe(
      "Change it in Manage billing"
    );
  });
});

describe("planSubmitHint", () => {
  it("tells a subscriber the change has no checkout, and when it is charged", () => {
    const hint = planSubmitHint({
      change: "resize",
      isPayg: false,
      inPlace: true,
      chargedNow: true,
      paymentMethod: "card",
    });
    expect(hint).toMatch(/no checkout/);
    expect(hint).toMatch(/charged the difference for this period now/);
  });

  it("promises a checkout only where there will be one", () => {
    const card = planSubmitHint({
      change: "switch",
      isPayg: false,
      inPlace: false,
      paymentMethod: "card",
    });
    expect(card).toMatch(/secure Stripe checkout page/);
    const crypto = planSubmitHint({
      change: "resize",
      isPayg: false,
      inPlace: false,
      paymentMethod: "crypto",
    });
    expect(crypto).toMatch(/USDC/);
  });

  it("says where to go when the picker cannot make the change", () => {
    expect(
      planSubmitHint({
        change: "blocked",
        isPayg: false,
        inPlace: false,
        paymentMethod: "card",
      })
    ).toMatch(/Manage billing/);
  });
});

describe("planSubmit", () => {
  const base = {
    selection: "suite" as const,
    submitLabel: "Upgrade to",
    quote: {
      planLabel: "Launch",
      monthlyPrice: 139,
      units: 12_000,
      line: "suite",
    },
    paymentMethod: "card" as const,
  };

  // On Launch at 5,000, slider moved to 12,000: this was a dead "Current plan".
  it("gives a subscriber on Launch a live button for a bigger Launch", () => {
    const out = planSubmit({
      ...base,
      resolvedPlan: "launch",
      currentPlan: "Launch",
      units: 12_000,
      current: subscriber(5_000),
    });
    expect(out).toMatchObject({
      change: "resize",
      disabled: false,
      label: "Update to 12,000 contacts",
    });
    expect(out.hint).toMatch(/no checkout/);
  });

  // "They pay $39 at 2,500, upgrade to 5,000 this month, pay the difference
  // now, and $65 from next month."
  it("says what an upgrade charges now and what it costs from the next renewal", () => {
    const out = planSubmit({
      ...base,
      quote: {
        planLabel: "Launch",
        monthlyPrice: 65,
        units: 5_000,
        line: "suite",
      },
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 5_000,
      current: { ...subscriber(2_500), monthlyPrice: 39 },
    });
    expect(out.label).toBe("Update to 5,000 contacts");
    expect(out.hint).toBe(
      "Your card is charged the difference for this period now, about $26, with no checkout. From your next renewal the plan is $65/mo."
    );
  });

  // Review finding: with seats added on the stepper the headline shows plan
  // plus seats, and "it is $65/mo" read as the total. The change made here
  // does not buy seats at all.
  it("calls the renewal figure the plan's, and says seats are not part of this", () => {
    const withSeats = planSubmit({
      ...base,
      quote: {
        planLabel: "Launch",
        monthlyPrice: 65,
        units: 5_000,
        line: "suite",
      },
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 5_000,
      current: { ...subscriber(2_500), monthlyPrice: 39 },
      extraSeats: 2,
    });
    expect(withSeats.hint).toMatch(/the plan is \$65\/mo/);
    expect(withSeats.hint).toMatch(
      /Seats are not changed here; add or remove them in Manage billing\.$/
    );

    const noSeats = planSubmit({
      ...base,
      quote: {
        planLabel: "Launch",
        monthlyPrice: 65,
        units: 5_000,
        line: "suite",
      },
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 5_000,
      current: { ...subscriber(2_500), monthlyPrice: 39 },
      extraSeats: 0,
    });
    expect(noSeats.hint).not.toMatch(/Seats/);
  });

  it("says the same about seats on a smaller size and on an older server", () => {
    const smaller = planSubmit({
      ...base,
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 2_500,
      current: { ...subscriber(5_000), monthlyPrice: 65 },
      extraSeats: 1,
    });
    expect(smaller.hint).toMatch(/Seats are not changed here/);

    const older = planSubmit({
      ...base,
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 12_000,
      current: { ...subscriber(5_000), upgradeChargedNow: false },
      extraSeats: 1,
    });
    expect(older.hint).toMatch(/added to your next invoice/);
    expect(older.hint).toMatch(/Seats are not changed here/);
  });

  it("does not mention seats to someone going to a checkout, where they are bought", () => {
    const out = planSubmit({
      selection: "suite",
      resolvedPlan: "launch",
      units: 11_000,
      quote: { planLabel: "Launch", monthlyPrice: 126 },
      paymentMethod: "card",
      extraSeats: 3,
    });
    expect(out.hint).toMatch(/secure Stripe checkout page/);
    expect(out.hint).not.toMatch(/Seats/);
  });

  it("says a smaller size waits for renewal and moves no money now", () => {
    const out = planSubmit({
      ...base,
      quote: { planLabel: "Launch", monthlyPrice: 39 },
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 2_500,
      current: { ...subscriber(5_000), monthlyPrice: 65 },
    });
    expect(out.hint).toMatch(/next renewal/);
    expect(out.hint).toMatch(/Nothing is charged or refunded now/);
  });

  // The frontend goes live on merge; the backend is deployed by hand. Until
  // it is, the server still adds an upgrade to the next invoice.
  it("does not promise a charge now to a server that has not said it makes one", () => {
    const out = planSubmit({
      ...base,
      quote: {
        planLabel: "Launch",
        monthlyPrice: 65,
        units: 5_000,
        line: "suite",
      },
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 5_000,
      current: {
        ...subscriber(2_500),
        monthlyPrice: 39,
        upgradeChargedNow: false,
      },
    });
    expect(out.label).toBe("Update to 5,000 contacts");
    expect(out.hint).toBe(
      "Applied to your subscription straight away, with no checkout. The extra for this period is added to your next invoice."
    );
    expect(out.hint).not.toMatch(/charged the difference/);
  });

  // Review finding: the quote is fetched after the slider moves, and the
  // picker keeps showing the last one meanwhile. The line named the PREVIOUS
  // size's price while the button was already submitting the new size.
  it("names no amount while the quote it holds is for another size", () => {
    const stale = planSubmit({
      ...base,
      // Still the quote for 5,000; the slider is now on 12,000.
      quote: {
        planLabel: "Launch",
        monthlyPrice: 65,
        units: 5_000,
        line: "suite",
      },
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 12_000,
      current: { ...subscriber(2_500), monthlyPrice: 39 },
    });
    expect(stale.label).toBe("Update to 12,000 contacts");
    expect(stale.hint).toBe(
      "Your card is charged the difference for this period now, with no checkout. The new price in full starts at your next renewal."
    );
    expect(stale.hint).not.toMatch(/\$/);

    // The quote for 12,000 arrives: now the amounts are named.
    const fresh = planSubmit({
      ...base,
      quote: {
        planLabel: "Launch",
        monthlyPrice: 139,
        units: 12_000,
        line: "suite",
      },
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 12_000,
      current: { ...subscriber(2_500), monthlyPrice: 39 },
    });
    expect(fresh.hint).toMatch(/about \$100/);
    expect(fresh.hint).toMatch(/the plan is \$139\/mo/);
  });

  // Review finding: Suite and Send can sit on the same number. Switching line
  // kept the other line's quote for a moment, and its size matched.
  it("names no amount from a quote for the other plan line, even at the same size", () => {
    const out = planSubmit({
      selection: "send",
      submitLabel: "Upgrade to",
      paymentMethod: "card",
      // The Suite quote for 10,000 contacts; the picker is now on Send.
      quote: {
        planLabel: "Launch",
        monthlyPrice: 118,
        units: 10_000,
        line: "suite",
      },
      resolvedPlan: "send",
      currentPlan: "send",
      units: 10_000,
      current: { ...subscriber(5_000), monthlyPrice: 26 },
    });
    expect(out.label).toBe("Update to 10,000 subscribers");
    expect(out.hint).not.toMatch(/\$/);

    const matching = planSubmit({
      selection: "send",
      submitLabel: "Upgrade to",
      paymentMethod: "card",
      quote: {
        planLabel: "Send",
        monthlyPrice: 46,
        units: 10_000,
        line: "send",
      },
      resolvedPlan: "send",
      currentPlan: "send",
      units: 10_000,
      current: { ...subscriber(5_000), monthlyPrice: 26 },
    });
    expect(matching.hint).toMatch(/about \$20/);
    expect(matching.hint).toMatch(/the plan is \$46\/mo/);
  });

  it("names no amount from a quote that does not say what size it is for", () => {
    const out = planSubmit({
      ...base,
      quote: { planLabel: "Launch", monthlyPrice: 139 },
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 12_000,
      current: { ...subscriber(2_500), monthlyPrice: 39 },
    });
    expect(out.hint).not.toMatch(/\$/);
  });

  it("names no amount it does not know", () => {
    const out = planSubmit({
      ...base,
      quote: null,
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 12_000,
      current: subscriber(5_000),
    });
    expect(out.hint).toBe(
      "Your card is charged the difference for this period now, with no checkout. The new price in full starts at your next renewal."
    );
  });

  it("is a dead button at the size they already have", () => {
    const out = planSubmit({
      ...base,
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 5_000,
      current: subscriber(5_000),
    });
    expect(out).toMatchObject({ disabled: true, label: "Current plan" });
  });

  it("is a dead button, with a way out, when the server cannot resize", () => {
    const out = planSubmit({
      ...base,
      resolvedPlan: "launch",
      currentPlan: "launch",
      units: 12_000,
      current: subscriber(5_000, false),
    });
    expect(out.disabled).toBe(true);
    expect(out.label).toBe("Change it in Manage billing");
    expect(out.hint).toMatch(/Manage billing/);
  });

  it("is unchanged for onboarding, where nothing is known about a current plan", () => {
    const out = planSubmit({
      selection: "suite",
      resolvedPlan: "launch",
      units: 11_000,
      quote: { planLabel: "Launch", monthlyPrice: 126 },
      paymentMethod: "card",
    });
    expect(out).toMatchObject({
      change: "switch",
      disabled: false,
      label: "Continue with Launch",
    });
    expect(out.hint).toMatch(/secure Stripe checkout page/);
  });

  it("names Send and counts subscribers on the Send line", () => {
    const out = planSubmit({
      selection: "send",
      resolvedPlan: "send",
      currentPlan: "send",
      units: 20_000,
      current: subscriber(10_000),
      submitLabel: "Upgrade to",
      paymentMethod: "card",
    });
    expect(out.label).toBe("Update to 20,000 subscribers");
  });

  it("starts pay-as-you-go for free", () => {
    const out = planSubmit({
      selection: "payg",
      resolvedPlan: "payg",
      units: 0,
      paymentMethod: "card",
    });
    expect(out.label).toBe("Start free");
    expect(out.hint).toBe("No credit card required. Upgrade anytime.");
  });
});
