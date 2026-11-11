import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EventsTab } from "./events-tab";

vi.mock("@/features/settings/components/account/use-account-org", () => ({
  useAccountOrg: () => ({ organizationId: "org_1" }),
}));
vi.mock("@/features/settings/project-settings.service", () => ({
  projectSettingsService: {
    getProjectSettings: vi.fn(async () => ({
      contractAddresses: [
        {
          address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
          chain: "base-mainnet",
          label: "Acme Packs",
        },
        {
          address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
          chain: "eth-mainnet",
        },
      ],
      treasuryWallets: [],
      teamWallets: [],
    })),
    getSupportedChains: vi.fn(async () => [
      { slug: "base-mainnet", label: "Base" },
      { slug: "eth-mainnet", label: "Ethereum" },
    ]),
  },
}));
vi.mock("../connections.service", () => ({
  connectionsService: {
    eventsCatalog: vi.fn(async () => ({
      windowDays: 30,
      events: [
        { event: "signed_up", count: 1200 },
        { event: "deposit_completed", count: 34 },
      ],
    })),
  },
}));
vi.mock("@/features/audience/components/import-contracts-dialog", () => ({
  ImportContractsDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Add a contract</div> : null,
}));

const renderTab = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <EventsTab />
    </QueryClientProvider>
  );

describe("EventsTab", () => {
  it("says how current each source is before any list is opened", async () => {
    renderTab();

    expect(await screen.findByText("2 indexed")).toBeInTheDocument();
    // The catalog is read up front, so this is right without opening its view.
    expect(await screen.findByText("2 events arriving")).toBeInTheDocument();
    expect(screen.getByText("1,234 in the last 30 days")).toBeInTheDocument();
  });

  it("opens on the contracts, with each chain by its name", async () => {
    renderTab();

    expect(await screen.findByText("Acme Packs")).toBeInTheDocument();
    expect(await screen.findByText("Base")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Indexed contracts · 2" })
    ).toHaveAttribute("aria-checked", "true");
  });

  it("switches to product events in the same space", async () => {
    renderTab();

    fireEvent.click(
      await screen.findByRole("radio", { name: "Product events · 2" })
    );

    expect(screen.getByText("signed_up")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.queryByText("Acme Packs")).toBeNull();
  });

  it("adds a contract from the contracts view", async () => {
    renderTab();

    fireEvent.click(
      await screen.findByRole("button", { name: /Add contract/ })
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("Add a contract");
  });
});
