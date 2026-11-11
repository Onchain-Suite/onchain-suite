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
      message: "Plan updated. Your next invoice reflects the change.",
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
