"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { projectSettingsService } from "../../project-settings.service";
import { DefinitionGrid, SettingsCard, StatusPill } from "../settings-card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Switch } from "@/shared/components/ui/switch";

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
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["project-settings", "reveal-emails"],
    queryFn: () => projectSettingsService.getProjectSettings(),
  });
  const reveal = settingsQuery.data?.revealContactEmails ?? false;
  const revealMutation = useMutation({
    mutationFn: (value: boolean) =>
      projectSettingsService.setRevealContactEmails(value),
    onSuccess: (data) => {
      queryClient.setQueryData(["project-settings", "reveal-emails"], data);
      // Reachability/display changes, so refresh the audience views.
      queryClient.invalidateQueries({ queryKey: ["audience"] });
      toast.success(
        data.revealContactEmails
          ? "Contact emails are now visible in the dashboard."
          : "Contact emails are now hidden."
      );
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't update the setting."
      ),
  });

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Contact email visibility"
        description="Show contact email addresses in the dashboard for this workspace"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Off by default: emails stay encrypted and the dashboard shows
            &quot;&mdash;&quot;, so you can message contacts without ever seeing
            who they are. Turn this on for a web2 / consented audience to reveal
            the addresses to your operators. Emails are encrypted at rest either
            way &mdash; this only controls what the dashboard displays.
          </p>
          <Switch
            checked={reveal}
            disabled={settingsQuery.isLoading || revealMutation.isPending}
            onCheckedChange={(v) => revealMutation.mutate(v)}
            aria-label="Reveal contact emails in the dashboard"
          />
        </div>
      </SettingsCard>

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
