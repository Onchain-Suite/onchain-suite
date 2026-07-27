"use client";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  PhotoIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/ui/chart";

import {
  type IntelligenceQueryReportChart,
  type IntelligenceQueryReportDataResponse,
  intelligenceService,
} from "../../intelligence.service";
import {
  dropFormattedSiblingColumns,
  preferFormattedCell,
} from "@/features/intelligence/utils";

/** Palette for pie slices / multi-series marks (theme-aware CSS vars). */
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const prettifyLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const truncateMiddle = (value: string, start = 6, end = 4) =>
  value.length <= start + end + 3
    ? value
    : `${value.slice(0, start)}…${value.slice(-end)}`;

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    // One fraction digit once the value compacts (1500 → "1.5K", not "2K");
    // small values keep two for precision (0.25 → "0.25").
    maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 2,
  }).format(value);

const formatAxisTick = (value: unknown): string => {
  if (typeof value === "number") return formatCompact(value);
  const text = String(value ?? "");
  // Date-ish x values render as short dates; long identifiers get shortened.
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
  }
  return text.length > 14 ? truncateMiddle(text, 8, 4) : text;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

/** Trigger a browser download for a blob/data URL without leaving the page. */
const triggerDownload = (href: string, filename: string) => {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

/**
 * Renders one backend-suggested chart (line/bar/pie) in a card with an
 * OnchainSuite branding footer and a PNG export action. The whole card —
 * title, chart, footer — is what gets rasterized, so the exported image is
 * share-ready for social/investor updates.
 */
type ChartDisplayType = "line" | "bar" | "pie";

function ReportChartCard({
  chart,
  compact = false,
}: {
  chart: IntelligenceQueryReportChart;
  compact?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  // Users can re-render the suggested chart as any type — keys are mapped
  // across shapes (x/y ↔ label/value) below.
  const [displayType, setDisplayType] = useState<ChartDisplayType>(
    chart.type === "bar" || chart.type === "pie" ? chart.type : "line"
  );

  const handleExportImage = useCallback(async () => {
    const node = cardRef.current;
    if (!node) return;
    setExporting(true);
    try {
      // Loaded on demand so the rasterizer stays out of the main bundle.
      const { toPng } = await import("html-to-image");
      const background =
        typeof window !== "undefined"
          ? window.getComputedStyle(node).backgroundColor
          : undefined;
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor:
          background && background !== "rgba(0, 0, 0, 0)"
            ? background
            : undefined,
      });
      triggerDownload(
        dataUrl,
        `onchainsuite-${displayType}-${slugify(chart.title) || "chart"}.png`
      );
    } catch {
      toast.error("Failed to export chart image");
    } finally {
      setExporting(false);
    }
  }, [chart.title, displayType]);

  // Axis charts need x/y; pie needs label/value — each falls back to the
  // other pair so any suggested chart can render as any display type.
  const xKey = chart.xKey ?? chart.labelKey ?? "";
  const yKey = chart.yKey ?? chart.valueKey ?? "";
  const labelKey = chart.labelKey ?? chart.xKey ?? "";
  const valueKey = chart.valueKey ?? chart.yKey ?? "";

  const chartConfig =
    displayType === "pie"
      ? { [valueKey]: { label: prettifyLabel(valueKey || "value") } }
      : {
          [yKey]: {
            label: prettifyLabel(yKey || "value"),
            color: "var(--chart-1)",
          },
        };

  let body = null;
  if (displayType === "line" && xKey && yKey) {
    body = (
      <LineChart data={chart.data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tickFormatter={formatAxisTick}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={formatAxisTick}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    );
  } else if (displayType === "bar" && xKey && yKey) {
    body = (
      <BarChart data={chart.data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
          tickFormatter={formatAxisTick}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={formatAxisTick}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey={yKey} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    );
  } else if (displayType === "pie" && labelKey && valueKey) {
    body = (
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey={labelKey} />} />
        <Pie
          data={chart.data}
          dataKey={valueKey}
          nameKey={labelKey}
          innerRadius="45%"
          outerRadius="80%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {chart.data.map((entry, index) => (
            <Cell
              key={String(entry[labelKey] ?? index)}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
      </PieChart>
    );
  }

  if (!body) return null;

  return (
    <div
      ref={cardRef}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">
            {prettifyLabel(chart.title)}
          </div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {displayType === "line"
              ? "Trend"
              : displayType === "bar"
                ? "Comparison"
                : "Share"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="inline-flex overflow-hidden rounded-lg border border-border"
            role="group"
            aria-label="Chart type"
          >
            {(["line", "bar", "pie"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDisplayType(type)}
                aria-pressed={displayType === type}
                className={`px-2 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                  displayType === type
                    ? "bg-primary/10 text-primary"
                    : "bg-background text-muted-foreground hover:bg-muted/40"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExportImage}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
            aria-label={`Export ${chart.title} as image`}
          >
            {exporting ? (
              <ArrowPathIcon
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <PhotoIcon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Export image
          </button>
        </div>
      </div>
      <div className="px-2 py-3">
        <ChartContainer
          config={chartConfig}
          className={compact ? "aspect-[2/1] w-full" : "aspect-[16/9] w-full"}
        >
          {body}
        </ChartContainer>
      </div>
      {/* Branding footer — part of the card so it lands in the exported PNG. */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2.5">
        <span className="text-xs font-semibold tracking-tight text-foreground">
          OnchainSuite
        </span>
        <span className="text-[11px] text-muted-foreground">
          Onchain intelligence · onchainsuite.com
        </span>
      </div>
    </div>
  );
}

/** Wallet cell — shortened for display, one click copies the full address. */
function WalletCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        if (timeoutRef.current !== null)
          window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
          setCopied(false);
          timeoutRef.current = null;
        }, 1500);
      })
      .catch(() => toast.error("Failed to copy address"));
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={value}
      aria-label={`Copy ${value}`}
      className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
    >
      {truncateMiddle(value, 8, 6)}
      {copied ? (
        <CheckIcon className="h-3 w-3 text-emerald-500" aria-hidden="true" />
      ) : (
        <ClipboardDocumentIcon
          className="h-3 w-3 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

const REPORT_ROW_HEIGHT = 41;

/** Virtualized report table; wallet-typed columns render as copyable chips. */
function ReportTable({
  report,
}: {
  report: IntelligenceQueryReportDataResponse;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const { rows } = report.table;
  const columns = dropFormattedSiblingColumns(report.table.columns);
  const walletColumns = new Set(
    report.columns.filter((c) => c.type === "wallet").map((c) => c.key)
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => REPORT_ROW_HEIGHT,
    overscan: 12,
    // Render a sensible first window before the scroll element is measured
    // (also keeps jsdom-based tests deterministic).
    initialRect: { width: 800, height: 380 },
  });
  const items = virtualizer.getVirtualItems();
  const total = virtualizer.getTotalSize();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom =
    items.length > 0 ? total - items[items.length - 1].end : 0;

  if (rows.length === 0 || columns.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div ref={parentRef} className="max-h-[380px] overflow-auto">
        <table
          className="w-full text-sm"
          style={{ minWidth: `${columns.length * 140}px` }}
        >
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-muted/60 text-left text-xs font-medium text-muted-foreground backdrop-blur">
              {columns.map((column) => (
                <th key={column} className="truncate px-4 py-3">
                  {prettifyLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 ? (
              <tr style={{ height: paddingTop }}>
                <td colSpan={columns.length} />
              </tr>
            ) : null}
            {items.map((vi) => {
              const row = rows[vi.index];
              return (
                <tr
                  key={vi.index}
                  style={{ height: REPORT_ROW_HEIGHT }}
                  className="border-b border-border/50 transition-colors hover:bg-muted/50"
                >
                  {columns.map((column) => {
                    const value = preferFormattedCell(row, column);
                    const text =
                      value === null || value === undefined
                        ? ""
                        : String(value);
                    return (
                      <td key={column} className="truncate px-4 py-2">
                        {walletColumns.has(column) && text.length > 0 ? (
                          <WalletCell value={text} />
                        ) : (
                          <span title={text}>{text}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {paddingBottom > 0 ? (
              <tr style={{ height: paddingBottom }}>
                <td colSpan={columns.length} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface ReportViewProps {
  queryId: string;
  /** Denser layout: smaller charts, three-up grid, no table. */
  compact?: boolean;
}

/**
 * Visual report layer for a stored MCP/SQL query: backend-suggested charts,
 * stat tiles per numeric column, a wallet-aware table, plus CSV and PNG
 * export. Data comes from `GET /intelligence/query/:queryId/report-data` —
 * a pure transformation over the stored rows, so rendering it costs no
 * GoldRush credits.
 */
export function ReportView({ queryId, compact = false }: ReportViewProps) {
  const [csvPending, setCsvPending] = useState(false);

  const reportQuery = useQuery({
    queryKey: ["intelligence", "query", queryId, "report-data"],
    queryFn: () => intelligenceService.getQueryReportData(queryId),
    enabled: queryId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const handleDownloadCsv = useCallback(async () => {
    setCsvPending(true);
    try {
      const { blob, filename } =
        await intelligenceService.downloadQueryCsv(queryId);
      const url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download CSV");
    } finally {
      setCsvPending(false);
    }
  }, [queryId]);

  const report = reportQuery.data;

  if (reportQuery.isPending) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
        Building report…
      </div>
    );
  }

  if (reportQuery.isError || !report) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground">
          Couldn&apos;t build the report view for this result.
        </span>
        <button
          type="button"
          onClick={() => {
            reportQuery.refetch().catch(() => undefined);
          }}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40"
        >
          Try again
        </button>
      </div>
    );
  }

  if (report.rowCount === 0) return null;

  return (
    <section aria-label="Query report" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!compact ? (
            <>
              <PresentationChartLineIcon
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-foreground">
                Report
              </span>
            </>
          ) : null}
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            {report.rowCount.toLocaleString()} rows
          </span>
        </div>
        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={csvPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
        >
          {csvPending ? (
            <ArrowPathIcon
              className="h-3.5 w-3.5 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <ArrowDownTrayIcon className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Download CSV
        </button>
      </div>

      {report.stats.length > 0 ? (
        compact ? (
          <div className="flex flex-wrap gap-2">
            {report.stats.map((stat) => (
              <span
                key={stat.key}
                className="inline-flex items-baseline gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
                title={`Avg ${formatCompact(stat.avg)} · Min ${formatCompact(stat.min)} · Max ${formatCompact(stat.max)}`}
              >
                <span className="text-muted-foreground">
                  {prettifyLabel(stat.key)}
                </span>
                <span className="font-semibold text-foreground">
                  {formatCompact(stat.sum)}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {report.stats.map((stat) => (
              <div
                key={stat.key}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {prettifyLabel(stat.key)}
                </div>
                <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                  {formatCompact(stat.sum)}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <span>Avg {formatCompact(stat.avg)}</span>
                  <span>Min {formatCompact(stat.min)}</span>
                  <span>Max {formatCompact(stat.max)}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {report.charts.length > 0 ? (
        <div
          className={
            compact ? "grid gap-3 md:grid-cols-2" : "grid gap-4 xl:grid-cols-2"
          }
        >
          {report.charts.map((chart) => (
            <ReportChartCard
              key={`${chart.type}-${chart.title}`}
              chart={chart}
              compact={compact}
            />
          ))}
        </div>
      ) : null}

      {!compact ? <ReportTable report={report} /> : null}
    </section>
  );
}

export default ReportView;
