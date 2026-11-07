import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { monthName, SmsUsageCard } from "./sms-usage-card";
import { connectionsService } from "@/features/integrations/connections.service";

vi.mock("@/features/integrations/connections.service", () => ({
  connectionsService: { smsManagedUsage: vi.fn() },
}));
vi.mock("@/features/settings/components/account/use-account-org", () => ({
  useAccountOrg: () => ({ organizationId: "org_1" }),
}));

const usage = vi.mocked(connectionsService.smsManagedUsage);

const renderCard = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: 0 } } })}
    >
      <SmsUsageCard />
    </QueryClientProvider>
  );

describe("SmsUsageCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("names months", () => {
    expect(monthName("2026-10")).toBe("October 2026");
  });

  it("is hidden for a workspace on its own Twilio account", async () => {
    usage.mockResolvedValue({
      managed: false,
      currentPeriod: null,
      history: [],
    });
    const { container } = renderCard();
    await waitFor(() => expect(usage).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows this month's estimate, counts and past charges", async () => {
    usage.mockResolvedValue({
      managed: true,
      currentPeriod: {
        period: "2026-11",
        estimatedUsd: 12.4,
        items: [{ description: "SMS Messages", count: "1200" }],
      },
      history: [
        {
          period: "2026-10",
          amountUsd: 31.2,
          status: "INVOICED",
          dueInvoiceId: "d1",
        },
        {
          period: "2026-09",
          amountUsd: 0.4,
          status: "CARRIED",
          dueInvoiceId: null,
        },
      ],
    });
    renderCard();
    expect(await screen.findByText("$12.40")).toBeInTheDocument();
    expect(screen.getByText("November 2026 so far")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.getByText("Invoiced")).toBeInTheDocument();
    expect(screen.getByText("Added to next invoice")).toBeInTheDocument();
  });
});
