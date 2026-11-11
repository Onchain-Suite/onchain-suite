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
  //
  // A status read already in flight was asked BEFORE the server acted, so it
  // describes the past. Left alone it would land after this write, put the old
  // state back and (the old state not being live) switch polling off. Drop it
  // on the way in and again on the way out, for a poll that began in between.
  const settle = useCallback(
    () => qc.cancelQueries({ queryKey: key }),
    [qc, key]
  );
  const write = useCallback(
    async (run: ConnectorRunStatus) => {
      await settle();
      qc.setQueryData(key, run);
    },
    [qc, key, settle]
  );

  const start = useMutation({
    mutationFn: (opts: { restart?: boolean } = {}) =>
      connectorRunsService.start(connector, opts, organizationId ?? undefined),
    onMutate: settle,
    onSuccess: write,
  });

  const stop = useMutation({
    mutationFn: () =>
      connectorRunsService.stop(connector, organizationId ?? undefined),
    onMutate: settle,
    onSuccess: write,
  });

  const notDeployed = (e: unknown) =>
    e instanceof ConnectionsError && e.code === "NOT_DEPLOYED";

  return {
    run: query.data ?? null,
    isLoading: query.isLoading,
    unavailable: notDeployed(query.error) || notDeployed(start.error),
    /**
     * The status could not be read at all, so nothing is known about a run:
     * one may well be going. Not the same as idle, and callers must not offer
     * Start as though it were. A poll that fails mid-run keeps the last answer
     * and does not set this.
     */
    statusError:
      query.isError && !query.data && !notDeployed(query.error)
        ? query.error.message
        : null,
    retryStatus: query.refetch,
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
