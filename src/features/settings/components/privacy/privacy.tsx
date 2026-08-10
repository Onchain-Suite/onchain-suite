"use client";

import {
  CheckIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

import { DefinitionGrid, SettingsCard, StatusPill } from "../settings-card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/**
 * Privacy & Identity settings - how wallets link to email/socials, how the
 * links are stored/retained, and what wallets consent to. These map to product
 * invariants (wallet-first, ZK-verified, GDPR-aligned) that don't yet have a
 * write API, so the retention control is local state pending the backend.
 */
const RETENTION_OPTIONS = [
  { value: "until-opt-out", label: "Until opt-out" },
  { value: "12-months", label: "12 months" },
  { value: "24-months", label: "24 months" },
  { value: "36-months", label: "36 months" },
] as const;

const CONSENT_COPY = `By linking your wallet you agree that OnchainSuite may associate this wallet address with the contact channels you verify (email, X, Farcaster) so the projects you opt into can message you.

The link is stored off-chain and encrypted. Your wallet address is treated as personal data. You can withdraw consent at any time - a self-serve unsubscribe purges the link and stops all messaging on the affected channels.`;

export default function PrivacyIdentitySettings() {
  const [editingRetention, setEditingRetention] = useState(false);
  const [retention, setRetention] =
    useState<(typeof RETENTION_OPTIONS)[number]["value"]>("until-opt-out");
  const [draftRetention, setDraftRetention] = useState(retention);
  const [consentOpen, setConsentOpen] = useState(false);

  const retentionLabel =
    RETENTION_OPTIONS.find((o) => o.value === retention)?.label ??
    "Until opt-out";

  const startEdit = () => {
    setDraftRetention(retention);
    setEditingRetention(true);
  };
  const saveEdit = () => {
    setRetention(draftRetention);
    setEditingRetention(false);
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Zero-knowledge identity"
        description="How wallets link to email and socials"
        action={<StatusPill tone="success">Active</StatusPill>}
      >
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Wallet&#8596;identity links are captured with explicit opt-in and
          verified with zero-knowledge proofs. You can message a wallet without
          ever seeing the proof&apos;s underlying identity, and the raw link is
          never exposed to other tools.
        </p>
        <DefinitionGrid
          className="mt-6"
          items={[
            {
              label: "Verified links",
              value: (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold tabular-nums">
                    128,540
                  </span>
                  <StatusPill tone="success">ZK-verified</StatusPill>
                </span>
              ),
            },
            {
              label: "Proof method",
              value: (
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  Groth16 · off-chain link store
                </code>
              ),
            },
          ]}
        />
      </SettingsCard>

      <SettingsCard
        title="Data & retention"
        description="GDPR-aligned handling of wallet&#8596;email links"
        action={
          editingRetention ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingRetention(false)}
            >
              <XMarkIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Cancel
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <PencilSquareIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          )
        }
      >
        {editingRetention ? (
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Retention window
              </label>
              <Select
                value={draftRetention}
                onValueChange={(v) =>
                  setDraftRetention(
                    v as (typeof RETENTION_OPTIONS)[number]["value"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETENTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingRetention(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit}>
                <CheckIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
                Save changes
              </Button>
            </div>
          </div>
        ) : (
          <DefinitionGrid
            items={[
              {
                label: "Link storage",
                value: "Off-chain, encrypted · deletable on request",
              },
              { label: "Retention window", value: retentionLabel },
              {
                label: "Wallet addresses = personal data",
                value: (
                  <span className="flex flex-wrap items-center gap-2">
                    Treated as PII
                    <StatusPill tone="success">Compliant</StatusPill>
                  </span>
                ),
              },
              {
                label: "Right to erasure",
                value: "Self-serve unsubscribe purges the link",
              },
            ]}
          />
        )}
      </SettingsCard>

      <SettingsCard
        title="Consent"
        description="What wallets agree to when they link"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConsentOpen(true)}
          >
            View consent copy
          </Button>
        }
      >
        <DefinitionGrid
          items={[
            {
              label: "Opt-in required",
              value: "Yes - no link without explicit consent",
            },
            { label: "Channels covered", value: "Email, X, Farcaster" },
          ]}
        />
      </SettingsCard>

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Consent copy</DialogTitle>
            <DialogDescription>
              Shown to a wallet the first time it links a contact channel.
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-line rounded-xl border border-border/60 bg-muted/30 p-4 text-sm leading-6 text-foreground">
            {CONSENT_COPY}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
