"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SettingsCard } from "../settings-card";
import { ContractAddressList } from "./contract-address-list";
import { projectSettingsKey, supportedChainsKey } from "./project-card";
import { useAccountOrg } from "./use-account-org";
import {
  type ProjectSettingsFormData,
  projectSettingsService,
} from "@/features/settings/project-settings.service";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export function ContractsCard() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ chain: "", address: "", label: "" });

  const settingsQuery = useQuery({
    queryKey: projectSettingsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () =>
      projectSettingsService.getProjectSettings(organizationId ?? undefined),
  });

  const chainsQuery = useQuery({
    queryKey: supportedChainsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    staleTime: 30 * 60 * 1000,
    queryFn: () =>
      projectSettingsService.getSupportedChains(organizationId ?? undefined),
  });

  const settings = settingsQuery.data;
  const chains = useMemo(() => chainsQuery.data ?? [], [chainsQuery.data]);
  const contracts = useMemo(
    () => (settings?.contractAddresses ?? []).filter((c) => c.address),
    [settings?.contractAddresses]
  );

  const addMutation = useMutation({
    mutationFn: async () => {
      const address = draft.address.trim();
      if (!settings) throw new Error("Project settings not loaded yet");
      if (!draft.chain) throw new Error("Select a chain");
      if (!address) throw new Error("Enter a contract address");
      const base: ProjectSettingsFormData = {
        ...settings,
        contractAddresses: [
          ...(settings.contractAddresses ?? []),
          {
            chain: draft.chain,
            address,
            label: draft.label.trim() || undefined,
          },
        ],
      };
      return projectSettingsService.saveProjectSettings(
        base,
        organizationId ?? undefined
      );
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(projectSettingsKey(organizationId), saved);
      setAddOpen(false);
      setDraft({ chain: "", address: "", label: "" });
      toast.success("Contract added");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to add contract"
      );
    },
  });

  return (
    <SettingsCard
      title="Contracts"
      description="Indexed into the on-chain intelligence pipeline"
      action={
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          disabled={!organizationId}
        >
          <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
          Add contract
        </Button>
      }
    >
      {contracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            No contracts yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add contract addresses to start indexing holders and activity.
          </p>
        </div>
      ) : (
        <ContractAddressList contracts={contracts} chains={chains} />
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Chain</Label>
              <Select
                value={draft.chain}
                onValueChange={(v) => setDraft((d) => ({ ...d, chain: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a chain" />
                </SelectTrigger>
                <SelectContent>
                  {chains.map((chain) => (
                    <SelectItem key={chain.slug} value={chain.slug}>
                      {chain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-address">Contract address</Label>
              <Input
                id="contract-address"
                value={draft.address}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, address: e.target.value }))
                }
                placeholder="0x…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-label">Label (optional)</Label>
              <Input
                id="contract-label"
                value={draft.label}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, label: e.target.value }))
                }
                placeholder="Governance token"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={addMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? "Adding…" : "Add contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsCard>
  );
}

export default ContractsCard;
