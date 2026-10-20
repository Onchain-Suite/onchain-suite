"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { classify } from "../../utils/contract-input";

/**
 * The contract. One box that takes whatever is on the clipboard - an address, an explorer link,
 * the website or a pasted ABI - and says what it recognised. Indexing starts once the plan is
 * active, so nothing is fetched here and Continue is a skip when the box is empty.
 *
 * Interim: this captures and classifies a single input locally. The full resolver that asks the
 * indexer and lets the user confirm several contracts is a later stage.
 */
export function StepContract({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
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
    </>
  );
}
