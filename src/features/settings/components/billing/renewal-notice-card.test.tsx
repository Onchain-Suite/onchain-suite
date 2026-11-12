import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RenewalNoticeCard } from "./renewal-notice-card";

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/utils");
  return { ...actual, getSelectedOrganizationId: () => "org1" };
});
const service = vi.hoisted(() => ({
  getOffer: vi.fn(),
  subscribe: vi.fn(),
}));
vi.mock("@/features/billing/renewal.service", () => ({
  renewalService: service,
}));

/** TraderComp as production reported it: Send, $18, paid up to 25 Nov. */
const offer = (over: Record<string, unknown> = {}) => ({
  available: true,
  reason: "no_card",
  plan: "send",
  planLabel: "Send",
  cycle: "monthly",
  priceUsd: 18,
  renewsAt: "2026-11-25T15:16:42.998Z",
  hasCard: false,
  ...over,
});

function renderCard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RenewalNoticeCard />
    </QueryClientProvider>
  );
}

describe("RenewalNoticeCard", () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://app.onchainsuite.com", assign },
    });
  });

  it("offers a workspace on our own invoices a subscription at its price", async () => {
    service.getOffer.mockResolvedValue(offer());
    renderCard();
    expect(
      await screen.findByText(/Your Send plan is paid up to 25 Nov 2026\./)
    ).toBeTruthy();
    expect(
      screen.getByText(/\$18 a month, the price you pay now/)
    ).toBeTruthy();
    expect(
      screen.getByText(/Nothing is charged before that date/)
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a card" })).toBeTruthy();
  });

  it("sends the owner to the page Stripe returned, from where they are", async () => {
    service.getOffer.mockResolvedValue(offer());
    service.subscribe.mockResolvedValue({
      url: "https://checkout.stripe.com/c/renew",
    });
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Add a card" }));
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/renew")
    );
    expect(service.subscribe).toHaveBeenCalledWith(
      "https://app.onchainsuite.com"
    );
  });

  it("needs no page when Stripe already holds a card", async () => {
    service.getOffer.mockResolvedValue(offer({ hasCard: true }));
    renderCard();
    expect(
      await screen.findByRole("button", { name: "Renew automatically" })
    ).toBeTruthy();
    expect(screen.getByText(/the card we have on record/)).toBeTruthy();
  });

  // A subscriber, a workspace that pays nothing, a lapsed plan.
  it("says nothing to a workspace that cannot be moved", async () => {
    service.getOffer.mockResolvedValue(
      offer({ available: false, reason: "already_subscribed" })
    );
    const { container } = renderCard();
    await waitFor(() => expect(service.getOffer).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  // An older backend has no such route; a teammate who is not the owner is
  // refused it. The billing page is whole without the card.
  it("says nothing when the offer cannot be read", async () => {
    service.getOffer.mockRejectedValue(new Error("Not found"));
    const { container } = renderCard();
    await waitFor(() => expect(service.getOffer).toHaveBeenCalled());
    expect(container.textContent).toBe("");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("says why when the renewal could not be started", async () => {
    service.getOffer.mockResolvedValue(offer());
    service.subscribe.mockRejectedValue(
      new Error("Already on a Stripe subscription.")
    );
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Add a card" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Already on a Stripe subscription."
      )
    );
    expect(assign).not.toHaveBeenCalled();
  });
});
