import { isJsonObject } from "@/lib/utils";

import { campaignsService } from "../campaigns.service";
import { request } from "../dm-send/dm-send.service";
import type { CampaignFormData } from "../validations";

/** Result of POST /campaigns/{id}/send-farcaster-notification. */
export interface FarcasterNotificationResult {
  audience?: "all" | "campaign";
  calls?: number;
  queued?: boolean;
  successCount?: number;
  alreadySent?: number;
}

const n = (v: unknown) => (typeof v === "number" && v > 0 ? v : 0);

export async function sendFarcasterNotification(
  campaignId: string
): Promise<FarcasterNotificationResult> {
  const raw = await request({
    method: "POST",
    url: `/campaigns/${campaignId}/send-farcaster-notification`,
    data: {},
  });
  const r = isJsonObject(raw) ? raw : {};
  return {
    audience: r.audience === "campaign" ? "campaign" : "all",
    calls: n(r.calls),
    queued: r.queued === true,
    successCount: n(r.successCount),
    alreadySent: n(r.alreadySent),
  };
}

export interface SendOutcome {
  level: "success" | "warning" | "error";
  message: string;
  /** Show the "campaign sent" screen. */
  done: boolean;
}

/** What `channelsContent.farcaster` should hold for this form state. */
export function farcasterContent(data: CampaignFormData) {
  const isNotification = data.farcasterDelivery === "notification";
  return {
    text: (data.farcasterText ?? "").trim(),
    delivery: data.farcasterDelivery,
    ...(isNotification
      ? {
          notification: {
            title: (data.farcasterNotificationTitle ?? "").trim(),
            body: (data.farcasterNotificationBody ?? "").trim(),
            targetUrl: (data.farcasterNotificationUrl ?? "").trim(),
            audience: data.farcasterNotificationAudience,
          },
        }
      : {}),
  };
}

/** The toast for a notification send: never a "sent" when nobody was reached. */
export function notificationOutcome(
  r: FarcasterNotificationResult
): SendOutcome {
  if (r.queued) {
    return {
      level: "success",
      message:
        "Notification queued. Farcaster delivers it to everyone with notifications on over the next few minutes.",
      done: true,
    };
  }
  const delivered = r.successCount ?? 0;
  if (delivered > 0) {
    return {
      level: "success",
      message: `Notification delivered to ${delivered.toLocaleString()} ${delivered === 1 ? "person" : "people"}.`,
      done: true,
    };
  }
  if ((r.calls ?? 0) === 0 && (r.alreadySent ?? 0) > 0) {
    return {
      level: "warning",
      message:
        "This notification already went out. Change the text to send a new one.",
      done: false,
    };
  }
  return {
    level: "warning",
    message:
      r.audience === "campaign"
        ? "Nobody was reached. No one in this audience has your Mini App's notifications turned on."
        : "Nobody was reached. No one has turned on notifications for your Mini App yet.",
    done: false,
  };
}

/** Send a Farcaster campaign as a public cast or a Mini App notification. */
export async function sendFarcasterCampaign(
  campaignId: string,
  data: CampaignFormData
): Promise<SendOutcome> {
  await campaignsService
    .ensureChannels(campaignId, ["farcaster"])
    .catch(() => undefined);
  if (data.farcasterDelivery === "notification") {
    return notificationOutcome(await sendFarcasterNotification(campaignId));
  }
  const result = await campaignsService.sendFarcaster(campaignId);
  return result.ok === false
    ? {
        level: "error",
        message:
          result.message ??
          result.reason ??
          "Farcaster cast failed. Check your account is connected.",
        done: false,
      }
    : { level: "success", message: "Cast published to Farcaster.", done: true };
}
