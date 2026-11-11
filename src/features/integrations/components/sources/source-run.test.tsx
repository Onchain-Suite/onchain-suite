import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectionsError } from "../../connections.service";
import { connectorRunsService } from "../../connector-runs.service";
import type { ConnectorRunStatus } from "../../contracts/runs";
import type { ConnectorDef } from "../../types/connectors";
import { toRunStatus } from "../../utils/runs";
import { SourceRun } from "./source-run";

vi.mock("../../connector-runs.service", () => ({
  connectorRunsService: { status: vi.fn(), start: vi.fn(), stop: vi.fn() },
}));
vi.mock("@/features/settings/components/account/use-account-org", () => ({
  useAccountOrg: () => ({ organizationId: "org_1" }),
}));

const status = vi.mocked(connectorRunsService.status);
const start = vi.mocked(connectorRunsService.start);

const dune: ConnectorDef = {
  id: "dune",
  label: "Dune",
  connect: "paste",
  fields: [],
  action: "data-sync",
};

const run = (over: Partial<ConnectorRunStatus> = {}): ConnectorRunStatus => ({
  ...toRunStatus({}, "dune"),
  ...over,
});

function renderRun() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <SourceRun
        def={dune}
        intro="Pull the rows in as contacts."
        fallback={<p>In-browser sync</p>}
      />
    </QueryClientProvider>
  );
}

describe("SourceRun", () => {
  beforeEach(() => {
    status.mockReset();
    start.mockReset();
  });

  it("starts a sync on the server", async () => {
    status.mockResolvedValue(run());
    start.mockResolvedValue(run({ state: "queued" }));
    renderRun();

    fireEvent.click(await screen.findByRole("button", { name: /Sync now/ }));

    await waitFor(() =>
      expect(start).toHaveBeenCalledWith("dune", {}, "org_1")
    );
    expect(await screen.findByText(/it carries on/)).toBeInTheDocument();
  });

  // Dune counts rows where an identity sync counts users.
  it("shows what was read under whichever name the source used", async () => {
    status.mockResolvedValue(
      run({ state: "completed", totals: { rows: 50_000, created: 49_100 } })
    );
    renderRun();

    expect(await screen.findByText("50,000")).toBeInTheDocument();
    expect(screen.getByText("49,100")).toBeInTheDocument();
    expect(screen.getByText("Up to date.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sync again/ })).toBeEnabled();
  });

  it("says so when the source held more back", async () => {
    status.mockResolvedValue(
      run({ state: "completed", incomplete: true, totals: { rows: 10 } })
    );
    renderRun();
    expect(
      await screen.findByText(/had more than it would hand over/)
    ).toBeInTheDocument();
  });

  it("falls back to the in-browser sync on a server with no runs yet", async () => {
    status.mockRejectedValue(
      new ConnectionsError("Not here yet.", "NOT_DEPLOYED", 404)
    );
    renderRun();
    expect(await screen.findByText("In-browser sync")).toBeInTheDocument();
  });
});
