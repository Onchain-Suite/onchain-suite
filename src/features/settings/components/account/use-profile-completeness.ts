"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { projectSettingsService } from "../../project-settings.service";
import { projectSettingsKey } from "./project-card";
import { useAccountOrg } from "./use-account-org";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";
import {
  SETTINGS_ACCOUNT_HREF,
  SETTINGS_SENDER_HREF,
} from "@/features/templates/variable-sources";

export interface CompletenessItem {
  id: string;
  label: string;
  done: boolean;
  /** Why it matters / what fills it - shown under the label when incomplete. */
  hint: string;
  href: string;
  /** Highlighted rows (email + address + a verified sender) render stronger. */
  emphasis?: boolean;
}

const looksLikeEmail = (value?: string) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const sendersKey = (orgId: string | null) =>
  ["account", "senders", orgId] as const;

/**
 * Org-profile completeness for the Settings ring: how many of the key fields a
 * sender needs are filled, with a deep link + hint per gap. Emphasises the two
 * the user called out - billing email and postal address - plus a verified
 * sender, since those block real sending / CAN-SPAM footers.
 *
 * Reuses the exact queries the Account cards already run (same keys), so React
 * Query dedupes them - the ring costs no extra requests.
 */
export function useProfileCompleteness() {
  const { organizationId } = useAccountOrg();
  const enabled = Boolean(organizationId);

  const settingsQuery = useQuery({
    queryKey: projectSettingsKey(organizationId),
    enabled,
    retry: false,
    queryFn: () =>
      projectSettingsService.getProjectSettings(organizationId ?? undefined),
  });

  const sendersQuery = useQuery({
    queryKey: sendersKey(organizationId),
    enabled,
    retry: false,
    queryFn: () =>
      senderIdentitiesService.listSenderIdentities(organizationId ?? undefined),
  });

  const settings = settingsQuery.data;
  const hasVerifiedSender = (sendersQuery.data ?? []).some(
    (identity) => identity.status === "verified"
  );

  const items = useMemo<CompletenessItem[]>(
    () => [
      {
        id: "name",
        label: "Project name",
        done: Boolean(settings?.name?.trim()),
        hint: "Names you as the sender. Powers {{ sender_name }} and {{ protocol }}.",
        href: SETTINGS_ACCOUNT_HREF,
      },
      {
        id: "billing-email",
        label: "Billing email",
        done: looksLikeEmail(settings?.email),
        hint: "Where receipts and billing notices are sent.",
        href: SETTINGS_ACCOUNT_HREF,
        emphasis: true,
      },
      {
        id: "postal-address",
        label: "Postal address",
        done: Boolean(settings?.address?.trim()),
        hint: "Required in email footers (CAN-SPAM). Powers {{ postal_address }}.",
        href: SETTINGS_ACCOUNT_HREF,
        emphasis: true,
      },
      {
        id: "sender",
        label: "Verified sender",
        done: hasVerifiedSender,
        hint: "A verified from-address so you can actually send email.",
        href: SETTINGS_SENDER_HREF,
        emphasis: true,
      },
      {
        id: "token",
        label: "Token ticker",
        done: Boolean(settings?.tokenTicker?.trim()),
        hint: "Powers {{ token_symbol }} in your templates.",
        href: SETTINGS_ACCOUNT_HREF,
      },
      {
        id: "contract",
        label: "Contract address",
        done: (settings?.contractAddresses?.length ?? 0) > 0,
        hint: "Index at least one contract to unlock onchain targeting.",
        href: SETTINGS_ACCOUNT_HREF,
      },
    ],
    [settings, hasVerifiedSender]
  );

  const total = items.length;
  const completed = items.filter((item) => item.done).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    items,
    total,
    completed,
    percent,
    isComplete: completed === total,
    isLoading: settingsQuery.isLoading || sendersQuery.isLoading,
  };
}
