"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { getSelectedOrganizationId } from "@/lib/utils";

import { SettingsCard } from "../settings-card";
import { renewalService } from "@/features/billing/renewal.service";
import { renewalNotice } from "@/features/settings/utils/renewal-notice";
import { Button } from "@/shared/components/ui/button";

/**
 * Shown only to a workspace that still renews through our own invoices: the
 * offer to put that renewal on a subscription at the price it already pays.
 *
 * It renders nothing while the answer is loading, when the workspace cannot be
 * moved, and when the read fails (an older backend has no such route, and a
 * teammate who is not the owner is refused it). The page is whole without it.
 */
export function RenewalNoticeCard() {
  const orgId = getSelectedOrganizationId();
  const offerQuery = useQuery({
    queryKey: ["billing", "renewal", orgId],
    queryFn: () => renewalService.getOffer(),
    enabled: Boolean(orgId),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const subscribe = useMutation({
    mutationFn: () =>
      renewalService.subscribe(
        typeof window !== "undefined" ? window.location.origin : ""
      ),
    onSuccess: ({ url }) => {
      if (url) {
        window.location.assign(url);
        return;
      }
      toast.error("Couldn't start the renewal. Please try again.");
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't start the renewal. Please try again."
      ),
  });

  const notice = renewalNotice(offerQuery.data);
  if (!notice) return null;

  return (
    <SettingsCard
      title={notice.title}
      action={
        <Button
          size="sm"
          disabled={subscribe.isPending}
          onClick={() => subscribe.mutate()}
        >
          {subscribe.isPending ? "Redirecting…" : notice.actionLabel}
        </Button>
      }
    >
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        {notice.body}
      </p>
    </SettingsCard>
  );
}

export default RenewalNoticeCard;
