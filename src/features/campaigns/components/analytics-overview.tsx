"use client";

import { useQuery } from "@tanstack/react-query";

import { campaignsService } from "../campaigns.service";
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

  if (overviewQuery.isLoading) {
    return <StatCardsSkeleton withIcon={false} />;
  }

  const overview = overviewQuery.data;
  if (overviewQuery.isError || !overview) return null;

  const rangeDays = overview.rangeDays ?? 30;
  const { allowance } = overview;
  const used = allowance?.used ?? 0;
  const limit = allowance?.limit ?? null;

  // Engagement rates. The backend's `openRate`/`clickRate` count TOTAL opens/
  // clicks against `delivered`, so a heavy re-opener can push them over 100%.
  // Prefer a unique-based rate (uniqueOpens / delivered), which is bounded by
  // 100%; fall back to the raw rate clamped to [0, 100] so an impossible
  // "106.7%" can never render.
  const { email } = overview;
  const denom = email?.delivered ?? email?.sent ?? 0;
  const clampPct = (value?: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : undefined;
  const openRatePct =
    typeof email?.uniqueOpens === "number" && denom > 0
      ? Math.min(100, (email.uniqueOpens / denom) * 100)
      : clampPct(email?.openRate);
  const clickRatePct =
    typeof email?.uniqueClicks === "number" && denom > 0
      ? Math.min(100, (email.uniqueClicks / denom) * 100)
      : clampPct(email?.clickRate);

  const cards = [
    {
      label: `Messages sent (${rangeDays}d)`,
      value: formatCount(overview.totals?.messagesSent),
      // hint: "Email + in-app push",  // hidden until engagement tracking lands
    },
    {
      label: "Open rate",
      value: formatPercentage(openRatePct),
      // hint: `${formatCount(overview.email?.uniqueOpens)} unique opens`,
    },
    {
      label: "Click rate",
      value: formatPercentage(clickRatePct),
      // hint: `${formatCount(overview.email?.uniqueClicks)} unique clicks`,
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
