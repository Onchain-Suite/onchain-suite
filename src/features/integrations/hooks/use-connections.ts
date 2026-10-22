"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { connectionsService } from "../connections.service";
import type {
  ConnectionCredentials,
  ConnectionSummary,
} from "../contracts/connections";
import { findConnection } from "../utils/connections";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

/** Prefix shared with the Settings Telegram/Discord cards, so saving here
 *  refreshes them too (and vice versa). */
export const CONNECTIONS_PREFIX = ["organization", "connections"] as const;

export const connectionsKey = (orgId: string | null) =>
  [...CONNECTIONS_PREFIX, "all", orgId] as const;

/**
 * Every saved connection for the workspace, read once and shared by the
 * Sources, Migrate and Channels tabs. Connections are OWNER/ADMIN only, so for
 * other roles this does not fetch and `canManage` is false.
 */
export function useConnections() {
  const { organizationId } = useAccountOrg();
  const { role, loading: roleLoading } = useMyOrgRole();
  const canManage = role === "OWNER" || role === "ADMIN";

  const query = useQuery({
    queryKey: connectionsKey(organizationId),
    enabled: canManage && Boolean(organizationId),
    retry: false,
    staleTime: 60_000,
    queryFn: () =>
      connectionsService.list(undefined, organizationId ?? undefined),
  });

  return {
    organizationId,
    canManage,
    roleLoading,
    connections: query.data,
    isLoading: roleLoading || (canManage && query.isLoading),
    error: query.error,
  };
}

/** One connector's saved connection, from the shared list. */
export function useConnection(connector: string | null) {
  const all = useConnections();
  const connection = useMemo<ConnectionSummary | null>(
    () => (connector ? findConnection(all.connections, connector) : null),
    [all.connections, connector]
  );
  return { ...all, connection };
}

export function useConnectionMutations() {
  const { organizationId } = useAccountOrg();
  const qc = useQueryClient();
  const key = connectionsKey(organizationId);

  const refresh = () => qc.invalidateQueries({ queryKey: CONNECTIONS_PREFIX });

  const save = useMutation({
    mutationFn: (v: {
      connector: string;
      credentials: ConnectionCredentials;
    }) =>
      connectionsService.save(
        v.connector,
        v.credentials,
        organizationId ?? undefined
      ),
    onSuccess: (conn) => {
      // Write the answer straight in so the status flips without a refetch.
      qc.setQueryData<ConnectionSummary[]>(key, (prev) => [
        ...(prev ?? []).filter((c) => c.connector !== conn.connector),
        conn,
      ]);
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (connector: string) =>
      connectionsService.remove(connector, organizationId ?? undefined),
    onMutate: async (connector) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ConnectionSummary[]>(key);
      qc.setQueryData<ConnectionSummary[]>(key, (list) =>
        (list ?? []).filter((c) => c.connector !== connector)
      );
      return { prev };
    },
    onError: (_e, _c, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: refresh,
  });

  return { save, remove };
}
