"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Typed service for the org-wide holdout policy (2.7 holdout/lift experiment,
 * backend `feat/campaign-holdout-2.7`).
 *
 * The policy (stored under `Organization.metadata.holdoutPolicy`) sets how much
 * of each campaign is withheld as a control to measure that campaign's lift,
 * plus a programme-wide global control (with its own on/off flag) and a
 * rotatable seed. Shape mirrors `GET/PUT /organization/settings/holdout`.
 */

/** Suggested starting percentages shown in the UI (the stored default is 0 = off). */
export const SUGGESTED_CAMPAIGN_PCT = 10;
export const SUGGESTED_GLOBAL_PCT = 5;

export interface HoldoutPolicy {
  /** % withheld from each campaign as a control (0-100). 0 = holdout off. */
  campaignPct: number;
  /** % withheld from every send as a programme-wide control (0-100). */
  globalPct: number;
  /** Whether the global (programme-wide) holdout is active. */
  globalEnabled: boolean;
  /** ISO date the holdout seed was last rotated. */
  rotatedAt: string;
  /** Eligible audience a single campaign needs before its lift is measurable. */
  singleCampaignFloor: number;
}

export interface UpdateHoldoutPolicyBody {
  /** 0-100; the backend 400s outside that range. */
  campaignPct?: number;
  globalPct?: number;
  globalEnabled?: boolean;
  /** When true, reshuffle who is in the global control from now on. */
  rotateSeed?: boolean;
}

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const extractData = <T>(payload: unknown): T => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

const request = async <T>(
  config: AxiosRequestConfig,
  orgId?: string
): Promise<T> => {
  const resolvedOrgId = pickOrgId(orgId);
  const headers = {
    ...(config.headers ?? {}),
    ...(resolvedOrgId ? { "x-org-id": resolvedOrgId } : {}),
    "x-onchain-silent-error": "1",
  };

  try {
    const res = await apiClient.request<T>({ ...config, headers });
    return extractData<T>(res.data);
  } catch (e) {
    const err = e as AxiosError<unknown>;
    const data = err.response?.data;
    const nestedError =
      isJsonObject(data) && isJsonObject(data.error) ? data.error : undefined;
    const message = isJsonObject(nestedError)
      ? nestedError.message
      : isJsonObject(data)
        ? data.message
        : typeof data === "string"
          ? data
          : (err.message ?? "Holdout request failed");
    throw new Error(String(message), { cause: e });
  }
};

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** Normalize the response so callers always get concrete values. */
export const normalizeHoldoutPolicy = (payload: unknown): HoldoutPolicy => {
  const root = extractData<unknown>(payload);
  const obj = isJsonObject(root) ? root : {};
  return {
    campaignPct: toNumber(obj.campaignPct, 0),
    globalPct: toNumber(obj.globalPct, 0),
    globalEnabled: obj.globalEnabled === true,
    rotatedAt:
      typeof obj.rotatedAt === "string"
        ? obj.rotatedAt
        : "1970-01-01T00:00:00.000Z",
    singleCampaignFloor: toNumber(obj.singleCampaignFloor, 10_000),
  };
};

export const holdoutService = {
  /** `GET /organization/settings/holdout` - readable by any org role. */
  async getSettings(orgId?: string): Promise<HoldoutPolicy> {
    const payload = await request<unknown>(
      { method: "GET", url: "/organization/settings/holdout" },
      orgId
    );
    return normalizeHoldoutPolicy(payload);
  },

  /** `PUT /organization/settings/holdout` - OWNER/ADMIN only. */
  async updateSettings(
    body: UpdateHoldoutPolicyBody,
    orgId?: string
  ): Promise<HoldoutPolicy> {
    const payload = await request<unknown>(
      { method: "PUT", url: "/organization/settings/holdout", data: body },
      orgId
    );
    return normalizeHoldoutPolicy(payload);
  },
};
