"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { projectSettingsService } from "@/features/settings/project-settings.service";

const EVM_RE = /^0x[0-9a-fA-F]{40}$/;
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

interface ParsedContract {
  address: string;
  chain: string;
}

/**
 * Parse a textarea of contract addresses — one per line, optionally
 * `address,chain` (or `address<TAB>chain`). Lines without a chain take the
 * selected default. Malformed addresses are counted, not silently dropped.
 */
export function parseContractLines(
  text: string,
  defaultChain: string
): { rows: ParsedContract[]; skipped: number } {
  const rows: ParsedContract[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [addressRaw, chainRaw] = trimmed.split(/[,\t]/).map((s) => s.trim());
    const address = addressRaw ?? "";
    if (!EVM_RE.test(address) && !SOL_RE.test(address)) {
      skipped += 1;
      continue;
    }
    const chain = (chainRaw || defaultChain || "").trim();
    const key = `${chain.toLowerCase()}:${address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ address, chain });
  }
  return { rows, skipped };
}

/**
 * Bulk-import tracked contract addresses (+ chain) into the org's project
 * settings — the same store the Settings → Contracts card writes to. Once saved,
 * "Sync wallets" discovers their holders and pulls them into the audience,
 * badged by chain. `onImported` fires only when at least one new contract landed
 * so the caller can kick off a sync.
 */
export function ImportContractsDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [defaultChain, setDefaultChain] = useState("");

  const chainsQuery = useQuery({
    queryKey: ["project-supported-chains"],
    queryFn: () => projectSettingsService.getSupportedChains(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  // Holder discovery only has an EVM data plane — hide chains with no plane
  // (e.g. Solana) so a user can't add contracts that would return no holders.
  const chains = useMemo(
    () => (chainsQuery.data ?? []).filter((c) => c.family === "evm"),
    [chainsQuery.data]
  );
  const effectiveDefault = defaultChain
    ? defaultChain
    : (chains.find((c) => c.slug === "eth-mainnet")?.slug ??
      chains[0]?.slug ??
      "");

  const parsed = useMemo(
    () => parseContractLines(text, effectiveDefault),
    [text, effectiveDefault]
  );

  const importMutation = useMutation({
    mutationFn: async () => {
      const settings = await projectSettingsService.getProjectSettings();
      const existing = settings.contractAddresses ?? [];
      const seen = new Set(
        existing
          .filter((c) => c.address)
          .map(
            (c) => `${(c.chain ?? "").toLowerCase()}:${c.address.toLowerCase()}`
          )
      );
      const additions = parsed.rows.filter(
        (r) => !seen.has(`${r.chain.toLowerCase()}:${r.address.toLowerCase()}`)
      );
      if (additions.length === 0) return { added: 0 };
      await projectSettingsService.saveProjectSettings({
        ...settings,
        contractAddresses: [
          ...existing,
          ...additions.map((r) => ({ address: r.address, chain: r.chain })),
        ],
      });
      return { added: additions.length };
    },
    onSuccess: ({ added }) => {
      if (added > 0) {
        toast.success(
          `${added} contract${added === 1 ? "" : "s"} added — syncing their holders now.`
        );
        queryClient.invalidateQueries({ queryKey: ["audience"] });
        setText("");
        onOpenChange(false);
        onImported?.();
      } else {
        toast.info("Those contracts are already tracked.");
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to import contracts";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import contracts</DialogTitle>
          <DialogDescription>
            Paste contract addresses (one per line). Then Sync wallets pulls the
            wallets that hold them into your audience, tagged by chain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Chain</label>
            <Select value={effectiveDefault} onValueChange={setDefaultChain}>
              <SelectTrigger>
                <SelectValue placeholder="Select a chain" />
              </SelectTrigger>
              <SelectContent>
                {chains.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Applied to any line without its own <code>address,chain</code>.
            </p>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            spellCheck={false}
            placeholder={"0xabc…def\n0x123…456,base-mainnet"}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
            aria-label="Contract addresses"
          />

          <p className="text-xs text-muted-foreground">
            {parsed.rows.length} valid contract
            {parsed.rows.length === 1 ? "" : "s"}
            {parsed.skipped > 0
              ? ` · ${parsed.skipped} line${parsed.skipped === 1 ? "" : "s"} skipped (not a valid address)`
              : ""}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={
              parsed.rows.length === 0 ||
              !effectiveDefault ||
              importMutation.isPending
            }
          >
            {importMutation.isPending
              ? "Importing…"
              : `Import ${parsed.rows.length || ""} & sync`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
