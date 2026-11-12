/**
 * Handing a channel's setup to someone else.
 *
 * The person who wants a channel live is rarely the person who can make it so.
 * What they need is the steps, in words they can forward, and a link that lands
 * the other person on the right page. This builds that text. It is copied, not
 * emailed from here, so it can go wherever the team already talks.
 *
 * Pure, no React.
 */
import { channelSetupHref } from "../data/channels";
import { SETUP_GUIDES } from "../data/setup-guides";
import type { ChannelId, ChannelReadiness } from "../types/channel";

/** Channels still to set up, in the order the list shows them. */
export function outstandingChannels(
  readiness: readonly ChannelReadiness[]
): ChannelId[] {
  return readiness.filter((c) => c.status !== "connected").map((c) => c.id);
}

/** Total time asked of whoever receives it, said before it is sent. */
export function handoffMinutes(ids: readonly ChannelId[]): number {
  return ids.reduce((sum, id) => sum + SETUP_GUIDES[id].minutes, 0);
}

/** The instructions for the chosen channels, as plain text to paste anywhere. */
export function handoffText(
  ids: readonly ChannelId[],
  options: { origin: string; workspace?: string }
): string {
  const origin = options.origin.replace(/\/+$/, "");
  const where = options.workspace ? ` for ${options.workspace}` : "";
  const lines: string[] = [`Setup needed in OnchainSuite${where}:`, ""];
  ids.forEach((id, index) => {
    const guide = SETUP_GUIDES[id];
    lines.push(
      `${String(index + 1)}. ${guide.task} (about ${String(guide.minutes)} min)`
    );
    guide.steps.forEach((step) => lines.push(`   - ${step}`));
    lines.push(`   Watch out: ${guide.gotcha}`);
    lines.push(`   Do it here: ${origin}${channelSetupHref(id)}`);
    lines.push("");
  });
  if (ids.length > 1) {
    lines.push(
      `About ${String(handoffMinutes(ids))} minutes of work in total.`
    );
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
