import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type {
  AnalyticsPeriod,
  TimeseriesMetric,
} from "./contracts/org-analytics";
import {
  toAttribution,
  toAudienceReport,
  toCohorts,
  toHolderDistribution,
  toOnchain,
  toOverview,
  toPushDelivery,
  toSegmentEngagement,
  toTimeseries,
} from "./utils/normalize";

export type * from "./contracts/org-analytics";
export type * from "./contracts/reports";

/**
 * The org-wide analytics endpoints behind the Analytics tabs:
 * `/organization/analytics/*` (KPIs, timeseries, push, on-chain, attribution),
 * `/analytics/reports/*` (cohorts, segments, holders) and `/audience/report`.
 * Injects `x-org-id`, unwraps the `{ success, data }` envelope once, and
 * normalizes every response so components get fully typed, null-honest data.
 */

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

async function get(
  url: string,
  params: Record<string, unknown>,
  orgId?: string,
  signal?: AbortSignal
) {
  const resolved = pickOrgId(orgId);
  const config: AxiosRequestConfig = {
    method: "GET",
    url,
    params,
    signal,
    timeout: 30_000,
    headers: {
      ...(resolved ? { "x-org-id": resolved } : {}),
      "x-onchain-silent-error": "1",
    },
  };
  try {
    const res = await apiClient.request<unknown>(config);
    const body = res.data;
    return isJsonObject(body) && "data" in body ? body.data : body;
  } catch (e) {
    const err = e as AxiosError<unknown>;
    const data = err.response?.data;
    const message =
      isJsonObject(data) && isJsonObject(data.error)
        ? data.error.message
        : isJsonObject(data)
          ? data.message
          : err.message;
    const status = err.response?.status;
    throw new Error(
      status
        ? `[HTTP ${status}] ${String(message ?? "Analytics request failed")}`
        : String(message),
      { cause: e }
    );
  }
}

interface Opts {
  orgId?: string;
  signal?: AbortSignal;
}

export const orgAnalyticsService = {
  overview(period: AnalyticsPeriod, o: Opts = {}) {
    return get(
      "/organization/analytics/overview",
      { period },
      o.orgId,
      o.signal
    ).then((r) => toOverview(r, period));
  },

  timeseries(
    period: AnalyticsPeriod,
    metrics: TimeseriesMetric[],
    o: Opts = {}
  ) {
    return get(
      "/organization/analytics/timeseries",
      { period, metrics: metrics.join(",") },
      o.orgId,
      o.signal
    ).then((r) => toTimeseries(r, period));
  },

  pushDelivery(period: AnalyticsPeriod, o: Opts = {}) {
    return get(
      "/organization/analytics/push-delivery",
      { period },
      o.orgId,
      o.signal
    ).then((r) => toPushDelivery(r, period));
  },

  onchain(period: AnalyticsPeriod, o: Opts = {}) {
    return get(
      "/organization/analytics/onchain",
      { period },
      o.orgId,
      o.signal
    ).then((r) => toOnchain(r, period));
  },

  attribution(period: AnalyticsPeriod, windowHours = 72, o: Opts = {}) {
    return get(
      "/organization/analytics/attribution",
      { period, windowHours },
      o.orgId,
      o.signal
    ).then((r) => toAttribution(r, period));
  },

  retentionCohorts(weeks = 8, o: Opts = {}) {
    return get(
      "/analytics/reports/retention-cohorts",
      { weeks },
      o.orgId,
      o.signal
    ).then(toCohorts);
  },

  engagementBySegment(o: Opts = {}) {
    return get(
      "/analytics/reports/engagement-by-segment",
      {},
      o.orgId,
      o.signal
    ).then(toSegmentEngagement);
  },

  holderDistribution(o: Opts = {}) {
    return get(
      "/analytics/reports/holder-distribution",
      { limit: 10 },
      o.orgId,
      o.signal
    ).then(toHolderDistribution);
  },

  audienceReport(o: Opts = {}) {
    return get("/audience/report", {}, o.orgId, o.signal).then(
      toAudienceReport
    );
  },
};
