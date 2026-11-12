import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CardOnFileCard } from "./card-on-file-card";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => nav.params,
}));
const toast = vi.hoisted(() => ({
  message: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));
const service = vi.hoisted(() => ({
  getCardOnFile: vi.fn(),
  startCardSetup: vi.fn(),
  billingPortal: vi.fn(),
}));
vi.mock("@/features/billing/billing.service", () => ({
  billingService: service,
}));

function renderCard(query = "tab=billing") {
  nav.params = new URLSearchParams(query);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CardOnFileCard />
    </QueryClientProvider>
  );
}

describe("CardOnFileCard", () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://app.test", assign },
    });
  });

  // A subscriber who paid by card saw "No card on file" here.
  it("shows the card a subscription renews on", async () => {
    service.getCardOnFile.mockResolvedValue({
      hasCard: true,
      brand: "Visa",
      last4: "4242",
      since: null,
      source: "subscription",
    });
    renderCard();
    expect(await screen.findByText("Visa •••• 4242")).toBeTruthy();
    expect(screen.getByText("Pays your subscription")).toBeTruthy();
    expect(screen.queryByText("No card on file")).toBeNull();
  });

  // Saving another card with us would not change the card Stripe renews on.
  it("changes a subscription's card in Stripe, not by saving one here", async () => {
    service.getCardOnFile.mockResolvedValue({
      hasCard: true,
      brand: "Visa",
      last4: "4242",
      source: "subscription",
    });
    service.billingPortal.mockResolvedValue({
      url: "https://billing.stripe.com/p/session/x",
    });
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Change card" }));
    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith(
        "https://billing.stripe.com/p/session/x"
      );
    });
    expect(service.startCardSetup).not.toHaveBeenCalled();
  });

  it("still saves a card for a workspace that has none", async () => {
    service.getCardOnFile.mockResolvedValue({ hasCard: false });
    service.startCardSetup.mockResolvedValue({
      url: "https://checkout.stripe.com/c/setup",
    });
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Add card" }));
    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith(
        "https://checkout.stripe.com/c/setup"
      );
    });
    expect(service.billingPortal).not.toHaveBeenCalled();
  });

  it("shows a card saved with us as on file", async () => {
    service.getCardOnFile.mockResolvedValue({
      hasCard: true,
      brand: "mastercard",
      last4: "4444",
      since: "2026-11-12T12:00:00.000Z",
    });
    renderCard();
    expect(await screen.findByText("Mastercard •••• 4444")).toBeTruthy();
    expect(screen.getByText("On file")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Update card" })).toBeTruthy();
  });

  // Back from the save page, the subscription's card was there all along. It
  // must not be taken for the card that was just saved.
  it("keeps waiting for the saved card while only the subscription's shows", async () => {
    service.getCardOnFile.mockResolvedValue({
      hasCard: true,
      brand: "Visa",
      last4: "4242",
      source: "subscription",
    });
    renderCard("tab=billing&card=added");
    expect(await screen.findByText("Saving your card…")).toBeTruthy();
    await waitFor(() => expect(service.getCardOnFile).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
});
