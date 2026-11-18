import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EnrichmentControl } from "./enrichment-control";

const service = vi.hoisted(() => ({
  getEnrichmentStatus: vi.fn(),
  enrichProtocol: vi.fn(),
}));
vi.mock("../intelligence.service", () => ({
  intelligenceService: service,
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const MESSAGE =
  "This refresh re-enriches 2,886 wallets and can use up to 8,658 credits. 1,000 are left this month and the usage wallet cannot cover the rest.";

/** What the service throws for a 402: the message, the axios error as cause. */
const refused = (code: string, message: string) =>
  new Error(message, {
    cause: {
      response: {
        status: 402,
        data: { success: false, error: { code, message } },
      },
    },
  });

function renderControl() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EnrichmentControl />
    </QueryClientProvider>
  );
}

const clickRefresh = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh on-chain data" })
  );

describe("EnrichmentControl refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.getEnrichmentStatus.mockResolvedValue({
      enrichedWallets: 10,
      pending: 0,
      idle: true,
      lastEnrichedAt: null,
    });
  });

  // A workspace clicked Refresh with 2,886 wallets on a 1,000-credit plan, got no
  // warning and overdrew. The refusal now asks first, in the backend's own words.
  it("asks before a refresh that does not fit, then refreshes what fits", async () => {
    service.enrichProtocol
      .mockRejectedValueOnce(refused("REFRESH_EXCEEDS_CREDITS", MESSAGE))
      .mockResolvedValueOnce({
        contracts: [],
        walletsEnqueued: 0,
        contactsEnqueued: 300,
      });
    renderControl();

    clickRefresh();
    expect(await screen.findByText(MESSAGE)).toBeTruthy();
    expect(service.enrichProtocol).toHaveBeenLastCalledWith(undefined);
    expect(toast.error).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Go to billing" }).getAttribute("href")
    ).toBe("/settings?tab=billing");

    fireEvent.click(screen.getByRole("button", { name: "Refresh what fits" }));
    await waitFor(() =>
      expect(service.enrichProtocol).toHaveBeenLastCalledWith({
        allowPartial: true,
      })
    );
    await waitFor(() => expect(screen.queryByText(MESSAGE)).toBeNull());
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Onchain credits allow")
    );
  });

  it("says Onchain credits when the allowance and wallet are spent", async () => {
    service.enrichProtocol.mockRejectedValueOnce(
      refused("CREDITS_EXCEEDED", "Credits exceeded")
    );
    renderControl();

    clickRefresh();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Out of Onchain credits")
      )
    );
    expect(screen.queryByText("Refresh what fits")).toBeNull();
  });
});
