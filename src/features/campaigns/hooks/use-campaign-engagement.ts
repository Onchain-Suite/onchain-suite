"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { campaignsService } from "../campaigns.service";
import {
  campaignRates,
  campaignRateWeight,
  isFiniteRate,
  SENT_STATUSES,
  weightedAverageRate,
} from "../utils/rates";

/**
 * The org's pooled open/click rate - the recipient-weighted average of every
 * sent campaign's own rate (Σ opens / Σ delivered). Single source of truth so
 * the Campaigns header and the Dashboard show the SAME number. Reuses the list
 * + per-campaign analytics query keys the table already runs, so React Query
 * dedupes them (no extra requests).
 */
export function useCampaignEngagement() {
  const campaignsQuery = useQuery({
    queryKey: ["campaigns", "list"],
    queryFn: () => campaignsService.listCampaigns({ page: 1, limit: 200 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const sentCampaigns = useMemo(
    () =>
      (campaignsQuery.data ?? []).filter((campaign) =>
        SENT_STATUSES.has(campaign.status)
      ),
    [campaignsQuery.data]
  );

  const analyticsResults = useQueries({
    queries: sentCampaigns.map((campaign) => ({
      queryKey: ["campaigns", campaign.id, "analytics"],
      queryFn: () => campaignsService.getAnalytics(campaign.id),
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });

  const { avgOpenRate, avgClickRate, ratedCount } = useMemo(() => {
    const openEntries: Array<{
      rate: number | undefined;
      weight: number | undefined;
    }> = [];
    const clickEntries: Array<{
      rate: number | undefined;
      weight: number | undefined;
    }> = [];
    let rated = 0;
    sentCampaigns.forEach((campaign, index) => {
      const analytics = analyticsResults[index]?.data;
      const { open, click } = campaignRates(campaign, analytics);
      const weight = campaignRateWeight(campaign, analytics);
      openEntries.push({ rate: open, weight });
      clickEntries.push({ rate: click, weight });
      // Only campaigns that actually contribute a rate belong in the "across N
      // sent" caption - a rate averaged over 8 campaigns must not claim 11.
      if (isFiniteRate(open) || isFiniteRate(click)) rated += 1;
    });
    return {
      avgOpenRate: weightedAverageRate(openEntries),
      avgClickRate: weightedAverageRate(clickEntries),
      ratedCount: rated,
    };
  }, [sentCampaigns, analyticsResults]);

  return {
    avgOpenRate,
    avgClickRate,
    /** Total campaigns in a sent-like state. */
    sentCount: sentCampaigns.length,
    /** Campaigns that contributed a rate to the pooled averages. */
    ratedCount,
    isLoading: campaignsQuery.isLoading,
  };
}
