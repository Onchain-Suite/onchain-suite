import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toSendingApproval } from "../../sending-approval.service";
import { SendingApprovalAppBanner } from "./sending-approval-app-banner";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));
const get = vi.fn();
vi.mock("../../sending-approval.service", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  sendingApprovalService: { get: () => get(), update: vi.fn() },
}));
vi.mock("@/lib/utils", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getSelectedOrganizationId: () => "org_1",
}));

const approval = (over: Record<string, unknown>) =>
  toSendingApproval({
    status: "pending_review",
    requiresApproval: true,
    grandfathered: false,
    limits: { dailyMarketingCap: 500, sentToday: 3 },
    profile: {},
    missing: [],
    review: {},
    ...over,
  });

const renderIt = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SendingApprovalAppBanner />
    </QueryClientProvider>
  );

describe("SendingApprovalAppBanner", () => {
  beforeEach(() => {
    get.mockReset();
    window.sessionStorage.clear();
  });

  it("shows while pending and can be dismissed for the session", async () => {
    get.mockResolvedValue(approval({}));
    renderIt();
    expect(
      await screen.findByText(/up to 500 marketing emails a day/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Complete your sending profile" })
    ).toHaveAttribute("href", "/settings?tab=sending");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/marketing emails a day/)).toBeNull();
    expect(
      window.sessionStorage.getItem("onchain.sending-approval-banner.dismissed")
    ).toBe("1");
  });

  it("stays hidden once approved or when grandfathered", async () => {
    get.mockResolvedValue(approval({ status: "approved" }));
    renderIt();
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.queryByRole("status")).toBeNull();
  });
});
