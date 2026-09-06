"use client";

import { ChartPieIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import { type ReactNode, useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/ui/chart";

import { cn } from "@/lib/utils";

/** One label/value pair for the chart tab (derived from the result rows). */
export type ChartSeriesPoint = { label: string; value: number };

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type ResultTab = "table" | "chart";

const formatCompact = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const truncateMiddle = (text: string, head = 6, tail = 4): string =>
  text.length <= head + tail + 1
    ? text
    : `${text.slice(0, head)}…${text.slice(-tail)}`;

const TABS: { id: ResultTab; label: string; icon: typeof TableCellsIcon }[] = [
  { id: "table", label: "Table", icon: TableCellsIcon },
  { id: "chart", label: "Chart", icon: ChartPieIcon },
];

/**
 * Tabbed result surface for a chat answer: Table (the paginated structured
 * render, passed in) and a single donut Chart derived from the rows. The Chart
 * tab is hidden when there's no numeric series to plot.
 */
export function ChatResultCard({
  tableContent,
  series,
}: {
  tableContent: ReactNode;
  series: ChartSeriesPoint[];
}) {
  const hasChart = series.length > 0;
  const [tab, setTab] = useState<ResultTab>("table");

  const total = useMemo(
    () =>
      series.reduce(
        (sum, p) => sum + (Number.isFinite(p.value) ? p.value : 0),
        0
      ),
    [series]
  );

  const chartData = useMemo(
    () => series.map((p) => ({ label: p.label, value: p.value })),
    [series]
  );

  const chartConfig = { value: { label: "Value", color: "var(--chart-1)" } };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border/70 bg-muted/30 px-2 py-1.5">
        {TABS.map(({ id, label, icon: Icon }) => {
          if (id === "chart" && !hasChart) return null;
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {tab === "table" ? <div className="p-4">{tableContent}</div> : null}

      {/* Chart */}
      {tab === "chart" && hasChart ? (
        <div className="p-4">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <ChartContainer config={chartConfig} className="h-44 w-44">
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="label" />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="62%"
                    outerRadius="92%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={entry.label}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-semibold text-foreground">
                  {formatCompact(total)}
                </span>
                <span className="text-[11px] text-muted-foreground">total</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2">
              {series.map((p, i) => {
                const pct = total > 0 ? Math.round((p.value / total) * 100) : 0;
                return (
                  <li key={p.label} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{
                        background: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {truncateMiddle(p.label)}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatCompact(p.value)} · {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ChatResultCard;
