import type { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api-client";

import { ConnectionsError } from "./connections.service";
import { connectorRunsService } from "./connector-runs.service";

const requestSpy = vi.spyOn(apiClient, "request");

afterEach(() => {
  requestSpy.mockReset();
});

const running = {
  connector: "hubspot",
  state: "running",
  totals: { scanned: 5000, created: 4900 },
  slices: 1,
  resumable: false,
  incomplete: false,
  stopping: false,
  error: null,
  startedAt: "2026-11-11T10:00:00.000Z",
  finishedAt: null,
};

describe("connectorRunsService", () => {
  it("starts a run and unwraps the envelope", async () => {
    requestSpy.mockResolvedValueOnce({
      data: { success: true, data: running },
    } as never);
    const run = await connectorRunsService.start("hubspot", {}, "org_1");
    const cfg = requestSpy.mock.calls[0]?.[0];
    expect(cfg.method).toBe("POST");
    expect(cfg.url).toBe("/organization/integrations/runs/hubspot");
    expect(cfg.data).toEqual({});
    expect((cfg.headers as Record<string, string>)["x-org-id"]).toBe("org_1");
    expect(run).toMatchObject({ state: "running", slices: 1 });
  });

  it("asks to start over only when told to", async () => {
    requestSpy.mockResolvedValue({ data: { data: running } } as never);
    await connectorRunsService.start("kit", { restart: true });
    expect(requestSpy.mock.calls[0]?.[0].data).toEqual({ restart: true });
  });

  it("reads a run's status, and passes the abort signal", async () => {
    requestSpy.mockResolvedValueOnce({ data: { data: running } } as never);
    const ctrl = new AbortController();
    await connectorRunsService.status("googlesheets", ctrl.signal);
    const cfg = requestSpy.mock.calls[0]?.[0];
    expect(cfg.method).toBe("GET");
    expect(cfg.url).toBe("/organization/integrations/runs/googlesheets");
    expect(cfg.signal).toBe(ctrl.signal);
  });

  it("stops a run at its own route", async () => {
    requestSpy.mockResolvedValueOnce({
      data: { data: { ...running, stopping: true } },
    } as never);
    const run = await connectorRunsService.stop("hubspot");
    expect(requestSpy.mock.calls[0]?.[0].url).toBe(
      "/organization/integrations/runs/hubspot/stop"
    );
    expect(run.stopping).toBe(true);
  });

  it("says the server has no runs yet on a 404", async () => {
    requestSpy.mockRejectedValueOnce({
      isAxiosError: true,
      message: "Request failed",
      name: "AxiosError",
      response: { data: {}, status: 404 },
    } as unknown as AxiosError<unknown>);
    const err = await connectorRunsService.status("hubspot").catch((e) => e);
    expect(err).toBeInstanceOf(ConnectionsError);
    expect((err as ConnectionsError).code).toBe("NOT_DEPLOYED");
  });

  it("starts an export at the tool's own migrate route", async () => {
    requestSpy.mockResolvedValueOnce({
      data: {
        data: {
          jobId: "export-braze-o1",
          status: "queued",
          listName: "Imported from Braze",
        },
      },
    } as never);
    const job = await connectorRunsService.startExport("braze");
    expect(requestSpy.mock.calls[0]?.[0].url).toBe(
      "/organization/integrations/braze/migrate"
    );
    expect(job).toEqual({
      jobId: "export-braze-o1",
      status: "queued",
      listName: "Imported from Braze",
    });
  });

  it("URL-encodes the export job id", async () => {
    requestSpy.mockResolvedValueOnce({
      data: { data: { jobId: "a/b", state: "active" } },
    } as never);
    await connectorRunsService.exportStatus("customerio", "a/b");
    expect(requestSpy.mock.calls[0]?.[0].url).toBe(
      "/organization/integrations/customerio/migrate/a%2Fb"
    );
  });
});
