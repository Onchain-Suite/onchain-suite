import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Typed service for the analytics dashboard (GET /dashboard/overview,
 * docs/backend.md 2026-08-13). Mirrors the campaigns service conventions:
 * one request helper that injects `x-org-id`, unwraps the `{ success, data }`
 * envelope exactly once, and returns typed data. Components consume typed
 * shapes and never call axios directly.
 */

/** How much real backing a headline metric has - drives the UI honesty rule. */
export type MetricBacking = "real" | "value-only" | "none";

/** One daily bucket of a metric series. */
export interface DashboardSeriesPoint {
  date: string;
  value: number;
}

/**
 * A single headline metric. `series` is empty when the backend has no history
 * for it (e.g. activeWallets, convertedOnchain). `deltaPct` is 0 when there is
 * no prior-period comparison to make.
 */
export interface DashboardMetric {
  value: number;
  deltaPct: number;
  series: DashboardSeriesPoint[];
}

/** Keys for the four headline metrics, in display order. */
export type DashboardMetricKey =
  "messagesSent" | "openRate" | "activeWallets" | "convertedOnchain";

/**
 * GET /dashboard/overview response. `meta.backing` tells the UI which metrics
 * may be charted (`real`), shown as a number without a trend (`value-only`),
 * or are not measured at all (`none`). `meta.notes` are human-readable
 * caveats the backend attaches per metric.
 */
export interface DashboardOverview {
  messagesSent: DashboardMetric;
  openRate: DashboardMetric;
  activeWallets: DashboardMetric;
  convertedOnchain: DashboardMetric;
  meta: {
    backing: Record<DashboardMetricKey, MetricBacking>;
    notes: string[];
  };
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
    const status = err.response?.status;
    const data = err.response?.data;
    const nestedError =
      isJsonObject(data) && isJsonObject(data.error) ? data.error : undefined;
    const message = isJsonObject(nestedError)
      ? nestedError.message
      : isJsonObject(data)
        ? data.message
        : (err.message ?? "Analytics request failed");
    throw new Error(
      status ? `[HTTP ${status}] ${String(message)}` : String(message),
      { cause: e }
    );
  }
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toSeries = (value: unknown): DashboardSeriesPoint[] => {
  if (!Array.isArray(value)) return [];
  const points: DashboardSeriesPoint[] = [];
  for (const raw of value) {
    if (!isJsonObject(raw)) continue;
    const date = typeof raw.date === "string" ? raw.date : "";
    points.push({ date, value: toFiniteNumber(raw.value) });
  }
  return points;
};

/**
 * Normalize a single metric defensively - a missing metric or field must never
 * crash the page. Absent numbers become 0, absent series become [].
 */
const toMetric = (value: unknown): DashboardMetric => {
  const obj = isJsonObject(value) ? value : {};
  return {
    value: toFiniteNumber(obj.value),
    deltaPct: toFiniteNumber(obj.deltaPct),
    series: toSeries(obj.series),
  };
};

const BACKING_VALUES = new Set<MetricBacking>(["real", "value-only", "none"]);

const toBacking = (value: unknown, fallback: MetricBacking): MetricBacking =>
  typeof value === "string" && BACKING_VALUES.has(value as MetricBacking)
    ? (value as MetricBacking)
    : fallback;

/**
 * Coerce the raw overview payload into a fully-typed, non-nullable shape. The
 * documented defaults (activeWallets/convertedOnchain have no history) are used
 * as fallbacks so an incomplete response still renders honest states.
 */
const toOverview = (raw: unknown): DashboardOverview => {
  const obj = isJsonObject(raw) ? raw : {};
  const metaObj = isJsonObject(obj.meta) ? obj.meta : {};
  const backingObj = isJsonObject(metaObj.backing) ? metaObj.backing : {};
  const notes = Array.isArray(metaObj.notes)
    ? metaObj.notes.filter((n): n is string => typeof n === "string")
    : [];

  return {
    messagesSent: toMetric(obj.messagesSent),
    openRate: toMetric(obj.openRate),
    activeWallets: toMetric(obj.activeWallets),
    convertedOnchain: toMetric(obj.convertedOnchain),
    meta: {
      backing: {
        messagesSent: toBacking(backingObj.messagesSent, "real"),
        openRate: toBacking(backingObj.openRate, "real"),
        activeWallets: toBacking(backingObj.activeWallets, "value-only"),
        convertedOnchain: toBacking(backingObj.convertedOnchain, "none"),
      },
      notes,
    },
  };
};

export const analyticsService = {
  /** Headline metrics for the four KPI cards + charting metadata. */
  getDashboardOverview(orgId?: string) {
    return request<unknown>(
      { method: "GET", url: "/dashboard/overview" },
      orgId
    ).then(toOverview);
  },
};
