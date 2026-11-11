"use client";

import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useContractLookup } from "../../hooks/use-contract-lookup";
import { useSupportedChains } from "../../hooks/use-supported-chains";
import { classify } from "../../utils/contract-input";
import {
  ANY_CHAIN,
  isElsewhere,
  markElsewhere,
  OTHER_CHAIN,
  toAddress,
} from "../../utils/contract-lookup";
import { ChainRequestForm } from "./chain-request-form";
import { ContractLookupNote } from "./contract-lookup-note";
import { ObSelect } from "./ob-select";

/**
 * The contract on the project step: an address, and the chain it is on.
 *
 * The address comes first because it is the thing people have. Once it is a
 * valid one we look for it on every chain we index and set the chain for them,
 * so nobody has to know our name for their chain. They can still pick the
 * chain by hand (then only that chain is read), and if theirs is not in the
 * list, "Another chain" lets them say which.
 */
export function ProjectContractField({
  contract,
  chain,
  onContract,
  onChain,
  onKeyDown,
}: {
  contract: string;
  /** The chosen chain's backend key, if any. */
  chain: string | undefined;
  /**
   * The address changed. `clearChain` is set when it is a different address:
   * the chain goes with it in the same update.
   */
  onContract: (value: string, opts: { clearChain: boolean }) => void;
  /** Null clears it: the address turned out to be on no chain we index. */
  onChain: (chain: string | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const supported = useSupportedChains();
  // True once the chain is settled for this address (picked by hand, or found
  // earlier); cleared by a new address. It starts true when a chain is already
  // set, so coming back to this step does not look everywhere again and
  // quietly move the contract to another chain it is deployed on.
  const [pinned, setPinned] = useState(Boolean(chain));
  const [otherOpen, setOtherOpen] = useState(false);
  // They told us the contract is on a chain we do not index. A deployment we
  // found for the same address elsewhere is then not theirs to index.
  const [elsewhere, setElsewhere] = useState(() => isElsewhere(contract));

  const guess = classify(contract);
  const isAddress = guess.form === "address";
  const { state, retry } = useContractLookup({
    raw: isAddress ? contract : "",
    chain: pinned && chain ? chain : null,
  });

  // The chain follows the address: adopt the one it was found on, and drop a
  // chain left over from an earlier address once this one is found nowhere.
  // A chain picked by hand is theirs, and anything that is not an address
  // (a website, an ENS name) has no lookup to follow.
  const foundChain = state.kind === "found" ? state.contract.chain : null;
  const follows =
    isAddress && !pinned && !elsewhere && state.kind !== "looking";
  useEffect(() => {
    if (follows && foundChain !== (chain ?? null)) onChain(foundChain);
  }, [follows, foundChain, chain, onChain]);

  const options = useMemo(() => {
    const list = supported.map((c) => ({
      value: c.key,
      label: c.label,
      logo: c.logo,
    }));
    // A chain the lookup found, or one saved earlier, that the list lacks.
    if (chain && !list.some((o) => o.value === chain)) {
      const label =
        state.kind === "found" && state.contract.chain === chain
          ? state.contract.chainLabel
          : chain;
      list.unshift({ value: chain, label, logo: undefined });
    }
    return [
      { value: ANY_CHAIN, label: "Find it for me", logo: undefined },
      ...list,
      { value: OTHER_CHAIN, label: "Another chain…", logo: undefined },
    ];
  }, [supported, chain, state]);

  return (
    <div className="space-y-2">
      <Label htmlFor="ob-contract">
        Contract address{" "}
        <span className="text-muted-foreground font-normal">Optional</span>
      </Label>
      <div className="flex items-start gap-2">
        <Input
          id="ob-contract"
          autoComplete="off"
          spellCheck={false}
          value={contract}
          onChange={(e) => {
            // A new address is looked for everywhere again.
            const next = e.target.value;
            // A different address has no chain until it has been looked up:
            // the old one's chain is dropped now, not when the lookup lands,
            // so it cannot be indexed there in between.
            const moved = toAddress(next) !== toAddress(contract);
            if (moved) setPinned(false);
            setElsewhere(false);
            markElsewhere(null);
            setOtherOpen(false);
            // One update, so the cleared chain and the new address land
            // together and neither overwrites the other.
            onContract(next, { clearChain: moved });
          }}
          onKeyDown={onKeyDown}
          placeholder="0x…"
          className="flex-1 font-mono"
          aria-describedby="ob-contract-hint"
        />
        <ObSelect
          aria-label="Chain"
          value={otherOpen || elsewhere ? OTHER_CHAIN : (chain ?? ANY_CHAIN)}
          onChange={(v) => {
            setOtherOpen(v === OTHER_CHAIN);
            if (v === OTHER_CHAIN) return;
            setElsewhere(false);
            markElsewhere(null);
            if (v === ANY_CHAIN) {
              setPinned(false);
              onChain(null);
              return;
            }
            setPinned(true);
            onChain(v);
          }}
          options={options}
        />
      </div>

      <div id="ob-contract-hint">
        {elsewhere ? null : isAddress ? (
          <ContractLookupNote
            state={state}
            chainCount={supported.length}
            onPickChain={(ref) => {
              setPinned(true);
              onChain(ref.chain);
            }}
            onOtherChain={() => setOtherOpen(true)}
            onRetry={retry}
          />
        ) : (
          <p className="text-muted-foreground text-xs">
            {guess.form === "empty" || guess.form === "unknown" ? (
              "Paste the address and we find which chain it is on. If you have none, we look for it from the website."
            ) : (
              <>
                <b className="text-foreground">{guess.label}.</b> Indexed first.
              </>
            )}
          </p>
        )}
      </div>

      {otherOpen || elsewhere ? (
        <ChainRequestForm
          address={toAddress(contract)}
          onSupported={(ref) => {
            // It is a chain we index after all: whatever was said before
            // about it being elsewhere no longer holds.
            setElsewhere(false);
            markElsewhere(null);
            setOtherOpen(false);
            setPinned(true);
            onChain(ref.chain);
          }}
          onRecorded={() => {
            setElsewhere(true);
            markElsewhere(toAddress(contract));
            setPinned(false);
            onChain(null);
          }}
        />
      ) : null}
    </div>
  );
}
