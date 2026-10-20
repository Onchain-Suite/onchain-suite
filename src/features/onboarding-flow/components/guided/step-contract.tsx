"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type SuggestedContract } from "../../onboarding.service";
import { classify } from "../../utils/contract-input";
import { ContractSuggestionsPanel } from "../contract-suggestions";

/**
 * Step 4 - the contract (zip layout: one "paste anything" box). An address, an explorer link, the
 * website or an ABI: the classifier reads what it is locally, the suggestion panel finds the
 * project's contracts from its name + chains, and you confirm which to track. Nothing is indexed
 * here; indexing starts once the plan is active, so Continue is a skip when nothing is given.
 */
export function StepContract({
  value,
  onChange,
  picked,
  onAcceptSuggestion,
  onRemoveSuggestion,
  projectName,
  sector,
  chains,
}: {
  value: string;
  onChange: (v: string) => void;
  picked: SuggestedContract[];
  onAcceptSuggestion: (c: SuggestedContract) => void;
  onRemoveSuggestion: (c: SuggestedContract) => void;
  projectName: string;
  sector: string;
  chains: string[];
}) {
  const guess = classify(value);
  const recognised = guess.form !== "empty" && guess.form !== "unknown";
  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Add your smart contract
      </h1>
      <p className="text-muted-foreground mt-3">
        An address, an explorer link, your website or the ABI. We find the
        contract and its events, and you confirm which to track. Indexing starts
        once your plan is active.
      </p>

      <div className="mt-8 space-y-2">
        <Label htmlFor="ob-resolve">Paste anything</Label>
        <Input
          id="ob-resolve"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0x… · basescan.org/address/… · yourproject.xyz · ABI"
          className="font-mono"
          aria-describedby="ob-resolve-hint"
        />
        <p
          id="ob-resolve-hint"
          className={`text-sm ${recognised ? "text-foreground" : "text-muted-foreground"}`}
        >
          {guess.form === "empty" ? (
            "We work out what it is as you paste. Nothing is fetched until your plan is active."
          ) : guess.form === "unknown" ? (
            guess.next
          ) : (
            <>
              <b>{guess.label}</b>
              {guess.chain ? ` on ${guess.chain}` : ""}. {guess.next}
            </>
          )}
        </p>
      </div>

      {/* Or let us find them from the project name + chains. The panel self-hides until there is
          something to show. Accepting a suggestion adds it to the list to index. */}
      <div className="mt-6">
        <ContractSuggestionsPanel
          protocolName={projectName}
          sector={sector}
          chains={chains}
          accepted={picked}
          onAccept={onAcceptSuggestion}
          onRemove={onRemoveSuggestion}
        />
      </div>
    </>
  );
}
