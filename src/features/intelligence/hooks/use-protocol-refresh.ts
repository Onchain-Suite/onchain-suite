"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  type IntelligenceEnrichProtocolResponse,
  intelligenceService,
} from "../intelligence.service";
import { classifyEnrichmentError } from "../utils/enrichment-credit-error";

interface RefreshVariables {
  allowPartial: boolean;
}

/**
 * The "Refresh data" action: re-enrich every wallet from saved contracts and
 * contacts (`POST /intelligence/query/enrichment/protocol`).
 *
 * A refresh that could cost more Onchain credits than are left is refused up
 * front (402 REFRESH_EXCEEDS_CREDITS). Before that check, a Launch workspace
 * with 2,886 wallets clicked Refresh, got no warning, and overdrew its usage
 * wallet. The refusal is held here as `overCreditsMessage` (the backend's own
 * sentence, with the numbers) so the caller can ask before spending: refresh
 * what fits (`allowPartial`) or go to billing.
 */
export function useProtocolRefresh(options: {
  onStarted: (
    res: IntelligenceEnrichProtocolResponse,
    vars: RefreshVariables
  ) => void;
  failureMessage?: string;
}) {
  const queryClient = useQueryClient();
  const [overCreditsMessage, setOverCreditsMessage] = useState<string | null>(
    null
  );

  const mutation = useMutation({
    mutationFn: ({ allowPartial }: RefreshVariables) =>
      intelligenceService.enrichProtocol(
        allowPartial ? { allowPartial: true } : undefined
      ),
    onSuccess: async (res, vars) => {
      setOverCreditsMessage(null);
      options.onStarted(res, vars);
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "enrichment", "status"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "credits"],
      });
    },
    onError: (err: unknown, vars) => {
      const failure = classifyEnrichmentError(err, options.failureMessage);
      // `allowPartial` is never refused for fitting; if it somehow is, say so
      // rather than reopening the same question.
      if (failure.kind === "refresh-exceeds-credits" && !vars.allowPartial) {
        setOverCreditsMessage(failure.message);
        return;
      }
      setOverCreditsMessage(null);
      toast.error(failure.message);
    },
  });

  return {
    refresh: () => mutation.mutate({ allowPartial: false }),
    refreshWhatFits: () => mutation.mutate({ allowPartial: true }),
    isPending: mutation.isPending,
    overCreditsMessage,
    dismissOverCredits: () => setOverCreditsMessage(null),
  };
}
