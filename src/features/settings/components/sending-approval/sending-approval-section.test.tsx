import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SendingApprovalSection } from "./sending-approval-section";

const get = vi.fn();
vi.mock("../../sending-approval.service", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  sendingApprovalService: { get: () => get(), update: vi.fn() },
}));
vi.mock("@/shared/hooks/client/use-my-org-role", () => ({
  useMyOrgRole: () => ({ role: "OWNER", loading: false }),
}));
vi.mock("@/lib/utils", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getSelectedOrganizationId: () => "org_1",
}));

const body = (over: Record<string, unknown>) => ({
  status: "pending_review",
  tier: "standard",
  requiresApproval: true,
  grandfathered: false,
  limits: { dailyMarketingCap: 500, sentToday: 12 },
  profile: {},
  missing: ["website", "sampleEmail"],
  review: { reviewedAt: null, reason: null },
  ...over,
});

const renderIt = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SendingApprovalSection />
    </QueryClientProvider>
  );

describe("SendingApprovalSection", () => {
  beforeEach(() => get.mockReset());

  it("shows the pending limit, what is missing and the form", async () => {
    const { toSendingApproval } =
      await import("../../sending-approval.service");
    get.mockResolvedValue(toSendingApproval(body({})));
    renderIt();
    expect(
      await screen.findByText(/send up to 500 marketing emails a day/)
    ).toBeInTheDocument();
    expect(screen.getByText(/12 of 500 sent today/)).toBeInTheDocument();
    expect(screen.getByText("Your website")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save and submit" })
    ).toBeInTheDocument();
  });

  it("is hidden for a grandfathered workspace", async () => {
    const { toSendingApproval } =
      await import("../../sending-approval.service");
    get.mockResolvedValue(toSendingApproval(body({ grandfathered: true })));
    const { container } = renderIt();
    await waitFor(() => expect(get).toHaveBeenCalled());
    await waitFor(() =>
      expect(container.querySelector(".animate-pulse")).toBeNull()
    );
    expect(container.querySelector("section")).toBeNull();
  });
});
