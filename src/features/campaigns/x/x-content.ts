import { campaignsService } from "../campaigns.service";
import type { SendOutcome } from "../farcaster/farcaster-send";
import type { CampaignFormData } from "../validations";

export const X_THREAD_MAX = 25;

/** X's pay-per-use rates, billed to the client's own X app (provider-costs). */
const POST_USD = 0.015;
const POST_WITH_URL_USD = 0.2;
const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+\.\S+/i;

/** The posts, in order: the first post plus the rest of the thread. */
export function xPosts(
  data: Pick<CampaignFormData, "xText" | "xThreadRest">
): string[] {
  return [data.xText ?? "", ...(data.xThreadRest ?? [])]
    .map((p) => p.trim())
    .filter(Boolean);
}

/** What X bills for these posts, in USD. */
export function xPostsCost(posts: string[]): number {
  const cents = posts.reduce(
    (sum, p) => sum + (URL_RE.test(p) ? POST_WITH_URL_USD : POST_USD) * 1000,
    0
  );
  return Math.round(cents) / 1000;
}

/** What `channelsContent.x` holds for this form state. */
export function xContent(
  data: Pick<
    CampaignFormData,
    "xText" | "xThreadRest" | "xDmText" | "xDelivery"
  >
) {
  const posts = xPosts(data);
  return {
    text: (data.xText ?? "").trim(),
    dmText: (data.xDmText ?? "").trim(),
    delivery: data.xDelivery,
    ...(posts.length > 1 ? { thread: posts } : {}),
  };
}

/** The toast for a post or thread, including one that stopped partway. */
export function xPostOutcome(r: {
  ok?: boolean;
  reason?: string;
  message?: string;
  posted?: number;
  total?: number;
}): SendOutcome {
  const posted = r.posted ?? 0;
  const total = r.total ?? 1;
  if (r.ok === false) {
    return {
      level: "error",
      message:
        posted > 0
          ? `Posted ${posted} of ${total}, then X refused the next one. Send again to post the rest.`
          : (r.message ??
            r.reason ??
            "X post failed. Check your X account is connected."),
      done: false,
    };
  }
  return {
    level: "success",
    message: total > 1 ? `Thread of ${total} posted to X.` : "Posted to X.",
    done: true,
  };
}

export async function sendXPost(campaignId: string): Promise<SendOutcome> {
  await campaignsService
    .ensureChannels(campaignId, ["x"])
    .catch(() => undefined);
  return xPostOutcome(await campaignsService.sendX(campaignId));
}
