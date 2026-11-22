import { isJsonObject } from "@/lib/utils";

import type { CampaignTrackingSettings } from "../campaigns.service";
import type { CampaignFormData } from "../validations";

type TrackingFields = Pick<
  CampaignFormData,
  | "smartSending"
  | "smartSendingWindowHours"
  | "trackingParameters"
  | "utmSource"
  | "utmMedium"
  | "utmCampaign"
  | "utmTerm"
  | "utmContent"
> & { sendToUnengaged?: boolean };

/** Blank or out of range (backend accepts integers 1-168) → undefined, so the org setting applies. */
export function parseWindowOverride(
  raw: string | undefined
): number | undefined {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length === 0) return undefined;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 168
    ? parsed
    : undefined;
}

/**
 * The `PUT /campaigns/:id/tracking` body for the current form state.
 *
 * ONE builder for both writers (the audience step's autosync and the wizard's
 * Continue flush). They used to build it separately, and the flush left keys
 * out: with `sendToUnengaged` that matters, because the backend reads an
 * omitted key as `false`, so a Continue right after "Include unengaged
 * contacts" would have switched the exclusion straight back on. One builder
 * also means both produce the same JSON, so the change cache in
 * `audience-sync.ts` sees no difference and skips the duplicate write.
 */
export function buildTrackingPayload(
  data: TrackingFields
): CampaignTrackingSettings {
  const utm: Record<string, string> = {};
  if (data.trackingParameters) {
    const add = (key: string, value?: string) => {
      const trimmed = (value ?? "").trim();
      if (trimmed.length > 0) utm[key] = trimmed;
    };
    add("source", data.utmSource);
    add("medium", data.utmMedium);
    add("campaign", data.utmCampaign);
    add("term", data.utmTerm);
    add("content", data.utmContent);
  }
  const smartSendingWindowHours = parseWindowOverride(
    data.smartSendingWindowHours
  );
  return {
    smartSending: Boolean(data.smartSending),
    trackingParameters: Boolean(data.trackingParameters),
    // Always sent, never omitted when false: see the doc comment above.
    sendToUnengaged: data.sendToUnengaged === true,
    ...(smartSendingWindowHours !== undefined
      ? { smartSendingWindowHours }
      : {}),
    ...(Object.keys(utm).length > 0 ? { utm } : {}),
  };
}

/** Form values from `GET /campaigns/:id/tracking`. Unknown or missing keys are left out. */
export function trackingToFormValues(raw: unknown): Partial<CampaignFormData> {
  const t = isJsonObject(raw) ? raw : {};
  const out: Partial<CampaignFormData> = {};
  if (typeof t.smartSending === "boolean") out.smartSending = t.smartSending;
  if (typeof t.smartSendingWindowHours === "number") {
    out.smartSendingWindowHours = String(t.smartSendingWindowHours);
  }
  if (typeof t.trackingParameters === "boolean") {
    out.trackingParameters = t.trackingParameters;
  }
  // `sendToUnengaged` is the stored choice; an older backend only reports the
  // effective `applySunset`, which before 2026-11-22 was always false and so
  // says nothing about what the sender wanted. Only trust the new key.
  if (typeof t.sendToUnengaged === "boolean") {
    out.sendToUnengaged = t.sendToUnengaged;
  }
  if (isJsonObject(t.utm)) {
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    const pairs = [
      ["utmSource", t.utm.source],
      ["utmMedium", t.utm.medium],
      ["utmCampaign", t.utm.campaign],
      ["utmTerm", t.utm.term],
      ["utmContent", t.utm.content],
    ] as const;
    for (const [key, value] of pairs) {
      const v = str(value);
      if (v !== undefined) out[key] = v;
    }
  }
  return out;
}
