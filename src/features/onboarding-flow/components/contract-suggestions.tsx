"use client";

import {
  CheckIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { CopyButton } from "@/components/common/copy-button";

import {
  onboardingService,
  type SuggestedContract,
} from "../onboarding.service";

/** Debounce a user-typed value (~400ms) so we never fetch per keystroke. */
function useDebouncedValue(value: string, delayMs = 400): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

const suggestionKey = (contract: SuggestedContract) =>
  `${contract.name}::${contract.chainHint}::${contract.address ?? ""}`;

const shortenAddress = (address: string) => {
  const a = address.trim();
  if (a.length <= 16) return a;
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
};

// Block-explorer address URL by chain hint, so users can confirm a suggested
// contract is really theirs before accepting it. Falls back to Blockscan
// (cross-chain EVM search) for unknown chains.
const EXPLORERS: Array<[RegExp, string]> = [
  [/base/i, "https://basescan.org/address/"],
  [/polygon|matic/i, "https://polygonscan.com/address/"],
  [/arbitrum/i, "https://arbiscan.io/address/"],
  [/optimism/i, "https://optimistic.etherscan.io/address/"],
  [/bsc|bnb|binance/i, "https://bscscan.com/address/"],
  [/avalanche|avax/i, "https://snowtrace.io/address/"],
  [/solana/i, "https://solscan.io/account/"],
  [/eth|mainnet/i, "https://etherscan.io/address/"],
];

const explorerUrlFor = (
  chainHint: string | null | undefined,
  address: string
) => {
  const hint = (chainHint ?? "").trim();
  for (const [pattern, base] of EXPLORERS) {
    if (pattern.test(hint)) return `${base}${address}`;
  }
  return `https://blockscan.com/address/${address}`;
};

function SuggestionSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border/60 bg-card/40 p-3"
        >
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

interface ContractSuggestionsPanelProps {
  /** Raw (undebounced) protocol name - usually the organization name. */
  protocolName: string;
  /** Sector label; suggestions only fetch when both inputs are present. */
  sector: string;
  /** Contracts the user has already accepted (confirmed) into their list. */
  accepted: SuggestedContract[];
  onAccept: (contract: SuggestedContract) => void;
  onRemove: (contract: SuggestedContract) => void;
}

/**
 * Pre-filled, confirmable contract suggestions
 * (`POST /onboarding/suggest-contracts`). Because the backend replies with
 * `requiresReview: true`, nothing here is auto-committed: each suggestion is
 * a card the user explicitly accepts (into the step's contract list) or
 * dismisses. Fetch failures render nothing - suggestions are an enhancement,
 * never a blocker for the onboarding step.
 */
export function ContractSuggestionsPanel({
  protocolName,
  sector,
  accepted,
  onAccept,
  onRemove,
}: ContractSuggestionsPanelProps) {
  const debouncedName = useDebouncedValue(protocolName);
  const trimmedName = debouncedName.trim();
  const trimmedSector = sector.trim();
  const enabled = trimmedName.length >= 2 && trimmedSector.length > 0;

  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );

  const suggestionsQuery = useQuery({
    queryKey: [
      "onboarding",
      "suggest-contracts",
      { protocolName: trimmedName, sector: trimmedSector },
    ],
    queryFn: ({ signal }) =>
      onboardingService.suggestContracts(
        { protocolName: trimmedName, sector: trimmedSector },
        { signal }
      ),
    enabled,
    // Server caches suggestions for 7 days; a long client staleTime keeps
    // step back/forward navigation from re-firing the LLM path.
    staleTime: 60 * 60 * 1000,
  });

  const acceptedKeys = useMemo(
    () => new Set(accepted.map(suggestionKey)),
    [accepted]
  );

  const visible = useMemo(() => {
    const contracts = suggestionsQuery.data?.contracts ?? [];
    return contracts.filter((c) => !dismissed.has(suggestionKey(c)));
  }, [suggestionsQuery.data, dismissed]);

  if (!enabled) return null;
  if (suggestionsQuery.isError) return null; // silent - enhancement only

  if (suggestionsQuery.isPending) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Finding contracts for {trimmedName}…
        </p>
        <SuggestionSkeleton />
      </div>
    );
  }

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <SparklesIcon
            className="h-3.5 w-3.5 text-primary"
            aria-hidden="true"
          />
          Suggested contracts
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Based on {trimmedName} ({trimmedSector}). Review each suggestion -
          nothing is added until you accept it.
        </p>
      </div>
      <ul className="space-y-2">
        {visible.map((contract) => {
          const key = suggestionKey(contract);
          const isAccepted = acceptedKeys.has(key);
          return (
            <li
              key={key}
              className={`rounded-xl border p-3 transition-colors ${
                isAccepted
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/60 bg-card/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">
                      {contract.name}
                    </span>
                    <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {contract.kind}
                    </span>
                    {contract.chainHint ? (
                      <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {contract.chainHint}
                      </span>
                    ) : null}
                  </div>
                  {contract.address ? (
                    <div className="mt-1">
                      <div className="flex items-center gap-1">
                        <span
                          className="font-mono text-xs text-muted-foreground"
                          title={contract.address}
                        >
                          {shortenAddress(contract.address)}
                        </span>
                        <CopyButton
                          value={contract.address}
                          label="Copy address"
                        />
                        <a
                          href={explorerUrlFor(
                            contract.chainHint,
                            contract.address
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                        >
                          View on explorer ↗
                        </a>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Confirm this address belongs to your protocol before
                        adding it.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Address not verified - add it later in settings.
                    </p>
                  )}
                  {contract.reason ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {contract.reason}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isAccepted ? (
                    <button
                      type="button"
                      onClick={() => onRemove(contract)}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      Added
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onAccept(contract)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                      >
                        <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDismissed((prev) => {
                            const next = new Set(prev);
                            next.add(key);
                            return next;
                          });
                        }}
                        aria-label={`Dismiss ${contract.name}`}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
