"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { ConnectionsError } from "../connections.service";
import { connectorRunsService } from "../connector-runs.service";
import type { ConnectorRunStatus } from "../contracts/runs";
import { isRunLive } from "../utils/runs";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

/** While a run is live. One cheap read; the server does not throttle it. */
const POLL_MS = 3_000;

export const connectorRunKey = (orgId: string | null, connector: string) =>
  ["organization", "integrations", "run", orgId, connector] as const;

/**
 * A connector's background run: what the server says it is doing, and the
 * three things a person can do about it.
 *
 * The run lives on the server, so this only reads and nudges. Opening the
 * dialog again (or on another device) shows a run that is still going; polling
 * stops by itself once the run is no longer live, and when this unmounts.
 *
 * `unavailable` is true when the server has no runs route yet (a backend that
 * predates it). Callers fall back to the older in-browser loop then.
 */
export function useConnectorRun(connector: string) {
  const { organizationId } = useAccountOrg();
  const qc = useQueryClient();
  const key = useMemo(
    () => connectorRunKey(organizationId, connector),
    [organizationId, connector]
  );

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(organizationId),
    retry: false,
    staleTime: 0,
    queryFn: ({ signal }) =>
      connectorRunsService.status(
        connector,
        signal,
        organizationId ?? undefined
      ),
    refetchInterval: (q) => (isRunLive(q.state.data) ? POLL_MS : false),
  });

  // The server's answer to start or stop IS the new status: write it straight
  // in so the panel changes at once, without waiting for the next poll.
  const write = useCallback(
    (run: ConnectorRunStatus) => qc.setQueryData(key, run),
    [qc, key]
  );

  const start = useMutation({
    mutationFn: (opts: { restart?: boolean } = {}) =>
      connectorRunsService.start(connector, opts, organizationId ?? undefined),
    onSuccess: write,
  });

  const stop = useMutation({
    mutationFn: () =>
      connectorRunsService.stop(connector, organizationId ?? undefined),
    onSuccess: write,
  });

  const notDeployed = (e: unknown) =>
    e instanceof ConnectionsError && e.code === "NOT_DEPLOYED";

  return {
    run: query.data ?? null,
    isLoading: query.isLoading,
    unavailable: notDeployed(query.error) || notDeployed(start.error),
    /** A failure to start or stop; a failed RUN reports through `run.error`. */
    actionError:
      (start.error && !notDeployed(start.error) ? start.error.message : null) ??
      (stop.error ? stop.error.message : null),
    isStarting: start.isPending,
    isStopping: stop.isPending || query.data?.stopping === true,
    start: start.mutate,
    stop: stop.mutate,
  };
}
