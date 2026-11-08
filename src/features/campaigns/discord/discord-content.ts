import { isJsonObject } from "@/lib/utils";

import type { CampaignFormData } from "../validations";

type DiscordFields = Pick<
  CampaignFormData,
  | "discordText"
  | "discordChannelId"
  | "discordDelivery"
  | "discordCrosspost"
  | "discordMention"
  | "discordMentionRoleId"
>;

/** What `channelsContent.discord` holds for this form state. */
export function discordContent(data: DiscordFields) {
  const roleId = (data.discordMentionRoleId ?? "").trim();
  return {
    text: (data.discordText ?? "").trim(),
    channelId: (data.discordChannelId ?? "").trim(),
    delivery: data.discordDelivery,
    crosspost: data.discordCrosspost === true,
    mention: data.discordMention,
    ...(data.discordMention === "role" && roleId
      ? { mentionRoleId: roleId }
      : {}),
  };
}

/** Form values from a saved `channelsContent.discord`, for a reopened draft. */
export function restoreDiscord(saved: unknown): Partial<DiscordFields> | null {
  if (!isJsonObject(saved)) return null;
  const out: Partial<DiscordFields> = {};
  const text = saved.text ?? saved.body;
  if (typeof text === "string") out.discordText = text;
  if (typeof saved.channelId === "string")
    out.discordChannelId = saved.channelId;
  if (saved.delivery === "dm") out.discordDelivery = "dm";
  if (saved.crosspost === true) out.discordCrosspost = true;
  if (saved.mention === "role" || saved.mention === "everyone") {
    out.discordMention = saved.mention;
  }
  if (typeof saved.mentionRoleId === "string") {
    out.discordMentionRoleId = saved.mentionRoleId;
  }
  return out;
}
