"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type SuggestedContract } from "../../onboarding.service";
import { classify } from "../../utils/contract-input";
import { ContractSuggestionsPanel } from "../contract-suggestions";

/**
 * Step 4 - the contract. Two ways in, both optional and neither blocking: paste a specific
 * address / explorer link / website / ABI (classified locally), or let us suggest the contracts
 * for this project (`POST /onboarding/suggest-contracts`) and confirm which are yours. Nothing is
 * indexed here; indexing starts once the plan is active, so Continue is a skip when nothing is
 * given.
 */
export function StepContract({
  value,
  onChange,
  picked,
  onAccept,
  onRemove,
  projectName,
  sector,
}: {
  value: string;
  onChange: (v: string) => void;
  picked: SuggestedContract[];
  onAccept: (c: SuggestedContract) => void;
  onRemove: (c: SuggestedContract) => void;
  projectName: string;
  sector: string;
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
          placeholder="0x… · basescan.org/address/… · acme.xyz · ABI"
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

      {/* Or let us find them from the project name + sector. The panel self-hides until both are
          present and when the backend returns nothing, so it never shows an empty state. */}
      <div className="mt-6">
        <ContractSuggestionsPanel
          protocolName={projectName}
          sector={sector}
          accepted={picked}
          onAccept={onAccept}
          onRemove={onRemove}
        />
      </div>
    </>
  );
}
