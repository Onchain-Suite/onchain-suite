"use client";

import { useState } from "react";

import {
  bpsToPercent,
  percentToBps,
} from "@/features/settings/utils/project-value";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export const FEE_RATE_HELP =
  "Share of each transfer to this contract that the project keeps. A mint keeps 100%, a 0.3% swap pool keeps 0.3. Leave empty if it earns the project nothing.";

/**
 * Percent input for a contract's fee rate. People think in percent, the API
 * stores integer basis points; the conversion and its validation live in
 * `percentToBps` so this only renders.
 */
export function FeeRateInput({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Fee rate (optional)"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-help`}
          className="pr-8"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          %
        </span>
      </div>
      <p
        id={`${id}-help`}
        className={
          error ? "text-xs text-destructive" : "text-xs text-muted-foreground"
        }
      >
        {error ?? FEE_RATE_HELP}
      </p>
    </div>
  );
}

/**
 * The fee rate on a saved contract row: a read-only chip until "Edit", then an
 * inline input. Saving sends integer bps, or `undefined` to clear it.
 */
export function ContractFeeRate({
  feeBps,
  rowId,
  saving,
  onSave,
}: {
  feeBps?: number;
  rowId: string;
  saving: boolean;
  onSave: (next: number | undefined) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(bpsToPercent(feeBps));
          setError(undefined);
          setEditing(true);
        }}
        className="mt-1 rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        {feeBps === undefined
          ? "Set fee rate"
          : `Fee rate ${bpsToPercent(feeBps)}%`}
      </button>
    );
  }

  const submit = async () => {
    const parsed = percentToBps(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    try {
      await onSave(parsed.feeBps);
      setEditing(false);
    } catch {
      // The mutation's onError toasts; keep the editor open to retry.
    }
  };

  return (
    <form
      className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        submit().catch(() => undefined);
      }}
    >
      <div className="sm:w-80">
        <FeeRateInput
          id={`fee-${rowId}`}
          value={draft}
          onChange={(next) => {
            setDraft(next);
            setError(undefined);
          }}
          error={error}
        />
      </div>
      <div className="flex gap-1">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
