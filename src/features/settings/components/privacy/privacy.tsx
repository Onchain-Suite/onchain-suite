"use client";

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

/**
 * Privacy & Identity settings - how wallets link to email/socials, how the
 * links are stored/retained, and what wallets consent to. These map to product
 * invariants (wallet-first, ZK-verified, GDPR-aligned).
 *
 * There is no read/write API for these policies yet, so the cards are honest
 * static descriptors of how the platform handles wallet&#8596;identity links,
 * not per-org telemetry. When a policy API lands, these become live + editable.
 */
const RETENTION_LABEL = "Until opt-out";

const CONSENT_COPY = `By linking your wallet you agree that OnchainSuite may associate this wallet address with the contact channels you verify (email, X, Farcaster) so the projects you opt into can message you.

The link is stored off-chain and encrypted. Your wallet address is treated as personal data. You can withdraw consent at any time - a self-serve unsubscribe purges the link and stops all messaging on the affected channels.`;

export default function PrivacyIdentitySettings() {
  const [consentOpen, setConsentOpen] = useState(false);

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
              label: "Link verification",
              value: (
                <span className="flex flex-wrap items-center gap-2">
                  Zero-knowledge proof of opt-in
                  <StatusPill tone="success">ZK-verified</StatusPill>
                </span>
              ),
            },
            {
              label: "Raw identity exposure",
              value:
                "Never - message a wallet without seeing the underlying identity",
            },
          ]}
        />
      </SettingsCard>

      <SettingsCard
        title="Data & retention"
        description="GDPR-aligned handling of wallet&#8596;email links"
      >
        <DefinitionGrid
          items={[
            {
              label: "Link storage",
              value: "Off-chain, encrypted · deletable on request",
            },
            { label: "Retention window", value: RETENTION_LABEL },
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
        <p className="mt-4 text-xs text-muted-foreground">
          These policies are managed by the platform and aren&apos;t
          configurable in-app yet.
        </p>
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
