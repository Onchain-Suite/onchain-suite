"use client";

import type { ReactNode } from "react";

import { CHANNEL_META } from "../../data/channels";
import type { SocialChannelId } from "../../types/channel";
import { DiscordImport } from "./discord-import";
import { TelegramActivate } from "./telegram-activate";
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
  whatsapp: <WhatsAppWebhook />,
};

/**
 * Connect a social channel with your own account (bot, business number,
 * signer or token). The server verifies it with the platform before saving;
 * secrets are never shown again.
 */
export function ChannelConnect({ channel }: { channel: SocialChannelId }) {
  const meta = CHANNEL_META[channel];
  const def = CONNECTORS.get(channel);
  const next = NEXT_STEP[channel];

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-xs text-muted-foreground">
        {meta.kind === "dm" ? KIND_NOTE.dm : KIND_NOTE.post}
      </p>
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
