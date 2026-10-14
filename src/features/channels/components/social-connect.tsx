"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { CHANNEL_META } from "../data/channels";
import type { SocialChannelId } from "../types/channel";

/** The social channels that don't yet have their own panel (X has one). Their
 *  send backends are net-new, so connect is a forward-looking stub for now. */
type PendingSocialId = Exclude<SocialChannelId, "x">;

const KIND_NOTE: Record<"dm" | "post", string> = {
  dm: "A per-recipient direct message: it needs the recipient's handle or number and their opt-in, and its own template rules.",
  post: "A broadcast channel: you post once to an audience rather than messaging people one by one, so its analytics are posts, reactions and replies.",
};

const OWN_ACCOUNT: Record<PendingSocialId, string> = {
  whatsapp: "WhatsApp Business account",
  telegram: "Telegram bot",
  discord: "Discord server or webhook",
  farcaster: "Farcaster account",
};

export function SocialConnect({ channel }: { channel: PendingSocialId }) {
  const meta = CHANNEL_META[channel];
  const kindNote = meta.kind === "dm" ? KIND_NOTE.dm : KIND_NOTE.post;

  return (
    <div className="space-y-4">
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        {meta.setup}
      </p>
      <p className="max-w-xl text-xs text-muted-foreground">{kindNote}</p>

      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4">
        <p className="text-sm font-medium text-foreground">
          Connect {meta.label}
        </p>
        <p className="mt-1 max-w-xl text-xs text-muted-foreground">
          Already run a {OWN_ACCOUNT[channel]}? You&apos;ll link it here so
          OnchainSuite sends through your own account. The connector is in
          progress.
        </p>
        <Button
          className="mt-3"
          size="sm"
          onClick={() =>
            toast.message(`${meta.label} connection is coming soon.`)
          }
        >
          Connect {meta.label}
        </Button>
      </div>
    </div>
  );
}
