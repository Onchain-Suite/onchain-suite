"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { campaignsService } from "../campaigns.service";
import type { CampaignFormData } from "../validations";
import { DmConsentDialog } from "./dm-consent-dialog";
import type { DmChannel } from "./dm-send.service";

/**
 * The DM channel a campaign sends on, or null for a post / email / other send.
 * Telegram is always a DM; X and Discord only when the composer chose "DM".
 */
export function dmChannelFor(
  data: Pick<
    CampaignFormData,
    "channel" | "xDelivery" | "discordDelivery" | "telegramDelivery"
  >
): DmChannel | null {
  if (data.channel === "telegram") {
    return data.telegramDelivery === "channel" ? null : "telegram";
  }
  if (data.channel === "x" && data.xDelivery === "dm") return "x";
  if (data.channel === "discord" && data.discordDelivery === "dm") {
    return "discord";
  }
  return null;
}

/**
 * Opens the consent dialog for a DM send and handles what follows a queued
 * send. `open` saves the message first (`prepare`) and enables the channel, so
 * the preflight checks what will actually be sent. Returns `open` and the
 * dialog to render once.
 */
export function useDmSend(onQueued: () => void) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<{
    campaignId: string;
    channel: DmChannel;
  } | null>(null);

  const open = useCallback(
    async (
      campaignId: string,
      channel: DmChannel,
      prepare?: () => Promise<void>
    ) => {
      try {
        await prepare?.();
        await campaignsService
          .ensureChannels(campaignId, [channel])
          .catch(() => undefined);
        setTarget({ campaignId, channel });
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Couldn't save the message."
        );
      }
    },
    []
  );

  const dialog = (
    <DmConsentDialog
      open={target !== null}
      campaignId={target?.campaignId ?? null}
      channel={target?.channel ?? null}
      onOpenChange={(v) => {
        if (!v) setTarget(null);
      }}
      onQueued={() => {
        queryClient
          .invalidateQueries({ queryKey: ["campaigns"] })
          .catch(() => undefined);
        toast.success(
          "DM send queued. It goes out in the background at the platform's pace, so you can leave this page."
        );
        onQueued();
      }}
    />
  );

  return { open, dialog };
}
