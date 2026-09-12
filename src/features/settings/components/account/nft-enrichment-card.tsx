"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SettingsCard } from "../settings-card";
import { useAccountOrg } from "./use-account-org";
import { intelligenceService } from "@/features/intelligence/intelligence.service";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";

const nftEnrichmentKey = (orgId: string | null) =>
  ["intelligence", "enrichment", "nft", orgId] as const;

/**
 * Per-org NFT-enrichment control. NFT holdings (ERC-1155 vault shares, ERC-721
 * positions) are ~half the per-wallet on-chain cost, so they run only where they
 * pay off. "Auto-detect" scans the org's tracked contracts and flips this on when
 * a vault/NFT token is found; the switch is the manual override.
 */
export function NftEnrichmentCard() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: nftEnrichmentKey(organizationId),
    enabled: Boolean(organizationId),
    queryFn: () =>
      intelligenceService.getNftEnrichment(organizationId ?? undefined),
    staleTime: 60_000,
  });

  const enabled = query.data?.includeNfts === true;

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: nftEnrichmentKey(organizationId),
    });

  const setMutation = useMutation({
    mutationFn: (next: boolean) =>
      intelligenceService.setNftEnrichment(next, organizationId ?? undefined),
    onSuccess: async (res) => {
      await invalidate();
      toast.success(
        res.includeNfts
          ? "NFT enrichment on — vault/NFT holdings will be captured."
          : "NFT enrichment off — halves the on-chain cost per wallet."
      );
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't update NFT enrichment"
      ),
  });

  const detectMutation = useMutation({
    mutationFn: () =>
      intelligenceService.autoDetectNftEnrichment(organizationId ?? undefined),
    onSuccess: async (res) => {
      await invalidate();
      if (res.changed) {
        toast.success(
          `Found a ${res.nftStandardFound?.toUpperCase()} contract — NFT enrichment enabled.`
        );
      } else if (res.nftStandardFound) {
        toast.success(
          `Found a ${res.nftStandardFound?.toUpperCase()} contract; your existing setting was kept.`
        );
      } else {
        toast.info(
          `Scanned ${res.contractsScanned} contract${
            res.contractsScanned === 1 ? "" : "s"
          } — no ERC-1155/721 (vault) token found.`
        );
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't scan contracts"),
  });

  const busy = setMutation.isPending || query.isLoading;

  return (
    <SettingsCard
      title="NFT & vault enrichment"
      description="Capture ERC-1155 (vault shares) and ERC-721 holdings during wallet enrichment. Off by default because it roughly doubles the on-chain cost per wallet — turn it on for projects whose vaults or positions are NFTs."
      action={
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={detectMutation.isPending || !organizationId}
            onClick={() => detectMutation.mutate()}
          >
            {detectMutation.isPending ? "Scanning…" : "Auto-detect"}
          </Button>
          <Switch
            checked={enabled}
            disabled={busy || !organizationId}
            onCheckedChange={(next) => setMutation.mutate(next)}
            aria-label="Toggle NFT enrichment"
          />
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        {query.data?.includeNfts === null
          ? "Following the platform default."
          : enabled
            ? "On for this organization — NFT/vault holdings are included."
            : "Off for this organization — NFT/vault holdings are skipped."}{" "}
        Auto-detect scans your tracked contracts and enables this when it finds
        an ERC-1155 or ERC-721 token.
      </p>
    </SettingsCard>
  );
}

export default NftEnrichmentCard;
