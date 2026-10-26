"use client";

import {
  ArrowDownTrayIcon,
  ArrowTrendingDownIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClockIcon,
  CursorArrowRaysIcon,
  EnvelopeIcon,
  EyeIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

import { Button } from "@/ui/button";

import {
  FORM_ANALYTICS_RANGES,
  type FormAnalyticsRange,
} from "../contracts/analytics";
import { useFormAnalytics } from "../hooks/use-forms";
import { computeFunnel } from "../utils/funnel";

function fmt(n?: number): string {
  return typeof n === "number" ? n.toLocaleString() : "-";
}

/** One funnel metric card: value, and an optional sub-line (rates / status). */
function MetricCard({
  icon,
  label,
  value,
  sub,
  subMuted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  subMuted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
      {sub ? (
        <p
          className={
            subMuted
              ? "mt-1 text-xs text-muted-foreground/70"
              : "mt-1 text-xs text-muted-foreground"
          }
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The Performance funnel at the top of the Submissions tab: views -> starts ->
 * completions, with a biggest-drop-off insight, a date-range picker and CSV
 * export. Completions come from the real submissions total; views and starts
 * come from `getFormAnalytics` and read "Not tracked yet" until that backend
 * ships, so no rate is ever fabricated.
 */
export function FormPerformance({
  formId,
  completionsFallback,
  onExport,
  exporting,
  exportDisabled,
}: {
  formId: string;
  completionsFallback: number;
  onExport: () => void;
  exporting: boolean;
  exportDisabled: boolean;
}) {
  const [range, setRange] = useState<FormAnalyticsRange>("30d");
  const { data } = useFormAnalytics(formId, range);

  const funnel = computeFunnel(
    {
      views: data?.views,
      starts: data?.starts,
      completions: data?.completions ?? completionsFallback,
    },
    data?.biggestDropOff
  );

  const startsSub =
    typeof funnel.starts !== "number"
      ? "Not tracked yet"
      : typeof funnel.startsPctOfViews === "number"
        ? `${funnel.startsPctOfViews}% of views`
        : undefined;

  const completionClauses = [
    typeof funnel.completionsPctOfStarts === "number"
      ? `${funnel.completionsPctOfStarts}% of starts`
      : null,
    typeof funnel.completionsPctOfViews === "number"
      ? `${funnel.completionsPctOfViews}% overall`
      : null,
  ].filter(Boolean);

  // Double-opt-in: % of the confirmation emails we sent that got clicked.
  const confirmedPct =
    data?.confirmationsSent &&
    data.confirmationsSent > 0 &&
    typeof data.confirmed === "number"
      ? Math.round((data.confirmed / data.confirmationsSent) * 1000) / 10
      : undefined;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-foreground">Performance</h2>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as FormAnalyticsRange)}
            aria-label="Date range"
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            {FORM_ANALYTICS_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={exportDisabled || exporting}
          >
            <ArrowDownTrayIcon className="size-4" aria-hidden="true" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<EyeIcon className="size-4" aria-hidden="true" />}
          label="Views"
          value={fmt(funnel.views)}
          sub={typeof funnel.views !== "number" ? "Not tracked yet" : undefined}
          subMuted
        />
        <MetricCard
          icon={<CursorArrowRaysIcon className="size-4" aria-hidden="true" />}
          label="Starts"
          value={fmt(funnel.starts)}
          sub={startsSub}
          subMuted={typeof funnel.starts !== "number"}
        />
        <MetricCard
          icon={<CheckCircleIcon className="size-4" aria-hidden="true" />}
          label="Completions"
          value={fmt(funnel.completions)}
          sub={
            completionClauses.length > 0
              ? completionClauses.join(" · ")
              : undefined
          }
        />
      </div>

      {funnel.dropOff ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowTrendingDownIcon className="size-3.5" aria-hidden="true" />
          {funnel.dropOff}
        </p>
      ) : null}

      {data?.doubleOptIn ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Double opt-in</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard
              icon={<EnvelopeIcon className="size-4" aria-hidden="true" />}
              label="Submitted"
              value={fmt(data.submissions)}
            />
            <MetricCard
              icon={<PaperAirplaneIcon className="size-4" aria-hidden="true" />}
              label="Confirmation sent"
              value={fmt(data.confirmationsSent)}
              sub="opt-in emails sent"
              subMuted
            />
            <MetricCard
              icon={<CheckBadgeIcon className="size-4" aria-hidden="true" />}
              label="Confirmed"
              value={fmt(data.confirmed)}
              sub={
                typeof confirmedPct === "number"
                  ? `${confirmedPct}% of sent`
                  : undefined
              }
            />
            <MetricCard
              icon={<ClockIcon className="size-4" aria-hidden="true" />}
              label="Pending"
              value={fmt(data.pendingConfirmation)}
              sub="emailed, not yet confirmed"
              subMuted
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
