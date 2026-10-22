"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { ChannelReadiness, SocialChannelId } from "../types/channel";
import { deriveChannelReadiness } from "../utils/readiness";
import { useConnections } from "@/features/integrations/hooks/use-connections";
import { connectionState } from "@/features/integrations/utils/connections";
import { normalizeDomainStatus } from "@/features/settings/components/account/domain-status";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { inAppService } from "@/features/settings/inapp.service";
import { pushCredentialsService } from "@/features/settings/push-credentials.service";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";

/**
 * Derives the readiness of every sending channel from the real email / in-app /
 * push services and the saved social connections. The UI consumes this one
 * list instead of knowing how each channel's setup works.
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

  // The social channels' saved connections, shared with the connect panels.
  const social = useConnections();

  const readiness = useMemo(() => {
    const domainStatuses = (domainsQuery.data ?? []).map((d) =>
      normalizeDomainStatus(d.status)
    );
    const status = inappQuery.data;
    const hasKey =
      Boolean(status?.publishableKeys.production) ||
      Boolean(status?.publishableKeys.test);
    const creds = pushQuery.data ?? [];
    const list = social.connections ?? [];
    const stateOf = (id: SocialChannelId) =>
      connectionState(list.find((c) => c.connector === id));

    return deriveChannelReadiness({
      domainStatuses,
      webPush: { hasKey, sessionCount: status?.sessionCount ?? null },
      mobilePush: {
        hasCredential: creds.length > 0,
        hasVerified: creds.some((c) => c.verified),
      },
      social: {
        x: stateOf("x"),
        whatsapp: stateOf("whatsapp"),
        telegram: stateOf("telegram"),
        discord: stateOf("discord"),
        farcaster: stateOf("farcaster"),
      },
    });
  }, [domainsQuery.data, inappQuery.data, pushQuery.data, social.connections]);

  return {
    readiness,
    isLoading:
      domainsQuery.isLoading ||
      inappQuery.isLoading ||
      pushQuery.isLoading ||
      social.isLoading,
  };
}
