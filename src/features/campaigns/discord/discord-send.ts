import { campaignsService } from "../campaigns.service";
import type { SendOutcome } from "../farcaster/farcaster-send";

const CROSSPOST_REASON: Record<string, string> = {
  not_an_announcement_channel: "it isn't an Announcement channel",
  missing_permission: "the bot needs Manage Messages in that channel",
  rate_limited: "Discord is rate-limiting crossposts from this channel",
  already_crossposted: "it was already crossposted",
};

/** The toast for a Discord channel post, including a refused crosspost. */
export function discordPostOutcome(result: {
  ok?: boolean;
  reason?: string;
  crossposted?: boolean | null;
  crosspostReason?: string;
}): SendOutcome {
  if (!result.ok) {
    return {
      level: "error",
      message: result.reason
        ? `Discord post failed: ${result.reason}`
        : "Discord post failed. Check the bot is in the server and can post in that channel.",
      done: false,
    };
  }
  if (result.crossposted === false) {
    const why = CROSSPOST_REASON[result.crosspostReason ?? ""];
    return {
      level: "warning",
      message: `Posted to Discord, but not crossposted${why ? `: ${why}` : ""}.`,
      done: true,
    };
  }
  return {
    level: "success",
    message: result.crossposted
      ? "Posted to Discord and crossposted to following servers."
      : "Posted to Discord.",
    done: true,
  };
}

export async function sendDiscordPost(
  campaignId: string
): Promise<SendOutcome> {
  await campaignsService
    .ensureChannels(campaignId, ["discord"])
    .catch(() => undefined);
  return discordPostOutcome(await campaignsService.sendDiscord(campaignId));
}
