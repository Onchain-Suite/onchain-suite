"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import { getSelectedOrganizationId } from "@/lib/utils";

import type {
  AnalyticsPeriod,
  OrgAnalyticsOverview,
  OrgAnalyticsTimeseries,
  OrgAttribution,
  OrgOnchainActivity,
  OrgPushDelivery,
} from "../contracts/org-analytics";
import type {
  AudienceReport,
  EngagementBySegmentReport,
  HolderDistributionReport,
  RetentionCohortsReport,
} from "../contracts/reports";
import { orgAnalyticsService } from "../org-analytics.service";
import {
  type AudienceOverview,
  audienceService,
} from "@/features/audience/audience.service";
import {
  type CampaignAnalyticsOverview,
  campaignsService,
} from "@/features/campaigns/campaigns.service";

/**
 * Every endpoint the Analytics tabs read, as one registry, so a built-in card
 * and a saved chart that need the same numbers share a single cached request.
 */
export interface SourceData {
  overview: OrgAnalyticsOverview;
  timeseries: OrgAnalyticsTimeseries;
  push: OrgPushDelivery;
  onchain: OrgOnchainActivity;
  attribution: OrgAttribution;
  cohorts: RetentionCohortsReport;
  segments: EngagementBySegmentReport;
  holders: HolderDistributionReport;
  audienceReport: AudienceReport;
  campaigns: CampaignAnalyticsOverview;
  audience: AudienceOverview;
}

export type SourceId = keyof SourceData;

const DAYS: Record<AnalyticsPeriod, number> = { "7d": 7, "30d": 30, "90d": 90 };

type Fetcher<K extends SourceId> = (
  period: AnalyticsPeriod,
  signal?: AbortSignal
) => Promise<SourceData[K]>;

const FETCHERS: { [K in SourceId]: Fetcher<K> } = {
  overview: (p, signal) => orgAnalyticsService.overview(p, { signal }),
  timeseries: (p, signal) =>
    orgAnalyticsService.timeseries(p, ["reach", "conversions"], { signal }),
  push: (p, signal) => orgAnalyticsService.pushDelivery(p, { signal }),
  onchain: (p, signal) => orgAnalyticsService.onchain(p, { signal }),
  attribution: (p, signal) =>
    orgAnalyticsService.attribution(p, 72, { signal }),
  cohorts: (_p, signal) => orgAnalyticsService.retentionCohorts(8, { signal }),
  segments: (_p, signal) => orgAnalyticsService.engagementBySegment({ signal }),
  holders: (_p, signal) => orgAnalyticsService.holderDistribution({ signal }),
  audienceReport: (_p, signal) =>
    orgAnalyticsService.audienceReport({ signal }),
  campaigns: (p) => campaignsService.getAnalyticsOverview(DAYS[p]),
  audience: () => audienceService.getOverview() as Promise<AudienceOverview>,
};

/** Sources that answer "over this period" and so refetch when it changes. */
const PERIODIC = new Set<SourceId>([
  "overview",
  "timeseries",
  "push",
  "onchain",
  "attribution",
  "campaigns",
]);

export const sourceQuery = <K extends SourceId>(
  id: K,
  period: AnalyticsPeriod
) => ({
  queryKey: [
    "analytics",
    "source",
    id,
    PERIODIC.has(id) ? period : "all",
    getSelectedOrganizationId() ?? "",
  ] as const,
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    FETCHERS[id](period, signal),
  // Aggregates move slowly; a minute of staleness saves a refetch per tab switch.
  staleTime: 60_000,
});

export function useAnalyticsSource<K extends SourceId>(
  id: K,
  period: AnalyticsPeriod
) {
  return useQuery(sourceQuery(id, period));
}

export interface SourcesState {
  data: Partial<SourceData>;
  loading: boolean;
  /** The first error, if any source failed. */
  error: Error | null;
}

/** Several sources at once, for charts that combine endpoints. */
export function useAnalyticsSources(
  ids: readonly SourceId[],
  period: AnalyticsPeriod
): SourcesState {
  const results = useQueries({
    queries: ids.map((id) => sourceQuery(id, period)),
  });
  const data: Partial<SourceData> = {};
  ids.forEach((id, i) => {
    const d = results[i]?.data;
    if (d !== undefined) (data as Record<string, unknown>)[id] = d;
  });
  return {
    data,
    loading: results.some((r) => r.isLoading),
    error: (results.find((r) => r.error)?.error as Error | undefined) ?? null,
  };
}
