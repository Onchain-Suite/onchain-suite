"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { ChannelReadiness, SocialChannelId } from "../types/channel";
import {
  deriveChannelReadiness,
  type ReadinessInputs,
} from "../utils/readiness";
import { useSenderDomains } from "./use-sender-domains";
import { useConnections } from "@/features/integrations/hooks/use-connections";
import { connectionState } from "@/features/integrations/utils/connections";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { inAppService } from "@/features/settings/inapp.service";
import { pushCredentialsService } from "@/features/settings/push-credentials.service";

/**
 * Derives the readiness of every sending channel from the real email / in-app /
 * push services and the saved social connections. The UI consumes this one
 * list instead of knowing how each channel's setup works.
 */
export function useChannelReadiness(): {
  readiness: ChannelReadiness[];
  /** The facts the list was derived from, for each channel's own progress. */
  inputs: ReadinessInputs;
  isLoading: boolean;
} {
  const { organizationId } = useAccountOrg();
  const enabled = Boolean(organizationId);
  const orgId = organizationId ?? undefined;

  // Shared with the email panel, so a domain verified there shows here at once.
  const { query: domainsQuery } = useSenderDomains();

  // Shares the cache with the Settings in-app card (same key + read).
  const inappQuery = useQuery({
    queryKey: ["integrations", "inapp", "status", organizationId],
    enabled,
    retry: false,
    queryFn: () => inAppService.getStatus(orgId),
  });

  const pushQuery = useQuery({
    // Same key as the credentials card, so saving one there shows here at once.
    queryKey: ["organization", "push-credentials", organizationId],
    enabled,
    retry: false,
    queryFn: () => pushCredentialsService.list(orgId),
  });

  // The social channels' saved connections, shared with the connect panels.
  const social = useConnections();

  const inputs = useMemo((): ReadinessInputs => {
    const domainStatuses = (domainsQuery.data ?? []).map((d) => d.status);
    const status = inappQuery.data;
    const hasKey =
      Boolean(status?.publishableKeys.production) ||
      Boolean(status?.publishableKeys.test);
    const creds = pushQuery.data ?? [];
    const list = social.connections ?? [];
    const stateOf = (id: SocialChannelId) =>
      connectionState(list.find((c) => c.connector === id));

    return {
      domainStatuses,
      webPush: { hasKey, sessionCount: status?.sessionCount ?? null },
      mobilePush: {
        hasCredential: creds.length > 0,
        hasVerified: creds.some((c) => c.verified),
      },
      social: {
        x: stateOf("x"),
        whatsapp: stateOf("whatsapp"),
        sms: stateOf("sms"),
        telegram: stateOf("telegram"),
        discord: stateOf("discord"),
        farcaster: stateOf("farcaster"),
      },
    };
  }, [domainsQuery.data, inappQuery.data, pushQuery.data, social.connections]);
  const readiness = useMemo(() => deriveChannelReadiness(inputs), [inputs]);

  return {
    readiness,
    inputs,
    isLoading:
      domainsQuery.isLoading ||
      inappQuery.isLoading ||
      pushQuery.isLoading ||
      social.isLoading,
  };
}
