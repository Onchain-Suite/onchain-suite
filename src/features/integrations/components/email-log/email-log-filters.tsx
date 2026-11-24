"use client";

import { useEffect, useState } from "react";

import type { EmailEnvironment, EmailStatus } from "../../contracts/emails";
import {
  EMAIL_ENVIRONMENTS,
  EMAIL_STATUSES,
  type EmailLogFilterInput,
  emailStatusBadge,
  EMPTY_FILTERS,
  hasFilters,
} from "../../utils/email-log";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/** Radix Select cannot hold an empty value, so "any" is its own item. */
const ANY = "any";

const LABEL = "text-[11.5px] font-medium text-(--text-tertiary)";

/**
 * Status, environment, a date range and a wallet. The wallet is typed, so it
 * applies after a pause rather than on every keystroke (one request per
 * thought, not per character).
 */
export function EmailLogFilters({
  value,
  onChange,
}: {
  value: EmailLogFilterInput;
  onChange: (next: EmailLogFilterInput) => void;
}) {
  const [wallet, setWallet] = useState(value.wallet);

  // Follow a reset from outside ("Clear filters").
  useEffect(() => setWallet(value.wallet), [value.wallet]);

  useEffect(() => {
    if (wallet === value.wallet) return;
    const t = setTimeout(() => onChange({ ...value, wallet }), 400);
    return () => clearTimeout(t);
  }, [wallet, value, onChange]);

  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-end gap-2.5">
      <label className="flex flex-col gap-1">
        <span className={LABEL}>Status</span>
        <Select
          value={value.status || ANY}
          onValueChange={(v) =>
            onChange({ ...value, status: v === ANY ? "" : (v as EmailStatus) })
          }
        >
          <SelectTrigger className="h-8 w-40 text-xs" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any status</SelectItem>
            {EMAIL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {emailStatusBadge(s).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={LABEL}>Environment</span>
        <Select
          value={value.environment || ANY}
          onValueChange={(v) =>
            onChange({
              ...value,
              environment: v === ANY ? "" : (v as EmailEnvironment),
            })
          }
        >
          <SelectTrigger className="h-8 w-32 text-xs" aria-label="Environment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Live and test</SelectItem>
            {EMAIL_ENVIRONMENTS.map((e) => (
              <SelectItem key={e} value={e}>
                {e === "live" ? "Live" : "Test"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={LABEL}>From</span>
        <Input
          type="date"
          aria-label="Sent from"
          className="h-8 w-36 text-xs"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={LABEL}>To</span>
        <Input
          type="date"
          aria-label="Sent until"
          className="h-8 w-36 text-xs"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </label>

      <label className="flex min-w-48 flex-1 flex-col gap-1">
        <span className={LABEL}>Wallet</span>
        <Input
          aria-label="Wallet"
          placeholder="0x… or a Solana address"
          className="h-8 font-mono text-xs"
          spellCheck={false}
          autoComplete="off"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
        />
      </label>

      {hasFilters(value) ? (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
