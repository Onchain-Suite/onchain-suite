import { sendDiscordPost } from "./discord/discord-send";
import {
  sendFarcasterCampaign,
  type SendOutcome,
} from "./farcaster/farcaster-send";
import { sendTelegramChannel } from "./telegram/telegram-content";
import type { CampaignFormData } from "./validations";
import { sendXPost } from "./x/x-content";

/**
 * The send for a social broadcast (one post, cast or notification), or null
 * when the campaign isn't one. Per-person DMs never come here: they go through
 * the consent dialog (dm-send).
 */
export function socialSender(
  data: CampaignFormData
): ((campaignId: string) => Promise<SendOutcome>) | null {
  if (data.channel === "telegram") {
    return data.telegramDelivery === "channel" ? sendTelegramChannel : null;
  }
  if (data.channel === "discord") {
    return data.discordDelivery === "dm" ? null : sendDiscordPost;
  }
  if (data.channel === "x") return data.xDelivery === "dm" ? null : sendXPost;
  if (data.channel === "farcaster") {
    return (campaignId) => sendFarcasterCampaign(campaignId, data);
  }
  return null;
}
