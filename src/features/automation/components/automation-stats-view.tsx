"use client";

import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactElement, useCallback, useEffect, useState } from "react";

import { Button } from "@/ui/button";

import { cn } from "@/lib/utils";

import {
  type AutomationReportRow,
  buildAutomationReport,
  fetchAutomationTimeSeries,
  fetchEmailDomainSummary,
} from "../automation-report.service";
import {
  AutomationTrendChart,
  CapturedByAutomationChart,
  CompanyDomainChart,
  DeliveryFunnelChart,
  EngagementByAutomationChart,
} from "./automation-report-charts";
import { AutomationStatsSkeleton } from "./automation-stats-skeleton";
import { useOrgSwitcherContextOptional } from "@/features/common/layout/components/org-switcher-context";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const formatCount = (value: number) => value.toLocaleString();
const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;

/** Query key root - shared with the Refresh button so every query invalidates. */
const REPORT_QUERY_ROOT = ["reports", "automation"] as const;

interface ReportProgress {
  current: number;
  total: number;
}

const STATUS_TONE: Record<string, string> = {
  active: "text-emerald-600 dark:text-emerald-400",
  paused: "text-amber-600 dark:text-amber-400",
  draft: "text-muted-foreground",
};

/**
 * One hairline-joined strip rather than four floating cards - the numbers are
 * one reading, not four competing ones.
 */
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

/**
 * A meter, deliberately not another tile: these three are ratios, so the bar
 * carries the magnitude the way a large number cannot.
 */
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

function AutomationRowCells({ row }: { row: AutomationReportRow }) {
  const tone = STATUS_TONE[row.status] ?? "text-muted-foreground";
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/40">
      <td className="px-5 py-4">
        <Link
          href={PRIVATE_ROUTES.AUTOMATION(row.id)}
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
        {formatCount(row.captured)}
      </td>
      <td className="px-4 py-4 text-right tabular-nums text-foreground">
        {row.statsAvailable ? formatCount(row.delivered) : "—"}
      </td>
      <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
        {formatPercent(row.openRate)}
      </td>
      <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
        {formatPercent(row.clickRate)}
      </td>
      <td className="px-4 py-4 text-right tabular-nums text-foreground">
        {formatPercent(row.completionRate)}
      </td>
    </tr>
  );
}

/**
 * The Stats tab: every number the automations feature reports, read across the
 * whole workspace rather than per automation.
 */
export function AutomationStatsView(): ReactElement {
  const orgSwitcher = useOrgSwitcherContextOptional();
  const organizationId = orgSwitcher?.confirmedActiveOrgId ?? null;

  const queryClient = useQueryClient();
  const [reportProgress, setReportProgress] = useState<ReportProgress | null>(
    null
  );
  const [renderedAt, setRenderedAt] = useState<Date | null>(null);

  const reportQuery = useQuery({
    queryKey: [...REPORT_QUERY_ROOT, "summary", organizationId],
    queryFn: ({ signal }) =>
      buildAutomationReport({
        signal,
        onProgress: (progress) => setReportProgress(progress),
      }),
    enabled: Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const domainSummaryQuery = useQuery({
    queryKey: [...REPORT_QUERY_ROOT, "email-domains", organizationId],
    queryFn: ({ signal }) => fetchEmailDomainSummary({ signal }),
    enabled: Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const trendQuery = useQuery({
    queryKey: [...REPORT_QUERY_ROOT, "time-series", organizationId],
    queryFn: ({ signal }) => fetchAutomationTimeSeries("30days", { signal }),
    enabled: Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const refreshedAt = reportQuery.dataUpdatedAt;
  useEffect(() => {
    if (!refreshedAt) return;
    setRenderedAt(new Date(refreshedAt));
  }, [refreshedAt]);

  const refresh = useCallback(() => {
    setReportProgress(null);
    queryClient
      .invalidateQueries({ queryKey: REPORT_QUERY_ROOT })
      .catch(() => undefined);
  }, [queryClient]);

  if (!organizationId) {
    return <AutomationStatsSkeleton />;
  }

  if (reportQuery.isPending) {
    return <AutomationStatsSkeleton />;
  }

  if (reportQuery.isError) {
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
          {reportQuery.error instanceof Error
            ? reportQuery.error.message
            : "The automation metrics request failed."}
        </p>
        <Button className="mt-5 rounded-xl" onClick={refresh}>
          Try again
        </Button>
      </div>
    );
  }

  const report = reportQuery.data;
  const { totals, rows } = report;
  const domains = domainSummaryQuery.data;
  const isRefreshing =
    (reportQuery.isFetching && !reportQuery.isPending) ||
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
      value: formatCount(totals.captured),
      hint: `entered any of ${formatCount(totals.totalCount)} automations`,
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
      value: formatPercent(totals.completionRate),
      hint: "enrolments that reached the end",
    },
  ];

  const meters = [
    {
      key: "open",
      label: "Open rate",
      value: totals.openRate,
      hint: `${formatCount(totals.opened)} of ${formatCount(totals.delivered)} delivered opened · summed across automations ${formatPercent(totals.openRateSum)}`,
    },
    {
      key: "ctr",
      label: "Click-through rate",
      value: totals.clickRate,
      hint: `${formatCount(totals.clicked)} of ${formatCount(totals.delivered)} delivered clicked · summed across automations ${formatPercent(totals.clickRateSum)}`,
    },
    {
      key: "running",
      label: "Still running",
      value: totals.runningPercent,
      hint: `${formatCount(totals.activeCount)} of ${formatCount(totals.totalCount)} automations active`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {reportQuery.isFetching && !reportQuery.isPending && reportProgress ? (
          <span className="text-xs text-muted-foreground">
            reading stats {formatCount(reportProgress.current)}/
            {formatCount(reportProgress.total)}
          </span>
        ) : renderedAt ? (
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
          <AutomationTrendChart series={trendQuery.data} />
        ) : null}
        <CompanyDomainChart
          companyDomain={domains?.companyDomain ?? 0}
          consumerDomain={domains?.consumerDomain ?? 0}
          totalEmails={domains?.withEmail ?? 0}
          truncated={false}
        />
        <DeliveryFunnelChart
          delivered={totals.delivered}
          opened={totals.opened}
          clicked={totals.clicked}
        />
        <CapturedByAutomationChart rows={rows} />
        <EngagementByAutomationChart rows={rows} />
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
          Email captured by automation
        </h2>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <p className="text-sm font-semibold text-foreground">
              No automations to report on
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Once an automation captures its first contact, its numbers appear
              here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3">Automation</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Captured</th>
                    <th className="px-4 py-3 text-right">Delivered</th>
                    <th className="px-4 py-3 text-right">Open rate</th>
                    <th className="px-4 py-3 text-right">CTR</th>
                    <th className="px-4 py-3 text-right">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <AutomationRowCells key={row.id} row={row} />
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
              Captured counts contacts enrolled into an automation (
              {formatCount(totals.entriesLast30d)} enrolled in the last 30
              days). Delivered, open rate and CTR come from each
              automation&apos;s message stats.
            </span>
          </p>
          <p className="inline-flex items-start gap-1.5">
            <EnvelopeIcon
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
            />
            <span>
              {formatCount(totals.optInEmailsSent)} double opt-in confirmation
              emails were sent in the last 30 days and are not counted as
              captured contacts until they confirm.
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
          {report.automationsTruncated ? (
            <p className="inline-flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
              <ExclamationTriangleIcon
                aria-hidden="true"
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
              />
              <span>
                This workspace has more automations than the stats view reads in
                one pass, so the totals cover only the first ones returned.
              </span>
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default AutomationStatsView;
