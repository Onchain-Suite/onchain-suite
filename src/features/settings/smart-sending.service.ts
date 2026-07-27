"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Typed service for org-wide Smart Sending settings (docs/backend.md
 * 2026-08-02 — "Org-level Smart Sending settings + guaranteed UTM defaults").
 *
 * Suppression window resolution at send time, and identically in
 * `POST /campaigns/{id}/audience/estimate`, is:
 *   campaign override (`smartSendingWindowHours` on PUT /campaigns/{id}/tracking)
 *   → this org setting
 *   → platform default (10h)
 *
 * so the estimate always matches launch behavior.
 */

/** Backend bounds for the suppression window (hours). */
export const SMART_SENDING_MIN_HOURS = 1;
export const SMART_SENDING_MAX_HOURS = 168;

export interface SmartSendingSettings {
  /**
   * Always concrete — the org's saved value, else the platform default.
   * Render it directly; no client-side fallback needed.
   */
  windowHours: number;
  /**
   * When true, campaigns that never saved a tracking config behave as if
   * Smart Sending were on. An explicit per-campaign boolean always wins.
   */
  enabledByDefault: boolean;
  /** Whether the org saved its own window, vs inheriting the default. */
  isCustomWindow: boolean;
  /** The platform default, for "reset to default" affordances. */
  defaultWindowHours: number;
}

export interface UpdateSmartSendingBody {
  /** Integer 1–168. The backend 400s outside that range. */
  windowHours: number;
  enabledByDefault?: boolean;
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
          : (err.message ?? "Smart Sending request failed");
    throw new Error(String(message), { cause: e });
  }
};

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** Normalize the response so callers always get concrete values. */
export const normalizeSmartSendingSettings = (
  payload: unknown
): SmartSendingSettings => {
  const root = extractData<unknown>(payload);
  const obj = isJsonObject(root) ? root : {};
  const defaultWindowHours = toNumber(obj.defaultWindowHours, 10);
  return {
    windowHours: toNumber(obj.windowHours, defaultWindowHours),
    enabledByDefault: obj.enabledByDefault === true,
    isCustomWindow: obj.isCustomWindow === true,
    defaultWindowHours,
  };
};

export const smartSendingService = {
  /** `GET /organization/settings/smart-sending` — readable by any org role. */
  async getSettings(orgId?: string): Promise<SmartSendingSettings> {
    const payload = await request<unknown>(
      { method: "GET", url: "/organization/settings/smart-sending" },
      orgId
    );
    return normalizeSmartSendingSettings(payload);
  },

  /** `PUT /organization/settings/smart-sending` — OWNER/ADMIN only. */
  async updateSettings(
    body: UpdateSmartSendingBody,
    orgId?: string
  ): Promise<SmartSendingSettings> {
    const payload = await request<unknown>(
      {
        method: "PUT",
        url: "/organization/settings/smart-sending",
        data: body,
      },
      orgId
    );
    return normalizeSmartSendingSettings(payload);
  },
};
