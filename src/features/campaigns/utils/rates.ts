import type { CampaignAnalytics } from "../campaigns.service";
import type { Campaign, CampaignStatus } from "../types/campaign";

/** Statuses that have actually sent, so they carry engagement rates. */
export const SENT_STATUSES = new Set<CampaignStatus>(["sent", "paused"]);

export const isFiniteRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** True when the campaign sent over email (defaults to email when unset). */
export const campaignUsesEmail = (campaign: Campaign) => {
  const used =
    campaign.channelsUsed && campaign.channelsUsed.length > 0
      ? campaign.channelsUsed
      : ["email"];
  return used.some((c) => c === "email");
};

/**
 * Pick a rate honoring the channel the campaign actually used - prefer the email
 * funnel when it sent email, else the in-app funnel; fall back to the other
 * channel if the preferred one is missing.
 */
const pickRate = (
  preferEmail: boolean,
  emailRate: number | undefined,
  inappRate: number | undefined
): number | undefined => {
  const primary = preferEmail ? emailRate : inappRate;
  const secondary = preferEmail ? inappRate : emailRate;
  if (isFiniteRate(primary)) return primary;
  if (isFiniteRate(secondary)) return secondary;
  return undefined;
};

/** One campaign's open + click rate (percent), or undefined per metric. */
export const campaignRates = (
  campaign: Campaign,
  analytics: CampaignAnalytics | undefined
): { open: number | undefined; click: number | undefined } => {
  const preferEmail = campaignUsesEmail(campaign);
  return {
    // Of-delivered first. An open rate measured against people who never
    // received the message is not a rate of anything, and it is what made the
    // campaigns list and a campaign's own detail page disagree (69.2% vs 52.9%
    // for the same send). The bare `openRate` is the deprecated of-sent value
    // and is kept only as a last resort for responses that predate the split.
    open: pickRate(
      preferEmail,
      analytics?.email?.openRateOfDelivered ??
        analytics?.email?.openRateOfAudience ??
        analytics?.email?.openRate,
      analytics?.inapp?.viewRate
    ),
    click: pickRate(
      preferEmail,
      analytics?.email?.clickRateOfDelivered ??
        analytics?.email?.clickRateOfAudience ??
        analytics?.email?.clickRate,
      analytics?.inapp?.clickRate
    ),
  };
};

const pickCount = (
  ...values: Array<number | undefined>
): number | undefined => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
};

/**
 * The denominator to weight this campaign's rate by: the delivered count of the
 * channel it used (falling back to sent, then the audience size). Undefined when
 * no count is available, in which case the aggregator weights it as 1.
 */
export const campaignRateWeight = (
  campaign: Campaign,
  analytics: CampaignAnalytics | undefined
): number | undefined => {
  const preferEmail = campaignUsesEmail(campaign);
  const primary = preferEmail ? analytics?.email : analytics?.inapp;
  const secondary = preferEmail ? analytics?.inapp : analytics?.email;
  return pickCount(
    primary?.delivered,
    primary?.sent,
    secondary?.delivered,
    secondary?.sent,
    campaign.recipients
  );
};

/**
 * Recipient-weighted mean of per-campaign rates: Σ(rate·weight) / Σweight. Since
 * rate = opens/delivered, weighting by delivered recovers the true pooled rate
 * (Σopens / Σdelivered) - the industry-standard open rate - while tolerating
 * campaigns that expose only a rate (they fall back to weight 1). Clamped to
 * [0, 100]; undefined when no campaign has a rate.
 */
export const weightedAverageRate = (
  entries: Array<{ rate: number | undefined; weight: number | undefined }>
): number | undefined => {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const { rate, weight } of entries) {
    if (!isFiniteRate(rate)) continue;
    const w = isFiniteRate(weight) && weight > 0 ? weight : 1;
    weightedSum += rate * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return undefined;
  return Math.min(100, Math.max(0, weightedSum / totalWeight));
};
