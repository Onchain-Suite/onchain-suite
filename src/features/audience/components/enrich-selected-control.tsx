"use client";

import { BoltIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

import { intelligenceService } from "@/features/intelligence/intelligence.service";
import { projectSettingsService } from "@/features/settings/project-settings.service";

/**
 * "Enrich N selected on <chain>" — the targeted, per-chain enrichment action for
 * the audience selection bar. The user ticks a subset of wallets and picks the
 * chain to enrich them on, so ADI wallets go to adi-mainnet and Ethereum wallets
 * to eth-mainnet from the same list (the whole-audience "Enrich" in Intelligence
 * only ever applies one blanket chain). Backed by
 * POST /intelligence/query/enrichment/wallets/enqueue-batch.
 */
export function EnrichSelectedControl({
  walletAddresses,
  orgId,
  onEnqueued,
}: {
  walletAddresses: string[];
  orgId?: string | null;
  onEnqueued?: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const chainsQuery = useQuery({
    queryKey: ["intelligence", "supported-chains", orgId ?? null],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000,
    queryFn: () =>
      projectSettingsService.getSupportedChains(orgId ?? undefined),
  });
  const chains = useMemo(() => chainsQuery.data ?? [], [chainsQuery.data]);
  const mainnetChains = useMemo(
    () => chains.filter((c) => !c.testnet),
    [chains]
  );
  const testnetChains = useMemo(
    () => chains.filter((c) => c.testnet),
    [chains]
  );

  const enrichMutation = useMutation({
    mutationFn: (chain: string) =>
      intelligenceService.enqueueWalletBatchEnrichment(
        { walletAddresses, chain },
        orgId ?? undefined
      ),
    onSuccess: async (res, chain) => {
      const queued = typeof res?.queued === "number" ? res.queued : 0;
      const skipped = typeof res?.skipped === "number" ? res.skipped : 0;
      toast.success(
        queued > 0
          ? `Enriching ${queued.toLocaleString()} wallet${
              queued === 1 ? "" : "s"
            } on ${chain}${
              skipped > 0 ? ` (${skipped} skipped)` : ""
            } — metrics will refresh shortly.`
          : "No enrichable wallets in the selection."
      );
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "enrichment", "status"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "credits"],
      });
      onEnqueued?.();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.toUpperCase().includes("CREDITS_EXCEEDED") ||
        msg.includes("402")
      ) {
        toast.error(
          "Out of credits — top up the usage wallet or upgrade in Settings → Billing."
        );
        return;
      }
      toast.error(msg || "Failed to start enrichment");
    },
  });

  const pick = (chain: string) => {
    setOpen(false);
    enrichMutation.mutate(chain);
  };

  const busy = enrichMutation.isPending;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg"
          disabled={walletAddresses.length === 0 || busy}
        >
          <BoltIcon className="mr-1.5 size-4" aria-hidden="true" />
          {busy ? "Enriching…" : "Enrich on…"}
          <ChevronDownIcon className="ml-1 size-3.5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Pick a chain…" />
          <CommandList>
            <CommandEmpty>
              {chainsQuery.isLoading ? "Loading chains…" : "No chains found."}
            </CommandEmpty>
            {mainnetChains.length > 0 ? (
              <CommandGroup heading="Mainnet">
                {mainnetChains.map((chain) => (
                  <CommandItem
                    key={chain.slug}
                    value={`${chain.label} ${chain.slug}`}
                    onSelect={() => pick(chain.slug)}
                  >
                    {chain.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {testnetChains.length > 0 ? (
              <CommandGroup heading="Testnet">
                {testnetChains.map((chain) => (
                  <CommandItem
                    key={chain.slug}
                    value={`${chain.label} ${chain.slug}`}
                    onSelect={() => pick(chain.slug)}
                  >
                    {chain.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default EnrichSelectedControl;
