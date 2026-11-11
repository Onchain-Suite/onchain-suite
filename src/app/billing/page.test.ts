import { beforeEach, describe, expect, it, vi } from "vitest";

import BillingPage from "./page";

const redirect = vi.hoisted(() =>
  vi.fn(() => {
    // The real one throws to stop rendering; so does this.
    throw new Error("NEXT_REDIRECT");
  })
);
vi.mock("next/navigation", () => ({ redirect }));

const visit = (query: Record<string, string | string[] | undefined>) =>
  BillingPage({ searchParams: Promise.resolve(query) });

describe("/billing", () => {
  // Braces matter: a function returned from beforeEach is run as its cleanup,
  // and mockClear returns the mock.
  beforeEach(() => {
    redirect.mockClear();
  });

  // Stripe sends a cancelled checkout to /billing?canceled=<ref>. With no page
  // here that was a 404.
  it("sends a cancelled checkout to the billing tab, still marked as cancelled", async () => {
    await expect(
      visit({ canceled: "org_1:launch:1794422101439" })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(
      "/settings?tab=billing&checkout=canceled"
    );
  });

  it("sends a plain visit to the billing tab", async () => {
    await expect(visit({})).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/settings?tab=billing");
  });
});
