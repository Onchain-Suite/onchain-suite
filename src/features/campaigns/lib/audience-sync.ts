import {
  type CampaignAudienceEstimate,
  type CampaignAudienceSelection,
  campaignsService,
  type CampaignTrackingSettings,
} from "../campaigns.service";

/**
 * Change-detection cache for audience/tracking sync. The backend rate-limits
 * these endpoints hard (3 requests / 10s), so every skipped no-op request
 * matters: a full sync burst (setAudience + updateTracking + estimate) spends
 * the entire budget on its own.
 *
 * Module-level on purpose - the audience step's live autosync and the wizard's
 * "Continue" save share it, so Continue right after an autosync sends zero
 * requests instead of repeating all three.
 */
const lastSynced = new Map<string, string>();

const audienceKey = (campaignId: string) => `${campaignId}:audience`;
const trackingKey = (campaignId: string) => `${campaignId}:tracking`;

export const isRateLimitError = (error: unknown): boolean =>
  error instanceof Error && error.message.startsWith("[HTTP 429]");

/**
 * Seed the cache from hydrated form state without touching the network. The
 * wizard only enables sync after the campaign hydrates, so the initial form
 * values mirror what the backend already has - re-saving them on mount would
 * waste the whole rate-limit window before the user changes anything.
 */
export function seedAudienceSyncCache(
  campaignId: string,
  audience: CampaignAudienceSelection,
  tracking: CampaignTrackingSettings
): void {
  const aKey = audienceKey(campaignId);
  const tKey = trackingKey(campaignId);
  if (!lastSynced.has(aKey)) lastSynced.set(aKey, JSON.stringify(audience));
  if (!lastSynced.has(tKey)) lastSynced.set(tKey, JSON.stringify(tracking));
}

export interface SyncAudienceSettingsResult {
  audienceChanged: boolean;
  trackingChanged: boolean;
  /** Present only when a fresh estimate was requested and succeeded. */
  estimate: CampaignAudienceEstimate | null;
}

/**
 * Persist audience + tracking settings, sending only the requests whose
 * payload differs from the last successful sync. A recipient estimate is
 * fetched only when the audience changed (or when `forceEstimate` asks for
 * one, e.g. the audience step's first render).
 */
export async function syncAudienceSettings(
  campaignId: string,
  options: {
    audience: CampaignAudienceSelection;
    tracking: CampaignTrackingSettings;
    forceEstimate?: boolean;
    /** Skip the estimate entirely (e.g. the wizard's Continue save). */
    skipEstimate?: boolean;
  }
): Promise<SyncAudienceSettingsResult> {
  const aKey = audienceKey(campaignId);
  const tKey = trackingKey(campaignId);
  const audiencePayload = JSON.stringify(options.audience);
  const trackingPayload = JSON.stringify(options.tracking);
  const audienceChanged = lastSynced.get(aKey) !== audiencePayload;
  const trackingChanged = lastSynced.get(tKey) !== trackingPayload;

  const writes: Promise<unknown>[] = [];
  if (audienceChanged) {
    writes.push(
      campaignsService.setAudience(campaignId, options.audience).then(() => {
        lastSynced.set(aKey, audiencePayload);
      })
    );
  }
  if (trackingChanged) {
    writes.push(
      campaignsService.updateTracking(campaignId, options.tracking).then(() => {
        lastSynced.set(tKey, trackingPayload);
      })
    );
  }
  await Promise.all(writes);

  let estimate: CampaignAudienceEstimate | null = null;
  if (!options.skipEstimate && (audienceChanged || options.forceEstimate)) {
    estimate = await campaignsService
      .estimateAudience(campaignId)
      .catch(() => null);
  }

  return { audienceChanged, trackingChanged, estimate };
}
