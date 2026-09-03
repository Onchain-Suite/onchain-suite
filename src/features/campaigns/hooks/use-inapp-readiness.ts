"use client";

import { useQuery } from "@tanstack/react-query";

import {
  computeInAppReadiness,
  type InAppReadiness,
} from "../utils/inapp-readiness";
import { inAppService } from "@/features/settings/inapp.service";
import { pushCredentialsService } from "@/features/settings/push-credentials.service";

/**
 * Whether this workspace can actually deliver in-app push, split by channel:
 * web (SDK publishable key + an allow-listed origin) and mobile (a verified
 * APNs or FCM credential). Powers the campaign wizard's setup notice and the
 * launch guard. Reads are cached and shared with the settings panel's queries.
 *
 * The reads are OWNER/ADMIN on the backend; a non-admin sender gets a 403, which
 * surfaces as `state: "unknown"` (never a hard block) rather than an error.
 */
export function useInAppReadiness(
  organizationId: string | null,
  enabled = true
): { readiness: InAppReadiness; isLoading: boolean } {
  const on = Boolean(organizationId) && enabled;

  const statusQuery = useQuery({
    queryKey: ["integrations", "inapp", "status", "readiness", organizationId],
    enabled: on,
    queryFn: () => inAppService.getStatus(organizationId ?? undefined),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const originsQuery = useQuery({
    queryKey: ["integrations", "inapp", "origins", "readiness", organizationId],
    enabled: on,
    queryFn: () => inAppService.listOrigins(organizationId ?? undefined),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const credentialsQuery = useQuery({
    queryKey: ["organization", "push-credentials", "readiness", organizationId],
    enabled: on,
    queryFn: () => pushCredentialsService.list(organizationId ?? undefined),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const readiness = computeInAppReadiness({
    status: statusQuery.data ?? null,
    originCount: originsQuery.data?.length ?? null,
    credentials: credentialsQuery.data ?? null,
    statusKnown: statusQuery.isSuccess && originsQuery.isSuccess,
    credentialsKnown: credentialsQuery.isSuccess,
  });

  return {
    readiness,
    isLoading:
      on &&
      (statusQuery.isLoading ||
        originsQuery.isLoading ||
        credentialsQuery.isLoading),
  };
}
