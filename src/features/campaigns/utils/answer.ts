import type { Campaign, CampaignStatus } from "../types/campaign";
import { isFiniteRate } from "./rates";

/**
 * The Campaigns page's one sentence (2.7): how the sends went and what is
 * still to go. It replaced four stat cards. Pure, so the wording is tested
 * without rendering the page; the page bolds the numbers.
 */
export interface CampaignsAnswer {
  sent: number;
  /**
   * Provider-confirmed deliveries summed across sent campaigns: messages, not
   * people, since audiences overlap. Undefined when no campaign reports
   * deliveries. Audience size is not used: it overstates a send still going
   * out and understates one that went out on several channels.
   */
  delivered?: number;
  best?: { name: string; openRate: number };
  /** "2 are scheduled, 1 is a draft and 1 is paused", or "" when nothing waits. */
  waiting: string;
}

const openRate = (c: Campaign): number | undefined => {
  const rate = c.openRateOfDelivered ?? c.openRateOfAudience;
  return isFiniteRate(rate) ? rate : undefined;
};

const PHRASES: [CampaignStatus, (n: number) => string][] = [
  ["scheduled", (n) => `${n} ${n === 1 ? "is" : "are"} scheduled`],
  ["draft", (n) => `${n} ${n === 1 ? "is a draft" : "are drafts"}`],
  ["paused", (n) => `${n} ${n === 1 ? "is" : "are"} paused`],
];

/** "a", "a and b", "a, b and c". */
export const joinAnd = (parts: string[]) =>
  parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
    : (parts[0] ?? "");

export function campaignsAnswer(campaigns: Campaign[]): CampaignsAnswer {
  const sent = campaigns.filter((c) => c.status === "sent");
  const reported = sent.filter(
    (c): c is Campaign & { delivered: number } =>
      typeof c.delivered === "number" && Number.isFinite(c.delivered)
  );
  const delivered = reported.length
    ? reported.reduce((sum, c) => sum + c.delivered, 0)
    : undefined;

  let best: CampaignsAnswer["best"];
  for (const c of sent) {
    const rate = openRate(c);
    if (rate === undefined || !c.recipients) continue;
    if (!best || rate > best.openRate) best = { name: c.name, openRate: rate };
  }

  const count = (s: CampaignStatus) =>
    campaigns.filter((c) => c.status === s).length;
  const waiting = joinAnd(
    PHRASES.filter(([s]) => count(s) > 0).map(([s, say]) => say(count(s)))
  );

  return { sent: sent.length, delivered, best, waiting };
}

/** "45%" from a percent value (already a percentage, never multiplied). */
export const formatRate = (rate: number) => `${Math.round(rate)}%`;

/** Upper-cases the first letter, for a clause that starts a sentence. */
export const capitalise = (s: string) =>
  s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s;
