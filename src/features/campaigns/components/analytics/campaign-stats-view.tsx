"use client";

import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactElement, useCallback, useEffect, useState } from "react";

import { Button } from "@/ui/button";

import { cn } from "@/lib/utils";

import {
  campaignsService,
  type CampaignSummaryRow,
} from "../../campaigns.service";
import {
  EngagementByCampaignChart,
  RecipientsByCampaignChart,
} from "./campaign-breakdown-charts";
import {
  CampaignTrendChart,
  CompanyDomainChart,
  DeliveryFunnelChart,
} from "./campaign-stats-charts";
import { audienceService } from "@/features/audience/audience.service";
import { useOrgSwitcherContextOptional } from "@/features/common/layout/components/org-switcher-context";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const formatCount = (value: number) => value.toLocaleString();
const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;

/** Query key root - shared with the Refresh button so every query invalidates. */
const REPORT_QUERY_ROOT = ["reports", "campaign"] as const;

const STATUS_TONE: Record<string, string> = {
  sent: "text-emerald-600 dark:text-emerald-400",
  sending: "text-sky-600 dark:text-sky-400",
  scheduled: "text-sky-600 dark:text-sky-400",
  paused: "text-amber-600 dark:text-amber-400",
  draft: "text-muted-foreground",
  archived: "text-muted-foreground",
};

function StatStrip({
  tiles,
}: {
  tiles: { key: string; label: string; value: string; hint: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.key} className="bg-card px-5 py-5">
          <p className="text-sm text-muted-foreground">{tile.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            {tile.value}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">{tile.hint}</p>
        </div>
      ))}
    </div>
  );
}

function RateMeter({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null;
  hint: string;
}) {
  const clamped = value === null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {formatPercent(value)}
        </p>
      </div>
      <div
        role="presentation"
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((k) => (
          <div key={k} className="space-y-3 bg-card px-5 py-5">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-20 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {["a", "b", "c", "d"].map((k) => (
          <div
            key={k}
            className="h-72 rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}

function CampaignRowCells({ row }: { row: CampaignSummaryRow }) {
  const tone = STATUS_TONE[row.status] ?? "text-muted-foreground";
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/40">
      <td className="px-5 py-4">
        <Link
          href={PRIVATE_ROUTES.CAMPAIGN(row.id)}
          className="group inline-flex items-center gap-1.5 font-medium text-foreground"
        >
          <span className="max-w-[18rem] truncate">{row.name}</span>
          <ArrowTopRightOnSquareIcon
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
        </Link>
      </td>
      <td className="px-4 py-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium capitalize",
            tone
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {row.status}
        </span>
      </td>
      <td className="px-4 py-4 text-right tabular-nums text-foreground">
        {formatCount(row.sent)}
      </td>
      <td className="px-4 py-4 text-right tabular-nums text-foreground">
        {formatCount(row.delivered)}
      </td>
      <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
        {formatPercent(row.openRate)}
      </td>
      <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
        {formatPercent(row.clickRate)}
      </td>
    </tr>
  );
}

/**
 * The campaigns twin of {@link AutomationStatsView}: every number the campaigns
 * feature reports, read across the whole workspace rather than per campaign.
 * Takes no props - reads the active org from the switcher context.
 */
export function CampaignStatsView(): ReactElement {
  const orgSwitcher = useOrgSwitcherContextOptional();
  const organizationId = orgSwitcher?.confirmedActiveOrgId ?? null;

  const queryClient = useQueryClient();
  const [renderedAt, setRenderedAt] = useState<Date | null>(null);

  const summaryQuery = useQuery({
    queryKey: [...REPORT_QUERY_ROOT, "summary", organizationId],
    queryFn: ({ signal }) =>
      campaignsService.getAnalyticsSummary(undefined, { signal }),
    enabled: Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const domainSummaryQuery = useQuery({
    queryKey: [...REPORT_QUERY_ROOT, "email-domains", organizationId],
    queryFn: ({ signal }) => audienceService.getEmailDomainSummary({ signal }),
    enabled: Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const trendQuery = useQuery({
    queryKey: [...REPORT_QUERY_ROOT, "time-series", organizationId],
    queryFn: ({ signal }) =>
      campaignsService.getAnalyticsTimeSeries("30days", undefined, { signal }),
    enabled: Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const refreshedAt = summaryQuery.dataUpdatedAt;
  useEffect(() => {
    if (!refreshedAt) return;
    setRenderedAt(new Date(refreshedAt));
  }, [refreshedAt]);

  const refresh = useCallback(() => {
    queryClient
      .invalidateQueries({ queryKey: REPORT_QUERY_ROOT })
      .catch(() => undefined);
  }, [queryClient]);

  if (!organizationId || summaryQuery.isPending) {
    return <StatsSkeleton />;
  }

  if (summaryQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <ExclamationTriangleIcon
          aria-hidden="true"
          className="h-8 w-8 text-muted-foreground/60"
        />
        <p className="mt-3 text-sm font-semibold text-foreground">
          Couldn&apos;t build the stats view
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {summaryQuery.error instanceof Error
            ? summaryQuery.error.message
            : "The campaign metrics request failed."}
        </p>
        <Button className="mt-5 rounded-xl" onClick={refresh}>
          Try again
        </Button>
      </div>
    );
  }

  const { totals, rows, status } = summaryQuery.data;
  const domains = domainSummaryQuery.data;
  const isRefreshing =
    (summaryQuery.isFetching && !summaryQuery.isPending) ||
    domainSummaryQuery.isFetching ||
    trendQuery.isFetching;

  const domainValue = domains ? formatCount(domains.companyDomain) : "—";
  const domainHint = (() => {
    if (domainSummaryQuery.isError) return "contact lookup unavailable";
    if (domainSummaryQuery.isPending) return "counting company domains…";
    if (!domains) return "not available";
    if (domains.withEmail === 0) return "no contacts have an email address";
    return `of ${formatCount(domains.withEmail)} emails on file`;
  })();

  const tiles = [
    {
      key: "captured",
      label: "Emails captured",
      value: formatCount(totals.sent),
      hint: `recipients across ${formatCount(totals.campaigns)} campaigns`,
    },
    {
      key: "delivered",
      label: "Emails delivered",
      value: formatCount(totals.delivered),
      hint: `${formatCount(totals.opened)} opens · ${formatCount(totals.clicked)} clicks`,
    },
    {
      key: "domains",
      label: "Valid company domains",
      value: domainValue,
      hint: domainHint,
    },
    {
      key: "completion",
      label: "Completion",
      value: formatPercent(status.completionRate),
      hint: `${formatCount(status.completed)} of ${formatCount(status.launched)} launched finished sending`,
    },
  ];

  const meters = [
    {
      key: "open",
      label: "Open rate",
      value: totals.openRate,
      hint: `${formatCount(totals.opened)} of ${formatCount(totals.delivered)} delivered opened`,
    },
    {
      key: "ctr",
      label: "Click-through rate",
      value: totals.clickRate,
      hint: `${formatCount(totals.clicked)} of ${formatCount(totals.delivered)} delivered clicked`,
    },
    {
      key: "running",
      label: "Still running",
      value: status.runningRate,
      hint: `${formatCount(status.running)} of ${formatCount(status.launched)} launched campaigns sending`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {renderedAt ? (
          <span className="text-xs text-muted-foreground">
            Updated {renderedAt.toLocaleTimeString()}
          </span>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <ArrowPathIcon
            aria-hidden="true"
            className={cn("mr-1.5 h-4 w-4", isRefreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <StatStrip tiles={tiles} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {trendQuery.data ? (
          <CampaignTrendChart series={trendQuery.data.series} />
        ) : null}
        <CompanyDomainChart
          companyDomain={domains?.companyDomain ?? 0}
          consumerDomain={domains?.consumerDomain ?? 0}
          totalEmails={domains?.withEmail ?? 0}
        />
        <DeliveryFunnelChart
          delivered={totals.delivered}
          opened={totals.opened}
          clicked={totals.clicked}
        />
        <RecipientsByCampaignChart rows={rows} />
        <EngagementByCampaignChart rows={rows} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {meters.map((meter) => (
          <RateMeter
            key={meter.key}
            label={meter.label}
            value={meter.value}
            hint={meter.hint}
          />
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Email captured by campaign
        </h2>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <p className="text-sm font-semibold text-foreground">
              No campaigns to report on
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Once a campaign sends its first email, its numbers appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3">Campaign</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Recipients</th>
                    <th className="px-4 py-3 text-right">Delivered</th>
                    <th className="px-4 py-3 text-right">Open rate</th>
                    <th className="px-4 py-3 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <CampaignRowCells key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <p className="inline-flex items-start gap-1.5">
            <CheckCircleIcon
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
            />
            <span>
              Recipients counts the contacts a campaign was sent to. Delivered,
              open rate and CTR come from each campaign&apos;s delivery events;
              test sends are excluded.
            </span>
          </p>
          <p className="inline-flex items-start gap-1.5">
            <PlayCircleIcon
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
            />
            <span>
              Completion and still-running are measured over launched campaigns
              (drafts and archived campaigns are excluded).
            </span>
          </p>
          <p className="inline-flex items-start gap-1.5">
            <BuildingOffice2Icon
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
            />
            <span>
              A valid company domain is any email domain that is not a consumer
              provider (Gmail, Yahoo, Outlook, iCloud, Proton and similar).
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}

export default CampaignStatsView;
