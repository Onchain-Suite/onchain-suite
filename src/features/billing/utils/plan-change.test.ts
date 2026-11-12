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
): CurrentPlanSize => ({ units, hasSubscription: true, canResize });
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
      paymentMethod: "card",
    });
    expect(hint).toMatch(/no checkout/);
    expect(hint).toMatch(/pro rata on your next invoice/);
    expect(hint).toMatch(/smaller one starts at renewal/);
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
    planLabel: "Launch",
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
      planLabel: "Launch",
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
