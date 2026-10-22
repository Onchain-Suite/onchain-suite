"use client";

import { useQuery } from "@tanstack/react-query";

import {
  deriveWorkspaceMode,
  type WorkspaceMode,
  type WorkspaceSignals,
} from "../utils/workspace";
import { audienceService } from "@/features/audience/audience.service";
import { useOrganizationId } from "@/features/dashboard/hooks/use-setup-steps";
import { projectSettingsService } from "@/features/settings/project-settings.service";

export interface UseWorkspaceModeResult {
  /** Derived mode. Defaults to "live" until the reads resolve (see `isLoading`). */
  mode: WorkspaceMode;
  /** True while org id is unsynced or either read is still in flight. */
  isLoading: boolean;
  /** The raw signals the mode was derived from, for callers that need detail. */
  signals: WorkspaceSignals;
}

/**
 * Derive the workspace mode ("empty" vs "live") from the account's real state.
 *
 * Reuses the same two reads the dashboard setup checklist already makes, so this
 * adds no new endpoints and no new query keys collide:
 * - project settings `contractAddresses` -> `hasTrackedContract`
 * - audience overview `total`             -> `contactCount`
 *
 * Both reads inherit the app's caching defaults, so mounting this alongside the
 * checklist is effectively free (React Query dedupes the shared keys).
 *
 * While the org is unsynced or a read is in flight we report `live` + `isLoading`
 * true, so a slow load never flashes the empty-state teaching UI at a user who
 * actually has data. Callers that gate teaching UI should wait out `isLoading`.
 */
export function useWorkspaceMode(): UseWorkspaceModeResult {
  const { organizationId, isSynced } = useOrganizationId();
  const orgId = organizationId ?? undefined;
  const enabled = Boolean(organizationId);

  const contractQuery = useQuery({
    queryKey: ["get-started", "project-settings", organizationId],
    enabled,
    queryFn: async () => {
      const settings = await projectSettingsService.getProjectSettings(orgId);
      return settings.contractAddresses.length > 0;
    },
  });

  const audienceQuery = useQuery({
    queryKey: ["get-started", "audience-overview", organizationId],
    enabled,
    queryFn: async () => {
      const overview = await audienceService.getOverview(orgId);
      return (overview.total ?? 0) > 0;
    },
  });

  const signals: WorkspaceSignals = {
    hasTrackedContract: contractQuery.data === true,
    contactCount: audienceQuery.data === true ? 1 : 0,
  };

  const isLoading =
    !isSynced || !enabled || contractQuery.isPending || audienceQuery.isPending;

  // While loading, don't claim "empty": a slow read must not flash teaching UI
  // at a populated account. Only commit to the derived mode once both resolve.
  const mode: WorkspaceMode = isLoading ? "live" : deriveWorkspaceMode(signals);

  return { mode, isLoading, signals };
}
