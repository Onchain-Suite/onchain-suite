import { describe, expect, it } from "vitest";

import { checkoutReturnNotice } from "./checkout-return";

describe("checkoutReturnNotice", () => {
  it("tells someone who backed out of checkout that nothing was charged", () => {
    expect(checkoutReturnNotice({ checkout: "canceled" })).toEqual({
      kind: "info",
      message: "Checkout cancelled. You have not been charged.",
      refresh: false,
    });
  });

  it("confirms a change of size, and asks for the figures to be read again", () => {
    expect(checkoutReturnNotice({ subscription: "updated" })).toEqual({
      kind: "success",
      message: "Plan updated. The price below is what you pay now.",
      refresh: true,
    });
  });

  // Someone who has just entered a card needs to hear that it was not charged.
  it("confirms a renewal put on a subscription, and that nothing was charged", () => {
    expect(checkoutReturnNotice({ subscription: "started" })).toEqual({
      kind: "success",
      message:
        "Your plan now renews by itself. Nothing was charged today; the first charge is on your renewal date.",
      refresh: true,
    });
  });

  it("says nothing for a plain visit or a marker nobody defined", () => {
    for (const params of [
      {},
      { checkout: null, subscription: null },
      { checkout: "paid" },
      { checkout: "" },
      { subscription: "canceled" },
    ]) {
      expect(checkoutReturnNotice(params)).toBeNull();
    }
  });
});
