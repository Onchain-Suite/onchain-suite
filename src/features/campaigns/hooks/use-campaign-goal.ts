"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { campaignsService } from "../campaigns.service";
import {
  type CampaignGoalId,
  goalIdFromAction,
  goalToPayload,
} from "../data/goals";

/**
 * Load and set the campaign's single conversion goal. Reads the saved goal
 * (rehydrating the picked id from its on-chain action) and persists a change
 * through `setGoal` (create / update / clear). Gated on `campaignId` so it never
 * fires before the draft exists.
 */
export function useCampaignGoal(campaignId?: string) {
  const qc = useQueryClient();
  const key = ["campaigns", "goal", campaignId] as const;

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<CampaignGoalId> => {
      if (!campaignId) return "none";
      const goals = await campaignsService.getGoals(campaignId);
      const action = goals[0]?.conversionConfig?.["action"];
      return goalIdFromAction(action);
    },
  });

  const mutation = useMutation({
    mutationFn: (id: CampaignGoalId) =>
      campaignId
        ? campaignsService.setGoal(campaignId, goalToPayload(id))
        : Promise.resolve(null),
    // Optimistic: reflect the pick immediately, roll back on error.
    onMutate: async (id: CampaignGoalId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CampaignGoalId>(key);
      qc.setQueryData<CampaignGoalId>(key, id);
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    goalId: query.data ?? "none",
    isLoading: query.isLoading,
    setGoal: mutation.mutate,
    saving: mutation.isPending,
  } as const;
}
