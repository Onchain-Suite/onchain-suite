"use client";

import { useQuery } from "@tanstack/react-query";

import { campaignsService } from "../../campaigns.service";
import type { Campaign } from "../../types";
import { formatPercentage } from "../../utils";

/**
 * Statuses for which the backend can hold engagement events. Draft/scheduled
 * campaigns have never sent anything, so they render "-" (never 0%) and no
 * analytics request is made for them.
 */
const SENT_LIKE_STATUSES: ReadonlySet<Campaign["status"]> = new Set([
  "sent",
  "sending",
  "paused",
  "failed",
]);

interface CampaignRateCellProps {
  campaign: Campaign;
  metric: "openRate" | "clickRate";
}

/**
 * Email open/click rate for one campaign row, sourced from
 * `GET /campaigns/{id}/analytics` (docs/backend.md - rates are percentages,
 * 2 dp) - the authoritative engagement source.
 *
 * The `GET /campaigns` list rows frequently carry `0` (or omit the field) for
 * open/click, which would render a misleading "0.0%". So the list value is
 * trusted only when it's a **positive** number; otherwise we fetch the
 * per-campaign analytics and use that, and show "-" (unknown) rather than 0
 * until it resolves. Only mounted rows fetch - the table paginates
 * client-side, so requests are capped at the visible page, and the query key
 * matches `CampaignAnalyticsDialog` so results are cached once per campaign.
 */
export function CampaignRateCell({ campaign, metric }: CampaignRateCellProps) {
  const listRate =
    metric === "openRate" ? campaign.openRate : campaign.clickRate;
  const canHaveStats = SENT_LIKE_STATUSES.has(campaign.status);
  // A list-row 0 usually just means the list endpoint doesn't carry engagement
  // yet - don't let it mask the real rate. Only a positive value is trusted.
  const listRatePositive = typeof listRate === "number" && listRate > 0;

  const analyticsQuery = useQuery({
    queryKey: ["campaigns", "analytics", campaign.id],
    queryFn: () => campaignsService.getAnalytics(campaign.id),
    enabled: canHaveStats && !listRatePositive && campaign.id.length > 0,
    retry: false,
  });

  let value: number | undefined;
  if (canHaveStats) {
    if (listRatePositive) {
      value = listRate;
    } else {
      const email = analyticsQuery.data?.email;
      // Only show a rate once emails actually went out; a campaign with zero
      // sends (or before analytics resolves) stays "-" instead of 0%.
      value = email && (email.sent ?? 0) > 0 ? email[metric] : undefined;
    }
  }

  if (canHaveStats && !listRatePositive && analyticsQuery.isLoading) {
    return (
      <div
        className="h-4 w-10 animate-pulse rounded bg-muted"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="text-sm text-foreground">{formatPercentage(value)}</div>
  );
}
