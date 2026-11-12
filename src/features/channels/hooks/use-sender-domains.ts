"use client";

import { useQuery } from "@tanstack/react-query";

import { type SenderDomain, toSenderDomains } from "../utils/domain-status";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";

/**
 * One cache entry for the org's sending domains, shared by the Channels list
 * (is email live?) and the email panel (the domains themselves), so verifying
 * a domain in the panel turns the channel's badge green without a second read.
 */
export const senderDomainsKey = (organizationId: string | null) =>
  ["channels", "sender-domains", organizationId] as const;

/** A domain's DNS report. Keyed by domain so each panel owns its own. */
export const senderDomainDnsKey = (domainId: string) =>
  ["channels", "sender-domain-dns", domainId] as const;

export function useSenderDomains() {
  const { organizationId } = useAccountOrg();
  const query = useQuery({
    queryKey: senderDomainsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: async (): Promise<SenderDomain[]> =>
      toSenderDomains(
        await senderIdentitiesService.listDomains(organizationId ?? undefined)
      ),
  });
  return { organizationId, query, domains: query.data };
}
