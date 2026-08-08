"use client";

import { ArrowPathIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { intelligenceService } from "../intelligence.service";

const timeAgo = (iso: string | null): string => {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "never";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

/**
 * Compact wallet/contract enrichment button (sits next to the credit meter).
 * Kicks off holder discovery + per-wallet enrichment from saved project-settings
 * contracts - this is what populates `user_onchain_metrics`, so SQL queries
 * return rows. Status is surfaced in the tooltip. Spends GoldRush credits.
 */
export function EnrichmentControl() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["intelligence", "enrichment", "status"],
    queryFn: () => intelligenceService.getEnrichmentStatus(),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => {
      const d = q.state.data as
        { pending?: number; idle?: boolean } | undefined;
      return d && (d.pending ?? 0) > 0 && d.idle === false ? 3000 : false;
    },
  });

  const enrichMutation = useMutation({
    mutationFn: () => intelligenceService.enrichProtocol(),
    onSuccess: async (res) => {
      const wallets = res?.walletsEnqueued ?? 0;
      toast.success(
        wallets > 0
          ? `Enriching ${wallets.toLocaleString()} wallets - metrics will populate shortly.`
          : "Enrichment started. Save contract addresses in Settings to seed more wallets."
      );
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "enrichment", "status"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "credits"],
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.toUpperCase().includes("CREDITS_EXCEEDED") ||
        msg.includes("402")
      ) {
        toast.error(
          "Out of credits - top up the usage wallet or upgrade in Settings → Billing."
        );
        return;
      }
      toast.error(msg || "Failed to start enrichment");
    },
  });

  const status = statusQuery.data;
  const enriched = status?.enrichedWallets ?? 0;
  const pending = status?.pending ?? 0;
  const busy = enrichMutation.isPending || pending > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => enrichMutation.mutate()}
            disabled={enrichMutation.isPending}
            aria-label="Enrich on-chain data"
            className="inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
          >
            {busy ? (
              <ArrowPathIcon
                className="h-4 w-4 animate-spin text-primary"
                aria-hidden="true"
              />
            ) : (
              <SparklesIcon
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
            )}
            {enrichMutation.isPending ? "Enriching…" : "Enrich"}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs">
          {enriched.toLocaleString()} wallets enriched
          {busy
            ? ` · ${pending.toLocaleString()} job${pending === 1 ? "" : "s"} running`
            : ` · updated ${timeAgo(status?.lastEnrichedAt ?? null)}`}
          . Discovers holders for your saved contracts and enriches their
          on-chain metrics so SQL has data.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default EnrichmentControl;
