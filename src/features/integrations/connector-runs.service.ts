"use client";

import { integration, request } from "./connections.service";
import type { IterableJobStatus } from "./contracts/connections";
import type { ConnectorRunStatus, ExportJob } from "./contracts/runs";
import { toIterableJob, toIterableStatus } from "./utils/normalize-connections";
import { toRunStatus } from "./utils/runs";
import type { ImportConsentDeclaration } from "@/features/audience/contracts/consent";

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
    opts: { restart?: boolean; consent?: ImportConsentDeclaration } = {},
    orgId?: string
  ): Promise<ConnectorRunStatus> {
    const data = await request(
      {
        method: "POST",
        url: run(connector),
        // `consent`: the opt-in declaration a migration must carry (backend
        // 2026-11-22). Sent only when given, so sources (Formo, …) and the
        // older run DTO see the body they always did.
        data: {
          ...(opts.restart ? { restart: true } : {}),
          ...(opts.consent ? { consent: opts.consent } : {}),
        },
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
  async startExport(
    connector: string,
    consent?: ImportConsentDeclaration,
    orgId?: string
  ): Promise<ExportJob> {
    const data = await request(
      {
        method: "POST",
        url: integration(`${connector}/migrate`),
        ...(consent ? { data: { consent } } : {}),
      },
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
