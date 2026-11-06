"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { SmsOptInLink } from "@/features/integrations/connections.service";
import { connectionsService } from "@/features/integrations/connections.service";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

/**
 * Mint a one-time SMS opt-in link for a wallet. SMS marketing needs prior
 * consent, so a wallet is only reachable once the person texts this link's token
 * back to your number. Share the `sms:` link (or the number + message) with the
 * contact; the inbound webhook binds them when it arrives. The link expires.
 */
export function SmsOptInCard() {
  const { organizationId } = useAccountOrg();
  const [wallet, setWallet] = useState("");
  const [link, setLink] = useState<SmsOptInLink | null>(null);

  const mint = useMutation({
    mutationFn: (walletAddress: string) =>
      connectionsService.smsOptInLink(
        walletAddress,
        organizationId ?? undefined
      ),
    onSuccess: (result) => setLink(result),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't create the link."),
  });

  const trimmed = wallet.trim();
  const minutes = link ? Math.round(link.expiresInSeconds / 60) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Opt in a wallet</h3>
        <p className="text-xs text-muted-foreground">
          Generate a link for a contact to text back. They become reachable on
          SMS only after they send it, so you have their consent on record.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sms-optin-wallet">Wallet address</Label>
        <div className="flex items-center gap-2">
          <Input
            id="sms-optin-wallet"
            placeholder="0x…"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
          />
          <Button
            type="button"
            disabled={trimmed.length === 0 || mint.isPending}
            onClick={() => mint.mutate(trimmed)}
          >
            {mint.isPending ? "Creating…" : "Create link"}
          </Button>
        </div>
      </div>

      {link ? (
        <div className="space-y-2 border-t border-border pt-3">
          <Row label="Opt-in link" value={link.url} />
          <Row label="Or text this to" value={link.smsNumber} />
          <Row label="Message" value={link.body} />
          <p className="text-xs text-muted-foreground">
            Expires in {minutes} minute{minutes === 1 ? "" : "s"}. One use.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
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
