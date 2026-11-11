"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { authClient, useSession } from "@/lib/auth-client";
import { getSelectedOrganizationId } from "@/lib/utils";

import {
  INVITE_RATE_LIMIT_MESSAGE,
  isRateLimitError,
  isSeatLimitError,
  organizationMembersService,
} from "@/features/settings/organization-members.service";

/**
 * A new workspace's seats are enough for the owner and the developer they hand
 * setup to. Inviting more people than that from inside the wizard hits the
 * seat limit, and a seat cannot be added here: Billing is on the other side of
 * setup. So the way forward is to finish (or skip) setup first.
 */
export const HANDOFF_SEATS_FULL_MESSAGE =
  "Your workspace's seats are all taken. Finish or skip setup, add a seat in Settings, Billing, then invite them from Settings, Team.";

/** What to say when the handoff invite did not go out. */
export function handoffFailureMessage(error: unknown): string {
  if (isSeatLimitError(error)) return HANDOFF_SEATS_FULL_MESSAGE;
  if (isRateLimitError(error)) return INVITE_RATE_LIMIT_MESSAGE;
  return error instanceof Error && error.message
    ? error.message
    : "Failed to send the invite.";
}

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
      let orgId =
        getSelectedOrganizationId() ?? session?.session?.activeOrganizationId;
      if (!orgId) {
        // `useSession` can lag the org that the project step just created, so
        // fetch a fresh session before giving up.
        const fresh = await authClient.getSession();
        orgId = fresh.data?.session?.activeOrganizationId ?? undefined;
      }
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
        toast.error(handoffFailureMessage(error));
        return false;
      }
    },
    [session]
  );
}
