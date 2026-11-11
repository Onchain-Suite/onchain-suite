"use client";

import { integration, request } from "./connections.service";
import type { IterableJobStatus } from "./contracts/connections";
import type { ConnectorRunStatus, ExportJob } from "./contracts/runs";
import { toIterableJob, toIterableStatus } from "./utils/normalize-connections";
import { toRunStatus } from "./utils/runs";

export type { ConnectorRunStatus, ExportJob } from "./contracts/runs";

/**
 * Background runs for connectors. The work happens on the server's worker, so
 * every call here answers quickly and nothing depends on this tab staying
 * open. OWNER/ADMIN only, like the rest of connections.
 */
const run = (connector: string, tail = "") =>
  integration(`runs/${encodeURIComponent(connector)}${tail}`);

export const connectorRunsService = {
  /** Start a run, or continue one that stopped or failed part-way. */
  async start(
    connector: string,
    opts: { restart?: boolean } = {},
    orgId?: string
  ): Promise<ConnectorRunStatus> {
    const data = await request(
      {
        method: "POST",
        url: run(connector),
        data: opts.restart ? { restart: true } : {},
      },
      orgId
    );
    return toRunStatus(data, connector);
  },

  async status(
    connector: string,
    signal?: AbortSignal,
    orgId?: string
  ): Promise<ConnectorRunStatus> {
    const data = await request(
      { method: "GET", url: run(connector), signal },
      orgId
    );
    return toRunStatus(data, connector);
  },

  /** Ask a run to stop after the batch it is on. It keeps its place. */
  async stop(connector: string, orgId?: string): Promise<ConnectorRunStatus> {
    const data = await request(
      { method: "POST", url: run(connector, "/stop") },
      orgId
    );
    return toRunStatus(data, connector);
  },

  /** Start an export migration (Braze, Customer.io, Iterable). */
  async startExport(connector: string, orgId?: string): Promise<ExportJob> {
    const data = await request(
      { method: "POST", url: integration(`${connector}/migrate`) },
      orgId
    );
    return toIterableJob(data);
  },

  async exportStatus(
    connector: string,
    jobId: string,
    signal?: AbortSignal,
    orgId?: string
  ): Promise<IterableJobStatus> {
    const data = await request(
      {
        method: "GET",
        url: integration(`${connector}/migrate/${encodeURIComponent(jobId)}`),
        signal,
      },
      orgId
    );
    return toIterableStatus(data);
  },
};
