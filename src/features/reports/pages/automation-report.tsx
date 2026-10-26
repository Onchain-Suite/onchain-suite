"use client";

import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  InboxArrowDownIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactElement, useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/page/page-header";
import { Button } from "@/ui/button";

import { cn } from "@/lib/utils";

import { useOrgSwitcherContextOptional } from "@/features/common/layout/components/org-switcher-context";
import {
  type AutomationReportRow,
  buildAutomationReport,
  COMPANY_DOMAIN_SCAN_MAX_PAGES,
  COMPANY_DOMAIN_SCAN_PAGE_SIZE,
  scanCompanyDomains,
} from "@/features/reports/automation-report.service";
import { AutomationReportSkeleton } from "@/features/reports/components/automation-report-skeleton";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const formatCount = (value: number) => value.toLocaleString();
const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;

/** Contacts the domain scan can reach before it reports a sample. */
const DOMAIN_SCAN_CEILING =
  COMPANY_DOMAIN_SCAN_MAX_PAGES * COMPANY_DOMAIN_SCAN_PAGE_SIZE;

interface ScanProgress {
  scanned: number;
  withEmail: number;
  companyDomain: number;
}

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

export function AutomationReportPage(): ReactElement {
  const orgSwitcher = useOrgSwitcherContextOptional();
  const organizationId = orgSwitcher?.confirmedActiveOrgId ?? null;
  const organizationName = orgSwitcher?.activeOrg?.name ?? null;

  const queryClient = useQueryClient();
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [reportProgress, setReportProgress] = useState<ReportProgress | null>(
    null
  );
  const [renderedAt, setRenderedAt] = useState<Date | null>(null);

  const reportQuery = useQuery({
    queryKey: ["reports", "automation", "summary", organizationId],
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

  const domainScanQuery = useQuery({
    queryKey: ["reports", "automation", "company-domains", organizationId],
    queryFn: ({ signal }) =>
      scanCompanyDomains({
        signal,
        onProgress: (progress) =>
          setScanProgress({
            scanned: progress.scanned,
            withEmail: progress.withEmail,
            companyDomain: progress.companyDomain,
          }),
      }),
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
    setScanProgress(null);
    queryClient
      .invalidateQueries({ queryKey: ["reports", "automation"] })
      .catch(() => undefined);
  }, [queryClient]);

  if (!organizationId) {
    return <AutomationReportSkeleton />;
  }

  if (reportQuery.isPending) {
    return <AutomationReportSkeleton />;
  }

  if (reportQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <PageHeader
          title="Automation report"
          description={organizationName ?? undefined}
        />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="h-8 w-8 text-muted-foreground/60"
          />
          <p className="mt-3 text-sm font-semibold text-foreground">
            Couldn&apos;t build the report
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
      </div>
    );
  }

  const report = reportQuery.data;
  const { totals, rows } = report;
  const scan = domainScanQuery.data;

  // The scan touches contacts one page at a time, so it reports what it has
  // already counted instead of holding the tile blank.
  const domainValue = scan
    ? formatCount(scan.companyDomain)
    : (scanProgress?.companyDomain ?? null) !== null
      ? formatCount(scanProgress?.companyDomain ?? 0)
      : "—";

  const domainHint = (() => {
    if (domainScanQuery.isError) return "contact scan unavailable";
    if (domainScanQuery.isPending) {
      const scanned = scanProgress?.scanned ?? 0;
      const total = scan?.totalContacts;
      return scanned > 0
        ? `scanning ${formatCount(scanned)} contacts…`
        : `scanning up to ${formatCount(total ?? DOMAIN_SCAN_CEILING)} contacts…`;
    }
    if (!scan) return "not available";
    if (scan.withEmail === 0) return "no contacts have an email address";
    const base = `of ${formatCount(scan.withEmail)} emails on file`;
    return scan.truncated
      ? `${base} · sampled from the first ${formatCount(scan.scanned)} contacts`
      : base;
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
      hint: `${formatCount(totals.opened)} of ${formatCount(totals.delivered)} delivered emails opened · summed across automations ${formatPercent(totals.openRateSum)}`,
    },
    {
      key: "ctr",
      label: "Click-through rate",
      value: totals.clickRate,
      hint: `${formatCount(totals.clicked)} of ${formatCount(totals.delivered)} delivered emails clicked · summed across automations ${formatPercent(totals.clickRateSum)}`,
    },
    {
      key: "running",
      label: "Still running",
      value: totals.runningPercent,
      hint: `${formatCount(totals.activeCount)} of ${formatCount(totals.totalCount)} automations active`,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <PageHeader
        title="Automation report"
        description={
          organizationName
            ? `${organizationName} · email captured, delivery and engagement across every automation.`
            : "Email captured, delivery and engagement across every automation."
        }
        actions={
          <div className="flex items-center gap-3">
            {renderedAt ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Updated {renderedAt.toLocaleTimeString()}
              </span>
            ) : null}
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={refresh}
              disabled={reportQuery.isFetching || domainScanQuery.isFetching}
            >
              <ArrowPathIcon
                aria-hidden="true"
                className={cn(
                  "mr-1.5 h-4 w-4",
                  (reportQuery.isFetching || domainScanQuery.isFetching) &&
                    "animate-spin"
                )}
              />
              Refresh
            </Button>
          </div>
        }
      />

      <StatStrip tiles={tiles} />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {meters.map((meter) => (
          <RateMeter
            key={meter.key}
            label={meter.label}
            value={meter.value}
            hint={meter.hint}
          />
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            Email captured by automation
          </h2>
          {reportQuery.isFetching && !reportQuery.isPending ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowPathIcon
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin"
              />
              {reportProgress
                ? `reading stats ${formatCount(reportProgress.current)}/${formatCount(reportProgress.total)}`
                : "refreshing"}
            </span>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <InboxArrowDownIcon
              aria-hidden="true"
              className="h-8 w-8 text-muted-foreground/60"
            />
            <p className="mt-3 text-sm font-semibold text-foreground">
              No automations to report on
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Once an automation captures its first contact, its numbers appear
              here.
            </p>
            <Button asChild className="mt-5 rounded-xl">
              <Link href={PRIVATE_ROUTES.AUTOMATIONS}>Go to automations</Link>
            </Button>
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
                This workspace has more automations than the report reads in one
                pass, so the totals cover only the first ones returned.
              </span>
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default AutomationReportPage;
