"use client";

import { useQuery } from "@tanstack/react-query";

import { campaignsService } from "../campaigns.service";
import { formatPercentage } from "../utils";

const formatCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "—";

/**
 * Org-wide engagement snapshot for the campaigns landing page, backed by
 * GET /campaigns/analytics/overview?days=30: per-channel key rates plus the
 * shared monthly message allowance. Renders nothing if the endpoint fails so
 * the campaigns table is never blocked on analytics.
 */
export function CampaignsAnalyticsOverview() {
  const overviewQuery = useQuery({
    queryKey: ["campaigns", "analytics", "overview", 30],
    queryFn: () => campaignsService.getAnalyticsOverview(30),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  if (overviewQuery.isLoading) {
    return (
      <div
        className="grid animate-pulse grid-cols-2 gap-3 md:grid-cols-5"
        aria-hidden="true"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  const overview = overviewQuery.data;
  if (overviewQuery.isError || !overview) return null;

  const rangeDays = overview.rangeDays ?? 30;
  const { allowance } = overview;
  const used = allowance?.used ?? 0;
  const limit = allowance?.limit ?? null;
  const usagePct =
    typeof limit === "number" && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : null;

  const cards = [
    {
      label: `Messages sent (${rangeDays}d)`,
      value: formatCount(overview.totals?.messagesSent),
      hint: "Email + in-app push",
    },
    {
      label: "Email open rate",
      value: formatPercentage(overview.email?.openRate),
      hint: `${formatCount(overview.email?.uniqueOpens)} unique opens`,
    },
    {
      label: "Email click rate",
      value: formatPercentage(overview.email?.clickRate),
      hint: `${formatCount(overview.email?.uniqueClicks)} unique clicks`,
    },
    {
      label: "Push view rate",
      value: formatPercentage(overview.inapp?.viewRate),
      hint: `${formatCount(overview.inapp?.viewed)} viewed`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-border bg-card px-4 py-3"
        >
          <div className="truncate text-xs text-muted-foreground">
            {card.label}
          </div>
          <div className="mt-1 text-xl font-semibold text-foreground">
            {card.value}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {card.hint}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <div className="truncate text-xs text-muted-foreground">
          Monthly allowance
        </div>
        <div className="mt-1 text-xl font-semibold text-foreground">
          {formatCount(used)}
          {typeof limit === "number" ? (
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {formatCount(limit)}
            </span>
          ) : (
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / unlimited
            </span>
          )}
        </div>
        {usagePct !== null ? (
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={usagePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Monthly message allowance used"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${usagePct}%` }}
            />
          </div>
        ) : (
          <div className="truncate text-[11px] text-muted-foreground">
            Email + in-app push combined
          </div>
        )}
      </div>
    </div>
  );
}
