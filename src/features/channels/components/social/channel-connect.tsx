"use client";

import type { ReactNode } from "react";

import { CHANNEL_META } from "../../data/channels";
import type { SocialChannelId } from "../../types/channel";
import { SetupGuide } from "../setup/setup-guide";
import { ConsentImportCard } from "./consent-import-card";
import { DiscordImport } from "./discord-import";
import { SmsManagedSetup } from "./sms-managed-setup";
import { SmsOptInCard } from "./sms-optin-card";
import { SmsUsRegistration } from "./sms-us-registration";
import { SmsUsageCard } from "./sms-usage-card";
import { SmsWebhook } from "./sms-webhook";
import { TelegramActivate } from "./telegram-activate";
import { WhatsAppEmbeddedSignup } from "./whatsapp-embedded-signup";
import { WhatsAppOptInCard } from "./whatsapp-optin-card";
import { WhatsAppWebhook } from "./whatsapp-webhook";
import { ConnectorPanel } from "@/features/integrations/components/connect/connector-panel";
import { CONNECTORS } from "@/features/integrations/data/connectors";

const KIND_NOTE: Record<"dm" | "post", string> = {
  dm: "A per-recipient direct message: it needs the recipient's handle or number and their opt-in, and its own template rules.",
  post: "A broadcast channel: you post once to an audience rather than messaging people one by one, so its analytics are posts, reactions and replies.",
};

/** After connecting, the one more step some channels need before they send. */
const NEXT_STEP: Partial<Record<SocialChannelId, ReactNode>> = {
  telegram: <TelegramActivate />,
  discord: <DiscordImport />,
  whatsapp: (
    <div className="space-y-6">
      <WhatsAppWebhook />
      <WhatsAppOptInCard />
      <ConsentImportCard channel="whatsapp" />
    </div>
  ),
  sms: (
    <div className="space-y-6">
      <SmsUsRegistration />
      <SmsUsageCard />
      <SmsWebhook />
      <SmsOptInCard />
      <ConsentImportCard channel="sms" />
    </div>
  ),
};

/** Before connecting: another way to get connected than pasting credentials. */
const ALTERNATIVE: Partial<Record<SocialChannelId, ReactNode>> = {
  sms: <SmsManagedSetup />,
  whatsapp: <WhatsAppEmbeddedSignup />,
};

/**
 * Connect a social channel with your own account (bot, business number,
 * signer or token). The server verifies it with the platform before saving;
 * secrets are never shown again.
 */
export function ChannelConnect({
  channel,
  connected = false,
}: {
  channel: SocialChannelId;
  /** The platform has accepted the credential: the steps are behind them. */
  connected?: boolean;
}) {
  const meta = CHANNEL_META[channel];
  const def = CONNECTORS.get(channel);
  const next = NEXT_STEP[channel];

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">
        {meta.kind === "dm" ? KIND_NOTE.dm : KIND_NOTE.post}
      </p>
      {connected ? null : <SetupGuide channel={channel} />}
      {ALTERNATIVE[channel] ?? null}
      {def ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <ConnectorPanel def={def}>
            {next ? () => next : undefined}
          </ConnectorPanel>
        </div>
      ) : null}
    </div>
  );
}
