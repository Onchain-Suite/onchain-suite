"use client";

import { useQuery } from "@tanstack/react-query";

import { campaignsService } from "../campaigns.service";
import { useCampaignEngagement } from "../hooks/use-campaign-engagement";
import { formatPercentage } from "../utils";
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
  // campaign's own rate - the SAME hook the Dashboard uses, so both surfaces
  // always show the same number.
  const {
    avgOpenRate,
    avgClickRate,
    ratedCount,
    sentCount,
    totalMessagesSent,
  } = useCampaignEngagement();

  if (overviewQuery.isLoading) {
    return <StatCardsSkeleton withIcon={false} />;
  }

  const overview = overviewQuery.data;
  if (overviewQuery.isError || !overview) return null;

  const { allowance } = overview;
  const used = allowance?.used ?? 0;
  const limit = allowance?.limit ?? null;

  const cards = [
    {
      // All-time total messages sent (the overview endpoint is capped at 30-90
      // days, so it can never total this - the engagement hook sums each
      // campaign's dispatched count instead).
      label: "Messages sent",
      value:
        totalMessagesSent > 0
          ? formatCount(totalMessagesSent)
          : sentCount > 0
            ? "…"
            : formatCount(0),
    },
    {
      label: "Open rate",
      value: formatPercentage(avgOpenRate),
      // Caption the pooled rate with the campaigns that actually contributed to
      // it (not every sent campaign), so a rate over 8 doesn't claim 11.
      hint: ratedCount > 0 ? `across ${ratedCount} sent` : undefined,
    },
    {
      label: "Click rate",
      value: formatPercentage(avgClickRate),
      hint: ratedCount > 0 ? `across ${ratedCount} sent` : undefined,
    },
    {
      // The big number is the allowance (limit, or "Unlimited"); usage rides in
      // the hint. `limit: null` means unlimited - it is not a usage number.
      label: "Monthly allowance",
      value: limit === null ? "Unlimited" : formatCount(limit),
      hint: allowance?.resetsAt
        ? `${formatCount(used)} used · resets ${resetLabel(allowance.resetsAt)}`
        : `${formatCount(used)} used`,
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
