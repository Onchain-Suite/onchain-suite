"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { ChannelReadiness } from "../types/channel";
import { deriveChannelReadiness } from "../utils/readiness";
import { X_STATUS_KEY, xService } from "../x.service";
import { normalizeDomainStatus } from "@/features/settings/components/account/domain-status";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { inAppService } from "@/features/settings/inapp.service";
import { pushCredentialsService } from "@/features/settings/push-credentials.service";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";

/**
 * Derives the readiness of every sending channel from the real email / in-app /
 * push / X services (migration/channels.md step 1). The UI consumes this one
 * list instead of knowing how each channel's setup works. X reads as not
 * connected until its backend ships (step 3).
 */
export function useChannelReadiness(): {
  readiness: ChannelReadiness[];
  isLoading: boolean;
} {
  const { organizationId } = useAccountOrg();
  const enabled = Boolean(organizationId);
  const orgId = organizationId ?? undefined;

  const domainsQuery = useQuery({
    queryKey: ["channels", "readiness", "domains", organizationId],
    enabled,
    retry: false,
    queryFn: () => senderIdentitiesService.listDomains(orgId),
  });

  // Shares the cache with the Settings in-app card (same key + read).
  const inappQuery = useQuery({
    queryKey: ["integrations", "inapp", "status", organizationId],
    enabled,
    retry: false,
    queryFn: () => inAppService.getStatus(orgId),
  });

  const pushQuery = useQuery({
    queryKey: ["channels", "readiness", "push-credentials", organizationId],
    enabled,
    retry: false,
    queryFn: () => pushCredentialsService.list(orgId),
  });

  // Shares the cache with the X panel (same key + read). Reads as not connected
  // until the X backend ships.
  const xQuery = useQuery({
    queryKey: X_STATUS_KEY(organizationId),
    enabled,
    retry: false,
    queryFn: () => xService.getStatus(orgId),
  });

  const readiness = useMemo(() => {
    const domainStatuses = (domainsQuery.data ?? []).map((d) =>
      normalizeDomainStatus(d.status)
    );
    const status = inappQuery.data;
    const hasKey =
      Boolean(status?.publishableKeys.production) ||
      Boolean(status?.publishableKeys.test);
    const creds = pushQuery.data ?? [];
    const x = xQuery.data;

    return deriveChannelReadiness({
      domainStatuses,
      webPush: { hasKey, sessionCount: status?.sessionCount ?? null },
      mobilePush: {
        hasCredential: creds.length > 0,
        hasVerified: creds.some((c) => c.verified),
      },
      x: {
        connected: x?.status === "connected",
        pending: x?.status === "pending",
      },
    });
  }, [domainsQuery.data, inappQuery.data, pushQuery.data, xQuery.data]);

  return {
    readiness,
    isLoading:
      domainsQuery.isLoading ||
      inappQuery.isLoading ||
      pushQuery.isLoading ||
      xQuery.isLoading,
  };
}
