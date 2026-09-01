"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SettingsCard } from "../settings-card";
import { projectSettingsKey, supportedChainsKey } from "./project-card";
import { useAccountOrg } from "./use-account-org";
import { automationService } from "@/features/automation/automation.service";
import {
  ContractInterfaceDialog,
  InterfaceSubmittedBadge,
} from "@/features/automation/components/contract-interface-dialog";
import {
  type ProjectSettingsAddressRow,
  type ProjectSettingsFormData,
  projectSettingsService,
} from "@/features/settings/project-settings.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
  const [adding, setAdding] = useState(false);
  const [interfaceTarget, setInterfaceTarget] = useState<{
    chain: string;
    address: string;
    label?: string;
  } | null>(null);
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
  // One indexed lookup per contract, cached for the session: the row has to
  // show whether an address is already covered, and the alternative is pasting
  // again to find out — which is also how a good ABI gets overwritten by a
  // worse one.
  const interfaceQueries = useQueries({
    queries: (settings?.contractAddresses ?? [])
      .filter((c) => c.address && c.chain)
      .map((c) => ({
        queryKey: ["contract-interface", c.chain, c.address],
        queryFn: () =>
          automationService.getContractInterface(
            c.chain as string,
            c.address as string,
            organizationId ?? undefined
          ),
        staleTime: 5 * 60 * 1000,
        retry: false,
      })),
  });
  const interfaceByAddress = useMemo(() => {
    const map = new Map<string, number>();
    const rows = (settings?.contractAddresses ?? []).filter(
      (c) => c.address && c.chain
    );
    rows.forEach((row, index) => {
      const data = interfaceQueries[index]?.data;
      if (data?.submitted) map.set(String(row.address), data.eventCount);
    });
    return map;
  }, [settings?.contractAddresses, interfaceQueries]);

  const chainLabel = useMemo(() => {
    const map = new Map(chains.map((c) => [c.slug, c.label]));
    return (slug?: string) => (slug ? (map.get(slug) ?? slug) : "");
  }, [chains]);
  const contracts = useMemo(
    () => (settings?.contractAddresses ?? []).filter((c) => c.address),
    [settings?.contractAddresses]
  );

  const saveContracts = (next: ProjectSettingsAddressRow[]) => {
    if (!settings) throw new Error("Project settings not loaded yet");
    const base: ProjectSettingsFormData = {
      ...settings,
      contractAddresses: next,
    };
    return projectSettingsService.saveProjectSettings(
      base,
      organizationId ?? undefined
    );
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const address = draft.address.trim();
      if (!draft.chain) throw new Error("Select a chain");
      if (!address) throw new Error("Enter a contract address");
      return saveContracts([
        ...(settings?.contractAddresses ?? []),
        { chain: draft.chain, address, label: draft.label.trim() || undefined },
      ]);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(projectSettingsKey(organizationId), saved);
      setAdding(false);
      setDraft({ chain: "", address: "", label: "" });
      toast.success("Contract added");
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to add contract"
      ),
  });

  const removeMutation = useMutation({
    mutationFn: (address: string) =>
      saveContracts(
        (settings?.contractAddresses ?? []).filter((c) => c.address !== address)
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(projectSettingsKey(organizationId), saved);
      toast.success("Contract removed");
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to remove contract"
      ),
  });

  return (
    <SettingsCard
      title="Contracts"
      description="Indexed into the on-chain intelligence pipeline"
      action={
        !adding ? (
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            disabled={!organizationId}
          >
            <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Add contract
          </Button>
        ) : null
      }
    >
      {adding ? (
        <form
          className="mb-4 grid gap-3 rounded-xl border border-border/60 bg-background/40 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
        >
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
          <Input
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="Label (optional)"
          />
          <Input
            className="sm:col-span-2"
            value={draft.address}
            onChange={(e) =>
              setDraft((d) => ({ ...d, address: e.target.value }))
            }
            placeholder="0x…"
          />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding…" : "Add contract"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {contracts.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            No contracts yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add contract addresses to start indexing holders and activity.
          </p>
        </div>
      ) : contracts.length > 0 ? (
        <ul className="divide-y divide-border/50">
          {contracts.map((contract) => (
            <li
              key={`${contract.chain}-${contract.address}`}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {contract.chain ? (
                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {chainLabel(contract.chain)}
                    </span>
                  ) : null}
                  {contract.label ? (
                    <span className="truncate text-sm font-medium text-foreground">
                      {contract.label}
                    </span>
                  ) : null}
                  {interfaceByAddress.has(String(contract.address)) ? (
                    <InterfaceSubmittedBadge
                      eventCount={
                        interfaceByAddress.get(String(contract.address)) ?? 0
                      }
                    />
                  ) : null}
                </div>
                <code className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                  {contract.address}
                </code>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setInterfaceTarget({
                      chain: String(contract.chain ?? ""),
                      address: String(contract.address),
                      label: contract.label ?? undefined,
                    })
                  }
                  // A submitted interface can still be replaced — a partial ABI
                  // pasted in a hurry should be fixable by pasting the full one.
                  disabled={!contract.chain}
                >
                  {interfaceByAddress.has(String(contract.address))
                    ? "Replace ABI"
                    : "Add ABI"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMutation.mutate(contract.address)}
                  disabled={removeMutation.isPending}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {interfaceTarget ? (
        <ContractInterfaceDialog
          open
          onOpenChange={(next) => {
            if (!next) setInterfaceTarget(null);
          }}
          chain={interfaceTarget.chain}
          address={interfaceTarget.address}
          label={interfaceTarget.label}
          organizationId={organizationId ?? undefined}
        />
      ) : null}
    </SettingsCard>
  );
}

export default ContractsCard;
