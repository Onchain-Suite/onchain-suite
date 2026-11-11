"use client";

import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type ManualContractDraft } from "../../constants/guided";
import { useContractLookup } from "../../hooks/use-contract-lookup";
import { useSupportedChains } from "../../hooks/use-supported-chains";
import { ANY_CHAIN, OTHER_CHAIN, toAddress } from "../../utils/contract-lookup";
import { ChainRequestForm } from "./chain-request-form";
import { ContractLookupNote } from "./contract-lookup-note";
import { ContractManualEntry } from "./contract-manual-entry";
import { ObSelect } from "./ob-select";
import { ResolvedContractCard } from "./resolved-contract-card";
import { Icon } from "@/shared/components/common/hugeicon";

const EMPTY_MANUAL: ManualContractDraft = {
  name: "",
  address: "",
  chain: "",
  type: "erc20",
};

/**
 * Step 4 - the contract. The input is just an address: we look for it on every
 * chain we index, read what it is off the chain it is on, and show that. The
 * chain can be picked by hand (then only that chain is read), and a chain that
 * is not in the list can be named so we know to add it. When an address is not
 * enough, the "enter the details by hand" form takes a name and type too.
 * Indexing starts when this step is left with a contract found (see
 * use-start-indexing); with none, Continue is a skip.
 */
export function StepContract({
  value,
  onChange,
  chain,
  onChain,
  manual,
  onManual,
  chains,
}: {
  value: string;
  onChange: (v: string) => void;
  /** The chain the address was found on (backend key), or null before it is. */
  chain: string | null;
  onChain: (c: string | null) => void;
  /** The by-hand contract (orchestrator-owned so it survives step navigation). */
  manual: ManualContractDraft | null;
  onManual: (m: ManualContractDraft | null) => void;
  /** The project's chains, preferred when the address is on several. */
  chains: string[];
}) {
  const [byHand, setByHand] = useState(manual !== null);

  if (byHand) {
    return (
      <ContractManualEntry
        draft={manual ?? EMPTY_MANUAL}
        onChange={onManual}
        chains={chains}
        onBack={() => {
          onManual(null);
          setByHand(false);
        }}
      />
    );
  }

  return (
    <AddressEntry
      value={value}
      onChange={onChange}
      chain={chain}
      onChain={onChain}
      chains={chains}
      onEnterByHand={() => {
        onManual({
          ...EMPTY_MANUAL,
          address: toAddress(value) ?? "",
          chain: chain ?? chains[0] ?? "",
        });
        setByHand(true);
      }}
    />
  );
}

/** The default input: a contract address, found on whichever chain holds it. */
function AddressEntry({
  value,
  onChange,
  chain,
  onChain,
  chains,
  onEnterByHand,
}: {
  value: string;
  onChange: (v: string) => void;
  chain: string | null;
  onChain: (c: string | null) => void;
  chains: string[];
  onEnterByHand: () => void;
}) {
  const supported = useSupportedChains();
  // The chain to read; null means "look everywhere". It starts as the chain
  // already chosen for this address (found earlier, or picked by hand), so
  // coming back to this step does not look everywhere again and quietly move
  // the contract to another chain the same address is deployed on.
  const [pinned, setPinned] = useState<string | null>(chain);
  const [otherOpen, setOtherOpen] = useState(false);
  // They told us the contract is on a chain we do not index. A deployment we
  // found for the same address elsewhere is then not theirs to index.
  const [elsewhere, setElsewhere] = useState(false);

  const { state, retry } = useContractLookup({
    raw: value,
    chain: pinned,
    preferred: chains,
  });

  // The orchestrator indexes on the chain the address was FOUND on, and on
  // nothing at all while it has not been found.
  const foundChain = state.kind === "found" ? state.contract.chain : null;
  const follows = state.kind !== "looking" && !elsewhere;
  useEffect(() => {
    if (follows && foundChain !== chain) onChain(foundChain);
  }, [follows, foundChain, chain, onChain]);

  const options = useMemo(() => {
    const list = supported.map((c) => ({
      value: c.key,
      label: c.label,
      logo: c.logo,
    }));
    const shown = pinned ?? foundChain;
    if (shown && !list.some((o) => o.value === shown)) {
      const label =
        state.kind === "found" && state.contract.chain === shown
          ? state.contract.chainLabel
          : shown;
      list.unshift({ value: shown, label, logo: undefined });
    }
    return [
      { value: ANY_CHAIN, label: "Find it for me", logo: undefined },
      ...list,
      { value: OTHER_CHAIN, label: "Another chain…", logo: undefined },
    ];
  }, [supported, pinned, foundChain, state]);

  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Add your smart contract
      </h1>
      <p className="text-muted-foreground mt-3">
        Paste your contract address. We find which chain it is on, read what it
        is, and start indexing it straight away, so holders and activity are
        there when you finish.
      </p>

      <div className="mt-8 space-y-4">
        {/* Address fills the row; the chain picker is only as wide as it needs. */}
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="ob-address">Contract address</Label>
            <Input
              id="ob-address"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e) => {
                // A new address is looked for everywhere again.
                setPinned(null);
                setElsewhere(false);
                setOtherOpen(false);
                onChange(e.target.value);
              }}
              placeholder="0x…"
              className="font-mono"
              aria-invalid={state.kind === "invalid"}
              aria-describedby="ob-address-note"
            />
          </div>
          <div className="shrink-0 space-y-2">
            <Label htmlFor="ob-chain">Chain</Label>
            <ObSelect
              id="ob-chain"
              value={
                otherOpen || elsewhere
                  ? OTHER_CHAIN
                  : (pinned ?? foundChain ?? ANY_CHAIN)
              }
              onChange={(v) => {
                setOtherOpen(v === OTHER_CHAIN);
                if (v === OTHER_CHAIN) return;
                setElsewhere(false);
                setPinned(v === ANY_CHAIN ? null : v);
              }}
              options={options}
            />
          </div>
        </div>

        <div id="ob-address-note">
          {elsewhere ? null : state.kind === "found" ? (
            <ResolvedContractCard
              contract={state.contract}
              onPickChain={(ref) => setPinned(ref.chain)}
            />
          ) : (
            <ContractLookupNote
              state={state}
              chainCount={supported.length}
              onPickChain={(ref) => setPinned(ref.chain)}
              onOtherChain={() => setOtherOpen(true)}
              onRetry={retry}
            />
          )}
        </div>

        {otherOpen || elsewhere ? (
          <ChainRequestForm
            address={toAddress(value)}
            onSupported={(ref) => {
              setOtherOpen(false);
              setPinned(ref.chain);
            }}
            onRecorded={() => {
              setElsewhere(true);
              setPinned(null);
              onChain(null);
            }}
          />
        ) : null}

        {/* A clear alternative, not a buried link. */}
        <button
          type="button"
          onClick={onEnterByHand}
          className="border-border hover:border-primary/50 hover:bg-muted/40 flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors"
        >
          <span className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <Icon icon={PencilEdit02Icon} className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="text-foreground block text-sm font-medium">
              Enter the details by hand
            </span>
            <span className="text-muted-foreground block text-xs">
              Add the name, address, chain and type yourself.
            </span>
          </span>
        </button>
      </div>
    </>
  );
}
