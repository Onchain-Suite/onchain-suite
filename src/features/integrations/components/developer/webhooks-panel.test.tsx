import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WebhookEndpoint } from "../../contracts/developer";
import { DeveloperApiError } from "../../developer.service";
import { WebhooksPanel } from "./webhooks-panel";

const state = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  setStatus: vi.fn(),
  test: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../../hooks/use-webhooks", () => ({
  useWebhooks: () => state.query,
  useWebhookTopics: () => ({ data: [], isPending: false }),
  useWebhookActions: () => ({
    test: { mutate: state.test, isPending: false },
    setStatus: { mutate: state.setStatus, isPending: false },
    remove: { mutate: state.remove, isPending: false },
  }),
}));

// The dialogs bring React Query and the session with them; the panel's own
// behaviour is what is under test here.
vi.mock("./endpoint-dialog", () => ({ EndpointDialog: () => null }));

const hook = (over: Partial<WebhookEndpoint>): WebhookEndpoint => ({
  id: "wh_1",
  url: "https://api.one.xyz/hooks",
  events: ["contact.created"],
  status: "active",
  secretHint: "whsec_••••1111",
  lastDeliveryAt: "2026-11-10T10:00:00Z",
  lastDeliveryStatus: 200,
  failureCount: 0,
  createdAt: "2026-10-01T10:00:00Z",
  ...over,
});

const loaded = (data: WebhookEndpoint[]) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

describe("WebhooksPanel", () => {
  beforeEach(() => {
    state.setStatus.mockReset();
    state.test.mockReset();
    state.remove.mockReset();
  });

  it("opens the first endpoint until another is picked", () => {
    state.query = loaded([
      hook({}),
      hook({ id: "wh_2", url: "https://api.two.xyz/hooks", status: "paused" }),
    ]);
    render(<WebhooksPanel />);

    const detail = within(screen.getByRole("region", { name: "Endpoint" }));
    expect(detail.getByText("https://api.one.xyz/hooks")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /api\.two\.xyz/ }));
    expect(detail.getByText("https://api.two.xyz/hooks")).toBeInTheDocument();
    // A paused endpoint cannot be sent a test.
    expect(detail.getByRole("button", { name: "Send test" })).toBeDisabled();
  });

  it("pauses and resumes from the switch", () => {
    state.query = loaded([hook({})]);
    render(<WebhooksPanel />);

    fireEvent.click(screen.getByRole("switch", { name: "Active" }));
    expect(state.setStatus).toHaveBeenCalledWith({
      id: "wh_1",
      status: "paused",
    });
  });

  it("offers to resume an endpoint the backend marked failing", () => {
    state.query = loaded([hook({ status: "failing", failureCount: 8 })]);
    render(<WebhooksPanel />);

    expect(screen.getByText("Failing, 8 in a row")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume deliveries" }));
    expect(state.setStatus).toHaveBeenCalledWith({
      id: "wh_1",
      status: "active",
    });
  });

  it("asks before removing, and only removes on confirm", () => {
    state.query = loaded([hook({})]);
    render(<WebhooksPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Remove endpoint" }));
    expect(state.remove).not.toHaveBeenCalled();

    const dialog = within(screen.getByRole("dialog"));
    fireEvent.click(dialog.getByRole("button", { name: "Remove endpoint" }));
    expect(state.remove).toHaveBeenCalledWith("wh_1", expect.anything());
  });

  it("says what to do when there are no endpoints", () => {
    state.query = loaded([]);
    render(<WebhooksPanel />);

    expect(screen.getByText(/No endpoints yet/)).toBeInTheDocument();
    expect(
      screen.getByText(/Add an endpoint to see its deliveries/)
    ).toBeInTheDocument();
  });

  it("tells a member who cannot manage webhooks why, with nothing to retry", () => {
    state.query = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new DeveloperApiError("Forbidden", { status: 403 }),
      refetch: vi.fn(),
    };
    render(<WebhooksPanel />);

    expect(
      screen.getByText("Only workspace owners and admins can manage webhooks.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.getByRole("button", { name: /Add endpoint/ })).toBeDisabled();
  });
});
