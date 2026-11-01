"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Typed service for two org-wide messaging settings, both stored in
 * `Organization.metadata` (same pattern as the holdout policy):
 * - AI settings      - who may ask Intelligence, and whether it uses AI.
 * - Frequency budget - a cap on how often one contact is messaged.
 *
 * Mirrors `GET/PUT /organization/settings/ai` and `.../settings/frequency`.
 */

export interface AiSettings {
  enabled: boolean;
  who: "everyone" | "admins";
}

export interface FrequencyPolicy {
  enabled: boolean;
  maxPerWeek: number;
  minHoursBetween: number;
  exemptTransactional: boolean;
}

export interface UpdateAiSettingsBody {
  enabled?: boolean;
  who?: "everyone" | "admins";
}

export interface UpdateFrequencyPolicyBody {
  enabled?: boolean;
  maxPerWeek?: number;
  minHoursBetween?: number;
  exemptTransactional?: boolean;
}

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const extractData = <T>(payload: unknown): T =>
  isJsonObject(payload) && "data" in payload
    ? (payload.data as T)
    : (payload as T);

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
    const nested =
      isJsonObject(data) && isJsonObject(data.error) ? data.error : undefined;
    const message = isJsonObject(nested)
      ? nested.message
      : isJsonObject(data)
        ? data.message
        : typeof data === "string"
          ? data
          : (err.message ?? "Settings request failed");
    throw new Error(String(message), { cause: e });
  }
};

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeAi = (payload: unknown): AiSettings => {
  const obj = isJsonObject(extractData<unknown>(payload))
    ? (extractData<unknown>(payload) as Record<string, unknown>)
    : {};
  return {
    enabled: obj.enabled !== false,
    who: obj.who === "admins" ? "admins" : "everyone",
  };
};

const normalizeFrequency = (payload: unknown): FrequencyPolicy => {
  const obj = isJsonObject(extractData<unknown>(payload))
    ? (extractData<unknown>(payload) as Record<string, unknown>)
    : {};
  return {
    enabled: obj.enabled === true,
    maxPerWeek: toNumber(obj.maxPerWeek, 3),
    minHoursBetween: toNumber(obj.minHoursBetween, 24),
    exemptTransactional: obj.exemptTransactional !== false,
  };
};

export const messagingSettingsService = {
  /** `GET /organization/settings/ai` - any org role. */
  getAi: async (orgId?: string): Promise<AiSettings> =>
    normalizeAi(
      await request<unknown>(
        { method: "GET", url: "/organization/settings/ai" },
        orgId
      )
    ),

  /** `PUT /organization/settings/ai` - OWNER/ADMIN. */
  updateAi: async (
    body: UpdateAiSettingsBody,
    orgId?: string
  ): Promise<AiSettings> =>
    normalizeAi(
      await request<unknown>(
        { method: "PUT", url: "/organization/settings/ai", data: body },
        orgId
      )
    ),

  /** `GET /organization/settings/frequency` - any org role. */
  getFrequency: async (orgId?: string): Promise<FrequencyPolicy> =>
    normalizeFrequency(
      await request<unknown>(
        { method: "GET", url: "/organization/settings/frequency" },
        orgId
      )
    ),

  /** `PUT /organization/settings/frequency` - OWNER/ADMIN. */
  updateFrequency: async (
    body: UpdateFrequencyPolicyBody,
    orgId?: string
  ): Promise<FrequencyPolicy> =>
    normalizeFrequency(
      await request<unknown>(
        { method: "PUT", url: "/organization/settings/frequency", data: body },
        orgId
      )
    ),
};
