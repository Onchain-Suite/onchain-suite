"use client";

import { useQuery } from "@tanstack/react-query";

import { getSelectedOrganizationId } from "@/lib/utils";

import { sendingApprovalService } from "../sending-approval.service";

export const sendingApprovalKey = (orgId: string | null) => [
  "organization",
  orgId,
  "sending-approval",
];

/**
 * The workspace's sending-approval state. Shared by the settings section and
 * the app-wide banner, so one request serves both. A failed read (an older
 * backend without the route) is treated as "nothing to show".
 */
export function useSendingApproval() {
  const orgId = getSelectedOrganizationId();
  return useQuery({
    queryKey: sendingApprovalKey(orgId),
    queryFn: () => sendingApprovalService.get(),
    enabled: Boolean(orgId),
    retry: false,
    staleTime: 5 * 60_000,
  });
}
