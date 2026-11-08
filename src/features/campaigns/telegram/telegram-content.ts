import { isJsonObject } from "@/lib/utils";

import { campaignsService } from "../campaigns.service";
import { request } from "../dm-send/dm-send.service";
import type { SendOutcome } from "../farcaster/farcaster-send";
import type { CampaignFormData } from "../validations";

type TelegramFields = Pick<
  CampaignFormData,
  "telegramText" | "telegramDelivery" | "telegramChannel"
>;

/** What `channelsContent.telegram` holds for this form state. */
export function telegramContent(data: TelegramFields) {
  return {
    text: (data.telegramText ?? "").trim(),
    delivery: data.telegramDelivery,
    ...(data.telegramDelivery === "channel"
      ? { channel: (data.telegramChannel ?? "").trim() }
      : {}),
  };
}

/** Form values from a saved `channelsContent.telegram`, for a reopened draft. */
export function restoreTelegram(
  saved: unknown
): Partial<TelegramFields> | null {
  if (!isJsonObject(saved)) return null;
  const out: Partial<TelegramFields> = {};
  const text = saved.text ?? saved.body;
  if (typeof text === "string") out.telegramText = text;
  if (saved.delivery === "channel") out.telegramDelivery = "channel";
  if (typeof saved.channel === "string") out.telegramChannel = saved.channel;
  return out;
}

export interface TelegramChannelCheck {
  channel: string;
  title: string | null;
  subscribers: number | null;
  canPost: boolean;
}

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;

/** Can the bot post to this channel? (GET .../telegram/channel-check) */
export async function checkTelegramChannel(
  channel: string
): Promise<TelegramChannelCheck> {
  const raw = await request({
    method: "GET",
    url: "/organization/connections/telegram/channel-check",
    params: { channel },
  });
  const r = isJsonObject(raw) ? raw : {};
  return {
    channel: typeof r.channel === "string" ? r.channel : channel,
    title: typeof r.title === "string" ? r.title : null,
    subscribers: num(r.subscribers),
    canPost: r.canPost === true,
  };
}

/** The toast for a channel post. */
export function telegramChannelOutcome(raw: unknown): SendOutcome {
  const r = isJsonObject(raw) ? raw : {};
  const where = typeof r.channel === "string" ? r.channel : "your channel";
  if (r.alreadyPosted === true) {
    return {
      level: "warning",
      message: `This campaign was already posted to ${where}. Duplicate it to post again.`,
      done: false,
    };
  }
  const subs = num(r.subscribers);
  return {
    level: "success",
    message:
      subs !== null
        ? `Posted to ${where}, which has ${subs.toLocaleString()} subscribers.`
        : `Posted to ${where}.`,
    done: true,
  };
}

export async function sendTelegramChannel(
  campaignId: string
): Promise<SendOutcome> {
  await campaignsService
    .ensureChannels(campaignId, ["telegram"])
    .catch(() => undefined);
  return telegramChannelOutcome(
    await request({
      method: "POST",
      url: `/campaigns/${campaignId}/send-telegram-channel`,
      data: {},
    })
  );
}
