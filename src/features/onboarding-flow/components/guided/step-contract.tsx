"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/20/solid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  type ContractDraft,
  type OnboardingContract,
} from "../../constants/guided";
import { SUPPORTED_CHAINS } from "../../data/chains";
import { type SuggestedContract } from "../../onboarding.service";
import { classify } from "../../utils/contract-input";
import { ContractSuggestionsPanel } from "../contract-suggestions";
import { ChainLogo } from "@/onchain-suite-website/components/landing/v2/chain-logos";

/** Light, local read of a single address row, just to reassure or nudge. Nothing is fetched. */
function rowHint(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return "";
  const { form } = classify(trimmed);
  if (form === "address") return "Looks like an address.";
  if (form === "ens") return "Looks like an ENS name; we resolve it.";
  return "Paste the contract address (0x…).";
}

/**
 * Step 4 - the contracts. Add as many as you track, each with its chain. Optional and
 * non-blocking: nothing is indexed here (indexing starts once the plan is active), so Continue is
 * a skip when the list is empty. The suggestion panel can fill rows from the project name + sector.
 */
export function StepContract({
  contracts,
  onAdd,
  onUpdate,
  onRemove,
  picked,
  onAcceptSuggestion,
  onRemoveSuggestion,
  projectName,
  sector,
}: {
  contracts: ContractDraft[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<OnboardingContract>) => void;
  onRemove: (index: number) => void;
  picked: SuggestedContract[];
  onAcceptSuggestion: (c: SuggestedContract) => void;
  onRemoveSuggestion: (c: SuggestedContract) => void;
  projectName: string;
  sector: string;
}) {
  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Add your smart contracts
      </h1>
      <p className="text-muted-foreground mt-3">
        Add the contracts you want to track, each with its chain. You can add
        more than one. Indexing starts once your plan is active.
      </p>

      <div className="mt-8 space-y-3">
        {contracts.map((c, i) => (
          <div key={c.id} className="space-y-1">
            <div className="flex items-start gap-2">
              <Select
                value={c.chain}
                onValueChange={(v) => onUpdate(i, { chain: v })}
              >
                <SelectTrigger className="w-40 shrink-0" aria-label="Chain">
                  <SelectValue placeholder="Chain" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CHAINS.map((chain) => (
                    <SelectItem key={chain.key} value={chain.key}>
                      <span className="flex items-center gap-2">
                        {chain.logo ? (
                          <ChainLogo chain={chain.logo} size={15} />
                        ) : (
                          <span className="bg-muted-foreground/30 h-3.5 w-3.5 rounded-full" />
                        )}
                        {chain.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                autoComplete="off"
                spellCheck={false}
                value={c.address}
                onChange={(e) => onUpdate(i, { address: e.target.value })}
                placeholder="0x…"
                className="flex-1 font-mono"
                aria-label={`Contract address ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(i)}
                aria-label="Remove contract"
              >
                <XMarkIcon aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
            {rowHint(c.address) ? (
              <p className="text-muted-foreground pl-[10.5rem] text-xs">
                {rowHint(c.address)}
              </p>
            ) : null}
          </div>
        ))}

        <Button type="button" variant="secondary" onClick={onAdd}>
          <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
          {contracts.length === 0 ? "Add a contract" : "Add another"}
        </Button>
      </div>

      {/* Or let us find them from the project name + sector. Accepting a suggestion adds a row. */}
      <div className="mt-6">
        <ContractSuggestionsPanel
          protocolName={projectName}
          sector={sector}
          accepted={picked}
          onAccept={onAcceptSuggestion}
          onRemove={onRemoveSuggestion}
        />
      </div>
    </>
  );
}
