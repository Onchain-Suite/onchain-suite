import { describe, expect, it } from "vitest";

import { isOwnPage, subscribeRequestFor } from "./subscribe-request";

// The picker quotes a price for the size on its slider. The card path used to
// leave that size out of the request, so the backend billed the contacts the
// workspace held: quoted $65 for 5,000, charged $12.85 for 20.
describe("subscribeRequestFor", () => {
  it("sends the size on the slider, so the charge is the price quoted", () => {
    expect(subscribeRequestFor("launch", "org_1", { contacts: 5000 })).toEqual({
      plan: "launch",
      organizationId: "org_1",
      contacts: 5000,
    });
  });

  it("sends extra seats alongside the size", () => {
    expect(
      subscribeRequestFor("growth", "org_1", { contacts: 30000, extraSeats: 2 })
    ).toEqual({
      plan: "growth",
      organizationId: "org_1",
      contacts: 30000,
      extraSeats: 2,
    });
  });

  it("rounds a size that is not a whole number", () => {
    expect(
      subscribeRequestFor("launch", "org_1", { contacts: 4999.6 }).contacts
    ).toBe(5000);
  });

  it("leaves out a size or seat count that is not usable, rather than send it", () => {
    for (const contacts of [0, -10, NaN, Infinity, undefined]) {
      expect(
        subscribeRequestFor("launch", "org_1", { contacts, extraSeats: 0 })
      ).toEqual({ plan: "launch", organizationId: "org_1" });
    }
  });
});

describe("isOwnPage", () => {
  const origin = "https://app.onchainsuite.com";

  it("knows our billing tab from a payment page", () => {
    expect(
      isOwnPage(`${origin}/settings?tab=billing&subscription=updated`, origin)
    ).toBe(true);
    expect(
      isOwnPage("https://checkout.stripe.com/c/pay/cs_live_abc", origin)
    ).toBe(false);
  });

  it("is not fooled by our name inside another host", () => {
    for (const url of [
      "https://app.onchainsuite.com.evil.example/settings",
      "https://evil.example/?next=https://app.onchainsuite.com",
      "http://app.onchainsuite.com/settings",
    ]) {
      expect(isOwnPage(url, origin)).toBe(false);
    }
  });

  it("treats a URL that will not parse as not ours", () => {
    for (const url of ["", "not a url", "/settings?tab=billing"]) {
      expect(isOwnPage(url, origin)).toBe(false);
    }
  });
});
