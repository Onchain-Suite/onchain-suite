import { beforeEach, describe, expect, it, vi } from "vitest";

import BillingPage from "./page";

const redirect = vi.hoisted(() =>
  vi.fn(() => {
    // The real one throws to stop rendering; so does this.
    throw new Error("NEXT_REDIRECT");
  })
);
vi.mock("next/navigation", () => ({ redirect }));

describe("/billing", () => {
  // Braces matter: a function returned from beforeEach is run as its cleanup,
  // and mockClear returns the mock.
  beforeEach(() => {
    redirect.mockClear();
  });

  // Stripe sends a cancelled checkout to /billing?canceled=<ref>. With no page
  // here that was a 404.
  it("sends a cancelled checkout back to billing in Settings", () => {
    expect(() => BillingPage()).toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/settings?tab=billing");
  });
});
