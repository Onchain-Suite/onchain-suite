"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface OptInLinkRow {
  label: string;
  value: string;
}

interface OptInLinkCardProps<T extends { expiresInSeconds: number }> {
  /** DOM id for the wallet input (unique per channel). */
  inputId: string;
  /** One or two sentences: what the contact does with the link. */
  description: string;
  /** Mint a one-time opt-in link for a wallet. */
  mint: (walletAddress: string) => Promise<T>;
  /** The copyable rows to show for a minted link. */
  rows: (link: T) => OptInLinkRow[];
}

/**
 * Mint a one-time opt-in link for a wallet on a per-recipient channel (SMS,
 * WhatsApp). Marketing on these channels needs prior consent, so a wallet is only
 * reachable once the contact sends the link's token back; the inbound webhook
 * binds their number then. Each channel card is a thin wrapper around this so the
 * one subtle rule below lives in exactly one place.
 */
export function OptInLinkCard<T extends { expiresInSeconds: number }>({
  inputId,
  description,
  mint,
  rows,
}: OptInLinkCardProps<T>) {
  const [wallet, setWallet] = useState("");
  const [link, setLink] = useState<(T & { walletAddress: string }) | null>(
    null
  );

  const mutation = useMutation({
    mutationFn: mint,
    // Remember which wallet the link was minted for: its token binds whoever
    // sends it to THAT wallet.
    onSuccess: (result, walletAddress) => setLink({ ...result, walletAddress }),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't create the link."),
  });

  const trimmed = wallet.trim();
  // Only ever show a link for the wallet currently in the field. The token binds
  // the sender to the wallet it was minted for, so an older wallet's link (left
  // over after an edit, or from a request that resolved late) would let an
  // operator send a contact a link that binds them to the wrong wallet.
  const current = link?.walletAddress === trimmed ? link : null;
  const minutes = current ? Math.round(current.expiresInSeconds / 60) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Opt in a wallet</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={inputId}>Wallet address</Label>
        <div className="flex items-center gap-2">
          <Input
            id={inputId}
            placeholder="0x…"
            value={wallet}
            onChange={(e) => {
              setWallet(e.target.value);
              setLink(null);
            }}
          />
          <Button
            type="button"
            disabled={trimmed.length === 0 || mutation.isPending}
            onClick={() => mutation.mutate(trimmed)}
          >
            {mutation.isPending ? "Creating…" : "Create link"}
          </Button>
        </div>
      </div>

      {current ? (
        <div className="space-y-2 border-t border-border pt-3">
          <Row label="For wallet" value={current.walletAddress} />
          {rows(current).map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
          <p className="text-xs text-muted-foreground">
            Expires in {minutes} minute{minutes === 1 ? "" : "s"}. One use.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: OptInLinkRow) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1.5">
        <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs text-foreground">
          {value}
        </code>
        <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
    </div>
  );
}
