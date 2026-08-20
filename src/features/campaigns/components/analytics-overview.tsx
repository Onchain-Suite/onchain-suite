"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { campaignsService } from "../campaigns.service";
import { formatPercentage } from "../utils";
import {
  campaignRates,
  campaignRateWeight,
  SENT_STATUSES,
  weightedAverageRate,
} from "../utils/rates";
import { StatCardsSkeleton } from "@/shared/components/page/page-skeleton";

const formatCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "-";

const formatResetDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);

/**
 * Allowance reset label. Prefers the backend's `allowance.resetsAt` (ISO); only
 * when it is absent or unparseable does it fall back to the local "first of next
 * month" assumption.
 */
const resetLabel = (resetsAt?: string) => {
  if (resetsAt) {
    const parsed = new Date(resetsAt);
    if (!Number.isNaN(parsed.getTime())) return formatResetDate(parsed);
  }
  const now = new Date();
  return formatResetDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
};

/**
 * Org-wide engagement snapshot for the campaigns landing page, backed by
 * GET /campaigns/analytics/overview?days=30: the four reference stat cards
 * (Messages sent, Open rate, Click rate, Monthly allowance). Renders nothing if
 * the endpoint fails so the campaigns table is never blocked on analytics.
 */
export function CampaignsAnalyticsOverview() {
  const overviewQuery = useQuery({
    queryKey: ["campaigns", "analytics", "overview", 30],
    queryFn: () => campaignsService.getAnalyticsOverview(30),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // The org-wide open/click rates are the recipient-weighted pool of every
  // campaign's own rate (Σ opens / Σ delivered), i.e. the industry-standard
  // rate - NOT the backend's aggregate opens/delivered, which over-counts
  // re-opens and clamps to a misleading 100%. Reuses the same list +
  // per-campaign analytics queries the table already runs, so React Query
  // dedupes them (no extra requests).
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

  const { avgOpenRate, avgClickRate } = useMemo(() => {
    const openEntries: Array<{
      rate: number | undefined;
      weight: number | undefined;
    }> = [];
    const clickEntries: Array<{
      rate: number | undefined;
      weight: number | undefined;
    }> = [];
    sentCampaigns.forEach((campaign, index) => {
      const analytics = analyticsResults[index]?.data;
      const { open, click } = campaignRates(campaign, analytics);
      const weight = campaignRateWeight(campaign, analytics);
      openEntries.push({ rate: open, weight });
      clickEntries.push({ rate: click, weight });
    });
    return {
      avgOpenRate: weightedAverageRate(openEntries),
      avgClickRate: weightedAverageRate(clickEntries),
    };
  }, [sentCampaigns, analyticsResults]);

  if (overviewQuery.isLoading) {
    return <StatCardsSkeleton withIcon={false} />;
  }

  const overview = overviewQuery.data;
  if (overviewQuery.isError || !overview) return null;

  const rangeDays = overview.rangeDays ?? 30;
  const { allowance } = overview;
  const used = allowance?.used ?? 0;
  const limit = allowance?.limit ?? null;

  const cards = [
    {
      label: `Messages sent (${rangeDays}d)`,
      value: formatCount(overview.totals?.messagesSent),
      // hint: "Email + in-app push",  // hidden until engagement tracking lands
    },
    {
      label: "Open rate",
      value: formatPercentage(avgOpenRate),
      hint:
        sentCampaigns.length > 0
          ? `across ${sentCampaigns.length} sent`
          : undefined,
    },
    {
      label: "Click rate",
      value: formatPercentage(avgClickRate),
      hint:
        sentCampaigns.length > 0
          ? `across ${sentCampaigns.length} sent`
          : undefined,
    },
    {
      label: "Monthly allowance",
      value:
        typeof limit === "number" ? (
          <>
            {formatCount(used)}
            <span className="text-lg font-normal text-muted-foreground">
              {" "}
              / {formatCount(limit)}
            </span>
          </>
        ) : (
          formatCount(used)
        ),
      hint:
        typeof limit === "number"
          ? `resets ${resetLabel(allowance?.resetsAt)}`
          : "unlimited",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-card p-5"
        >
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {card.value}
          </p>
          {card.hint ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {card.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
