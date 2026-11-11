import { describe, expect, it } from "vitest";

import { billingRedirectTarget } from "./billing-redirect";

describe("billingRedirectTarget", () => {
  it("is the billing tab for a plain visit", () => {
    expect(billingRedirectTarget({})).toBe("/settings?tab=billing");
  });

  // Stripe's cancel URL on sessions already issued: /billing?canceled=<ref>.
  it("keeps the fact that a checkout was cancelled, so the tab can say so", () => {
    expect(
      billingRedirectTarget({
        canceled: "f03e2adb-f605-40fa-8735-0ec906fa9acb:launch:1794422101439",
      })
    ).toBe("/settings?tab=billing&checkout=canceled");
    expect(billingRedirectTarget({ canceled: ["a", "b"] })).toBe(
      "/settings?tab=billing&checkout=canceled"
    );
  });

  it("does not carry the reference, or anything else from the address", () => {
    const target = billingRedirectTarget({
      canceled: "x&tab=profile",
      tab: "profile",
      next: "https://evil.example",
    });
    expect(target).toBe("/settings?tab=billing&checkout=canceled");
  });

  it("treats an empty marker as no marker", () => {
    expect(billingRedirectTarget({ canceled: "" })).toBe(
      "/settings?tab=billing"
    );
    expect(billingRedirectTarget({ canceled: [] })).toBe(
      "/settings?tab=billing"
    );
    expect(billingRedirectTarget({ canceled: undefined })).toBe(
      "/settings?tab=billing"
    );
  });
});
