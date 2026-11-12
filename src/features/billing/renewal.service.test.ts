import { beforeEach, describe, expect, it, vi } from "vitest";

import { renewalService } from "./renewal.service";

const billingRequest = vi.hoisted(() => vi.fn());
vi.mock("./billing.service", () => ({ billingRequest }));

describe("renewalService", () => {
  beforeEach(() => {
    billingRequest.mockReset();
  });

  // The workspace is named by the x-org-id header the request helper adds,
  // never by an id in the address.
  it("reads the active workspace's renewal offer", async () => {
    billingRequest.mockResolvedValue({ available: true });
    expect(await renewalService.getOffer()).toEqual({ available: true });
    expect(billingRequest).toHaveBeenCalledWith(
      { method: "GET", url: "/billing/renewal" },
      undefined
    );
  });

  it("starts the renewal, saying where the browser is", async () => {
    billingRequest.mockResolvedValue({
      url: "https://checkout.stripe.com/c/x",
    });
    const out = await renewalService.subscribe("https://app.onchainsuite.com");
    expect(out.url).toBe("https://checkout.stripe.com/c/x");
    expect(billingRequest).toHaveBeenCalledWith(
      {
        method: "POST",
        url: "/billing/renewal/subscribe",
        data: { returnUrl: "https://app.onchainsuite.com" },
      },
      undefined
    );
  });

  it("passes a chosen workspace through", async () => {
    billingRequest.mockResolvedValue({});
    await renewalService.getOffer({ orgId: "org9" });
    expect(billingRequest.mock.calls[0]?.[1]).toEqual({ orgId: "org9" });
  });
});
