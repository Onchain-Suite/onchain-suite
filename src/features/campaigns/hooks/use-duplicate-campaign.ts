"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getSelectedOrganizationId } from "@/lib/utils";

import { campaignsService } from "../campaigns.service";
import type { Campaign } from "../types/campaign";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/** Where a duplicated campaign opens: the wizard, on its first step. */
export const duplicateHref = (campaignId: string): string =>
  `${PRIVATE_ROUTES.NEW_CAMPAIGN}?${new URLSearchParams({
    campaign: campaignId,
    step: "1",
  }).toString()}`;

/**
 * Duplicate a campaign from its row. The copy is a draft with the content,
 * audience and channels of the original and none of its schedule or results,
 * and it opens in the wizard straight away: a copy is made to be changed.
 */
export function useDuplicateCampaign() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (campaign: Campaign) =>
      campaignsService.duplicateCampaign(
        campaign.id,
        getSelectedOrganizationId() ?? undefined
      ),
    onSuccess: (copy, original) => {
      queryClient
        .invalidateQueries({ queryKey: ["campaigns"] })
        .catch(() => undefined);
      if (!copy?.id) {
        toast.success(`Duplicated ${original.name}. It is in your drafts.`);
        return;
      }
      toast.success(`Duplicated ${original.name}. Opening the copy.`);
      router.push(duplicateHref(copy.id));
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't duplicate the campaign"
      ),
  });
}
