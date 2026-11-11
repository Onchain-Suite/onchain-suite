"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type ManualContractDraft } from "../../constants/guided";
import { DEFAULT_CHAIN } from "../../data/chains";
import { useSupportedChains } from "../../hooks/use-supported-chains";
import { EVM_ADDRESS_RE } from "../../utils/contract-lookup";
import { ObSelect } from "./ob-select";
import { Icon } from "@/shared/components/common/hugeicon";

/** Contract types offered in the by-hand form (maps loosely to the resolver's standards). */
const CONTRACT_TYPES: { value: string; label: string }[] = [
  { value: "erc20", label: "ERC-20 token" },
  { value: "erc721", label: "ERC-721 NFT" },
  { value: "erc1155", label: "ERC-1155 NFT" },
  { value: "other", label: "Other contract" },
];

/** Every chain we index, with the project's chosen chains first. */
function useChainOptions(chains: string[]) {
  const supported = useSupportedChains();
  return useMemo(
    () =>
      [
        ...supported.filter((c) => chains.includes(c.key)),
        ...supported.filter((c) => !chains.includes(c.key)),
      ].map((c) => ({ value: c.key, label: c.label, logo: c.logo })),
    [supported, chains]
  );
}

/** The by-hand fallback: name, address, chain and type, for full control over the contract. */
export function ContractManualEntry({
  draft,
  onChange,
  chains,
  onBack,
}: {
  draft: ManualContractDraft;
  onChange: (m: ManualContractDraft) => void;
  chains: string[];
  onBack: () => void;
}) {
  const chainOptions = useChainOptions(chains);
  const set = (patch: Partial<ManualContractDraft>) =>
    onChange({ ...draft, ...patch });

  // The picker cannot show "no chain", so a draft without one is given the
  // chain it is showing. Otherwise the form displayed one chain while the
  // contract was indexed on another.
  const [first] = chainOptions;
  const ethereum = chainOptions.find((o) => o.value === DEFAULT_CHAIN);
  // The project's own chain leads the list when there is one; otherwise
  // Ethereum, not whichever chain the catalog happens to list first.
  const fallback =
    (chains.length > 0 ? first : (ethereum ?? first))?.value ?? DEFAULT_CHAIN;
  const shown = draft.chain.length > 0 ? draft.chain : fallback;
  useEffect(() => {
    if (!draft.chain) onChange({ ...draft, chain: shown });
  }, [draft, shown, onChange]);
  const addressValid =
    draft.address.trim() === "" || EVM_ADDRESS_RE.test(draft.address.trim());

  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Add your smart contract
      </h1>
      <p className="text-muted-foreground mt-3">
        Enter the contract details yourself. We start indexing holders and
        activity from this address when you continue.
      </p>

      <div className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ob-name">Contract name</Label>
          <Input
            id="ob-name"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Acme Packs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-m-address">Contract address</Label>
          <Input
            id="ob-m-address"
            value={draft.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="0x…"
            className="font-mono"
            aria-invalid={!addressValid}
            aria-describedby="ob-m-address-hint"
          />
          {!addressValid ? (
            <p id="ob-m-address-hint" className="text-destructive text-xs">
              Enter a valid address (0x followed by 40 hex characters).
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="space-y-2">
            <Label htmlFor="ob-m-chain">Chain</Label>
            <ObSelect
              id="ob-m-chain"
              value={shown}
              onChange={(c) => set({ chain: c })}
              options={chainOptions}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-m-type">Type</Label>
            <ObSelect
              id="ob-m-type"
              value={draft.type}
              onChange={(t) => set({ type: t })}
              options={CONTRACT_TYPES}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <Icon icon={ArrowLeft01Icon} className="size-4" />
          Back to address and chain
        </button>
      </div>
    </>
  );
}
