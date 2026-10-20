"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";
import { getSelectedOrganizationId } from "@/lib/utils";

import {
  INVITE_RATE_LIMIT_MESSAGE,
  isRateLimitError,
  organizationMembersService,
} from "@/features/settings/organization-members.service";

/**
 * Hand the technical setup to whoever holds the credentials.
 *
 * The honest version of the reference's client-only `sendHandoff`: it invites the developer to
 * the org as an admin, through the same rate-limited invite endpoint the Settings team page uses,
 * so they land with access to Settings -> Integrations -> Channels where the sending domain, SDK
 * and X setup live. The setup steps (see `data/setup-tasks`) travel with that access. Resolves to
 * `true` once the invite is sent, `false` after surfacing the reason.
 *
 * Requires an active org, so it only works once the project step has created one.
 */
export function useSendHandoff() {
  const { data: session } = useSession();
  return useCallback(
    async (email: string): Promise<boolean> => {
      const addr = email.trim().toLowerCase();
      if (!addr) return false;
      const orgId =
        getSelectedOrganizationId() ?? session?.session?.activeOrganizationId;
      if (!orgId) {
        toast.error(
          "No workspace yet. Finish the first step, then invite your developer."
        );
        return false;
      }
      try {
        // Rate-limited at 5 invites/minute, same as the Settings team page.
        await organizationMembersService.createInvite(orgId, {
          email: addr,
          role: "ADMIN",
        });
        return true;
      } catch (error) {
        toast.error(
          isRateLimitError(error)
            ? INVITE_RATE_LIMIT_MESSAGE
            : error instanceof Error
              ? error.message
              : "Failed to send the invite."
        );
        return false;
      }
    },
    [session]
  );
}
