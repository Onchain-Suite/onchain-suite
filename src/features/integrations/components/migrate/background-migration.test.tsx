import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectionsError } from "../../connections.service";
import { connectorRunsService } from "../../connector-runs.service";
import type { ConnectorRunStatus } from "../../contracts/runs";
import { connectorRunKey } from "../../hooks/use-connector-run";
import type { ConnectorDef } from "../../types/connectors";
import { toRunStatus } from "../../utils/runs";
import { BackgroundMigration } from "./background-migration";

vi.mock("../../connector-runs.service", () => ({
  connectorRunsService: { status: vi.fn(), start: vi.fn(), stop: vi.fn() },
}));
vi.mock("@/features/settings/components/account/use-account-org", () => ({
  useAccountOrg: () => ({ organizationId: "org_1" }),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const status = vi.mocked(connectorRunsService.status);
const start = vi.mocked(connectorRunsService.start);
const stop = vi.mocked(connectorRunsService.stop);

const def: ConnectorDef = {
  id: "hubspot",
  label: "HubSpot",
  connect: "oauth",
  fields: [],
  action: "migrate",
};

const run = (over: Partial<ConnectorRunStatus> = {}): ConnectorRunStatus => ({
  ...toRunStatus({}, "hubspot"),
  ...over,
});

const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderRun(agreed = true, client = newClient()) {
  render(
    <QueryClientProvider client={client}>
      <BackgroundMigration
        def={def}
        consent={<p>I may move these contacts.</p>}
        agreed={agreed}
        fallback={<p>In-browser migration</p>}
      />
    </QueryClientProvider>
  );
}

describe("BackgroundMigration", () => {
  beforeEach(() => {
    status.mockReset();
    start.mockReset();
    stop.mockReset();
  });

  it("starts a run on the server once consent is given", async () => {
    status.mockResolvedValue(run());
    start.mockResolvedValue(run({ state: "queued" }));
    renderRun();

    fireEvent.click(
      await screen.findByRole("button", { name: /Start migration/ })
    );

    await waitFor(() =>
      expect(start).toHaveBeenCalledWith("hubspot", {}, "org_1")
    );
    // It is the server's run now: closing this does not stop it.
    expect(await screen.findByText(/it carries on/)).toBeInTheDocument();
  });

  it("will not start without consent", async () => {
    status.mockResolvedValue(run());
    renderRun(false);
    expect(
      await screen.findByRole("button", { name: /Start migration/ })
    ).toBeDisabled();
  });

  it("shows a run that is already going, with the server's own numbers", async () => {
    status.mockResolvedValue(
      run({
        state: "running",
        totals: {
          scanned: 12_500,
          created: 11_980,
          held: { unsubscribed: 410, invalid: 110 },
        },
      })
    );
    renderRun();

    expect(await screen.findByText("12,500")).toBeInTheDocument();
    expect(screen.getByText("11,980")).toBeInTheDocument();
    expect(screen.getByText("520")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Start migration/ })
    ).toBeNull();

    stop.mockResolvedValue(run({ state: "running", stopping: true }));
    fireEvent.click(screen.getByRole("button", { name: /Stop/ }));
    await waitFor(() => expect(stop).toHaveBeenCalledWith("hubspot", "org_1"));
    expect(
      await screen.findByText("Stopping after this batch…")
    ).toBeInTheDocument();
  });

  it("offers to continue a run that kept its place, or to start over", async () => {
    status.mockResolvedValue(
      run({
        state: "failed",
        resumable: true,
        error: "HubSpot contacts fetch failed (HTTP 429).",
        totals: { scanned: 20_000 },
      })
    );
    start.mockResolvedValue(run({ state: "queued" }));
    renderRun();

    expect(
      await screen.findByText("HubSpot contacts fetch failed (HTTP 429).")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(start).toHaveBeenCalledWith("hubspot", {}, "org_1")
    );
  });

  it("starts over when asked", async () => {
    status.mockResolvedValue(run({ state: "stopped", resumable: true }));
    start.mockResolvedValue(run({ state: "queued" }));
    renderRun();

    fireEvent.click(
      await screen.findByRole("button", { name: "Start over instead" })
    );
    await waitFor(() =>
      expect(start).toHaveBeenCalledWith("hubspot", { restart: true }, "org_1")
    );
  });

  it("says where the contacts went when a run is done", async () => {
    status.mockResolvedValue(
      run({
        state: "completed",
        totals: { scanned: 50_000, listName: "Imported from HubSpot" },
      })
    );
    renderRun();

    expect(
      await screen.findByText(/in the list "Imported from HubSpot"/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run again/ })).toBeEnabled();
  });

  it("falls back to the in-browser loop on a server with no runs yet", async () => {
    status.mockRejectedValue(
      new ConnectionsError("Not here yet.", "NOT_DEPLOYED", 404)
    );
    renderRun();
    expect(await screen.findByText("In-browser migration")).toBeInTheDocument();
  });

  it("does not call a run idle when its status could not be read", async () => {
    status.mockRejectedValueOnce(
      new ConnectionsError("The server took too long.", "TIMEOUT", null)
    );
    renderRun();

    expect(
      await screen.findByText("Couldn't check whether a run is going.")
    ).toBeInTheDocument();
    expect(screen.getByText("The server took too long.")).toBeInTheDocument();
    // A run may be going: Start would be a guess.
    expect(
      screen.queryByRole("button", { name: /Start migration/ })
    ).toBeNull();

    status.mockResolvedValue(
      run({ state: "running", totals: { scanned: 9_000 } })
    );
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByText("9,000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stop/ })).toBeInTheDocument();
  });

  it("keeps the run it just started when an older status read lands late", async () => {
    // Reopened: the last answer (idle) shows while a fresh read is in flight.
    const client = newClient();
    client.setQueryData(connectorRunKey("org_1", "hubspot"), run());
    let landLate: (r: ConnectorRunStatus) => void = () => undefined;
    status.mockReturnValueOnce(
      new Promise<ConnectorRunStatus>((resolve) => {
        landLate = resolve;
      })
    );
    status.mockResolvedValue(run({ state: "running" }));
    start.mockResolvedValue(run({ state: "queued" }));
    renderRun(true, client);

    fireEvent.click(
      await screen.findByRole("button", { name: /Start migration/ })
    );
    expect(await screen.findByText(/it carries on/)).toBeInTheDocument();

    // The read that was asked before the run existed answers "idle".
    landLate(run());
    await new Promise((r) => setTimeout(r, 30));

    expect(screen.getByText(/it carries on/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Start migration/ })
    ).toBeNull();
    expect(
      client.getQueryData<ConnectorRunStatus>(
        connectorRunKey("org_1", "hubspot")
      )?.state
    ).toBe("queued");
  });
});
