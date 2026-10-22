"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { getSelectedOrganizationId } from "@/lib/utils";

import { SETUP_STEPS, type SetupStepDef } from "../data/setup-steps";
import { hasSynced, hasVerifiedDomain } from "../utils/setup";
import { dashboardsApi } from "@/features/analytics/dashboards.service";
import { audienceService } from "@/features/audience/audience.service";
import {
  mobilePushStatus,
  webPushStatus,
} from "@/features/channels/utils/readiness";
import { inAppService } from "@/features/settings/inapp.service";
import { projectSettingsService } from "@/features/settings/project-settings.service";
import { pushCredentialsService } from "@/features/settings/push-credentials.service";
import {
  type DomainAuthMap,
  type SenderDomainRecord,
  senderIdentitiesService,
} from "@/features/settings/sender-identities.service";

/**
 * Resolves the active organization the same way the settings views do:
 * selection cookie first (kept in sync via `onchain:org-changed`), then the
 * session's active organization. `isSynced` is false until the cookie is read.
 */
export function useOrganizationId() {
  const { data: session } = authClient.useSession();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null | undefined>(
    undefined
  );

  useEffect(() => {
    const sync = () => setSelectedOrgId(getSelectedOrganizationId());
    sync();
    window.addEventListener("onchain:org-changed", sync);
    return () => window.removeEventListener("onchain:org-changed", sync);
  }, []);

  const organizationId = useMemo(() => {
    const selected = selectedOrgId?.trim();
    if (selected) return selected;
    const active = session?.session?.activeOrganizationId;
    return typeof active === "string" && active.trim().length > 0
      ? active.trim()
      : null;
  }, [selectedOrgId, session?.session?.activeOrganizationId]);

  return { organizationId, isSynced: selectedOrgId !== undefined };
}

/**
 * How long the checklist may wait for its reads. Six independent requests
 * fanned into one boolean means any one that stalls would hold the panel; past
 * this point an unconfirmed step simply reads as not done (it is advisory).
 */
export const SETUP_DEADLINE_MS = 4000;

function useElapsed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return elapsed;
}

/** Query key for the contract step, invalidated after indexing from the panel. */
export const setupContractKey = (orgId: string | null) =>
  ["get-started", "project-settings", orgId] as const;

/** Whether each step is done, from state the product already keeps. */
export function useSetupCompletion(organizationId: string | null) {
  const orgId = organizationId ?? undefined;
  const enabled = Boolean(organizationId);

  const contacts = useQuery({
    queryKey: ["get-started", "audience-overview", organizationId],
    enabled,
    queryFn: async () =>
      ((await audienceService.getOverview(orgId)).total ?? 0) > 0,
  });

  const domain = useQuery({
    queryKey: ["get-started", "domains", organizationId],
    enabled,
    queryFn: async () => {
      const [domains, authMap] = await Promise.all([
        senderIdentitiesService
          .listDomains(orgId)
          .catch((): SenderDomainRecord[] => []),
        senderIdentitiesService
          .getDomainAuthentication(orgId)
          .catch((): DomainAuthMap => new Map()),
      ]);
      return hasVerifiedDomain(domains, authMap);
    },
  });

  const push = useQuery({
    queryKey: ["get-started", "push", organizationId],
    enabled,
    queryFn: async () => {
      const [status, creds] = await Promise.all([
        inAppService.getStatus(orgId).catch(() => null),
        pushCredentialsService.list(orgId).catch(() => []),
      ]);
      const hasKey =
        Boolean(status?.publishableKeys.production) ||
        Boolean(status?.publishableKeys.test);
      return (
        webPushStatus({
          hasKey,
          sessionCount: status?.sessionCount ?? null,
        }) === "connected" ||
        mobilePushStatus({
          hasCredential: creds.length > 0,
          hasVerified: creds.some((c) => c.verified),
        }) === "connected"
      );
    },
  });

  const contract = useQuery({
    queryKey: setupContractKey(organizationId),
    enabled,
    queryFn: async () =>
      (await projectSettingsService.getProjectSettings(orgId)).contractAddresses
        .length > 0,
  });

  const sync = useQuery({
    queryKey: ["get-started", "wallet-sync", organizationId],
    enabled,
    queryFn: async () =>
      hasSynced(
        await audienceService.getSyncStatus(undefined, orgId).catch(() => null)
      ),
  });

  // Under the analytics dashboards key, so publishing or revoking refreshes it.
  const dashboard = useQuery({
    queryKey: ["analytics", "dashboards", organizationId ?? "", "all-links"],
    enabled,
    queryFn: async () => (await dashboardsApi.allLinks()).length > 0,
  });

  const queries = [contacts, domain, push, contract, sync, dashboard];
  const pastDeadline = useElapsed(SETUP_DEADLINE_MS);
  const isLoading =
    enabled && !pastDeadline && queries.some((q) => q.isPending);

  const completion = useMemo<Record<string, boolean>>(
    () => ({
      contacts: contacts.data === true,
      domain: domain.data === true,
      push: push.data === true,
      contract: contract.data === true,
      sync: sync.data === true,
      dashboard: dashboard.data === true,
    }),
    [
      contacts.data,
      domain.data,
      push.data,
      contract.data,
      sync.data,
      dashboard.data,
    ]
  );

  return { completion, isLoading };
}

export interface SetupStep extends SetupStepDef {
  done: boolean;
}

/** The six checklist steps with live `done` flags, for the sidebar panel. */
export function useSetupSteps(): {
  steps: SetupStep[];
  isLoading: boolean;
  organizationId: string | null;
} {
  const { organizationId, isSynced } = useOrganizationId();
  const { completion, isLoading } = useSetupCompletion(organizationId);
  const steps = useMemo(
    () => SETUP_STEPS.map((s) => ({ ...s, done: completion[s.id] === true })),
    [completion]
  );
  return { steps, isLoading: !isSynced || isLoading, organizationId };
}
