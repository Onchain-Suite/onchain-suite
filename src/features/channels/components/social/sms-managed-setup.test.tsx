import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SmsManagedSetup } from "./sms-managed-setup";
import { connectionsService } from "@/features/integrations/connections.service";

vi.mock("@/features/integrations/connections.service", () => ({
  connectionsService: {
    smsManagedStatus: vi.fn(),
    smsManagedNumbers: vi.fn(),
    smsManagedSetUp: vi.fn(),
  },
}));
const connection = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/features/integrations/hooks/use-connections", () => ({
  CONNECTIONS_PREFIX: ["organization", "connections"],
  useConnection: () => ({
    organizationId: "org_1",
    canManage: true,
    connection: connection.current,
  }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const status = vi.mocked(connectionsService.smsManagedStatus);
const search = vi.mocked(connectionsService.smsManagedNumbers);
const setUp = vi.mocked(connectionsService.smsManagedSetUp);

const NUMBER = {
  phoneNumber: "+14155550100",
  friendlyName: "(415) 555-0100",
  locality: "San Francisco",
  region: "CA",
  isoCountry: "US",
  sms: true,
  mms: true,
};

const renderCard = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: 0 }, mutations: { retry: 0 } },
        })
      }
    >
      <SmsManagedSetup />
    </QueryClientProvider>
  );

describe("SmsManagedSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connection.current = null;
    status.mockResolvedValue({
      enabled: true,
      managed: false,
      connected: false,
    });
  });

  it("stays hidden when the server cannot set SMS up", async () => {
    status.mockResolvedValue({
      enabled: false,
      managed: false,
      connected: false,
    });
    const { container } = renderCard();
    await waitFor(() => expect(status).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("stays hidden once SMS is connected", async () => {
    connection.current = { connector: "sms" };
    const { container } = renderCard();
    await waitFor(() => expect(status).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("searches, picks a number and sets it up", async () => {
    search.mockResolvedValue([NUMBER]);
    setUp.mockResolvedValue({
      phoneNumber: NUMBER.phoneNumber,
      reused: false,
      verified: true,
    });
    renderCard();
    fireEvent.click(
      await screen.findByRole("button", { name: "Get a number" })
    );
    fireEvent.change(screen.getByLabelText("Area code"), {
      target: { value: "415" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search numbers" }));
    await waitFor(() =>
      expect(search).toHaveBeenCalledWith(
        { country: "US", type: "local", areaCode: "415" },
        "org_1"
      )
    );
    fireEvent.click(await screen.findByRole("radio", { name: /555-0100/ }));
    fireEvent.click(
      screen.getByRole("button", { name: `Get ${NUMBER.phoneNumber}` })
    );
    await waitFor(() =>
      expect(setUp).toHaveBeenCalledWith(NUMBER.phoneNumber, "org_1")
    );
  });

  it("cannot buy until a number is picked", async () => {
    search.mockResolvedValue([NUMBER]);
    renderCard();
    fireEvent.click(
      await screen.findByRole("button", { name: "Get a number" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Search numbers" }));
    await screen.findByRole("radio", { name: /555-0100/ });
    expect(screen.getByRole("button", { name: "Get number" })).toBeDisabled();
  });

  it("drops search results when a filter changes, so an old list can't be bought from", async () => {
    search.mockResolvedValue([NUMBER]);
    renderCard();
    fireEvent.click(
      await screen.findByRole("button", { name: "Get a number" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Search numbers" }));
    fireEvent.click(await screen.findByRole("radio", { name: /555-0100/ }));
    fireEvent.change(screen.getByLabelText("Area code"), {
      target: { value: "212" },
    });
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByRole("button", { name: "Get number" })).toBeDisabled();
  });
});
