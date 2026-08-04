"use client";

import {
  ChartPieIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { type ReactNode, useMemo, useState } from "react";
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

type ResultTab = "table" | "chart" | "sql";
type ChartType = "bar" | "line" | "donut";

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
  { id: "sql", label: "SQL", icon: CodeBracketIcon },
];

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: "bar", label: "Bar" },
  { id: "line", label: "Line" },
  { id: "donut", label: "Donut" },
];

/**
 * Tabbed result surface for a chat answer: Table (the existing structured
 * render, passed in), Chart (Bar / Line / Donut derived from the rows), and SQL
 * (shown when the answer carries a query; otherwise an honest pointer, since MCP
 * answers don't return SQL). Chart/SQL tabs are hidden when they'd be empty.
 */
export function ChatResultCard({
  tableContent,
  series,
  sql,
  onOpenSqlWorkspace,
}: {
  tableContent: ReactNode;
  series: ChartSeriesPoint[];
  sql?: string;
  onOpenSqlWorkspace?: () => void;
}) {
  const hasChart = series.length > 0;
  const [tab, setTab] = useState<ResultTab>("table");
  const [chartType, setChartType] = useState<ChartType>("donut");
  const [copied, setCopied] = useState(false);

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

  const copySql = async () => {
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

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
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Chart type
            </span>
            <div className="inline-flex overflow-hidden rounded-lg border border-border">
              {CHART_TYPES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChartType(c.id)}
                  aria-pressed={chartType === c.id}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium transition-colors",
                    chartType === c.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {chartType === "donut" ? (
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
                  <span className="text-[11px] text-muted-foreground">
                    total
                  </span>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-2">
                {series.map((p, i) => {
                  const pct =
                    total > 0 ? Math.round((p.value / total) * 100) : 0;
                  return (
                    <li
                      key={p.label}
                      className="flex items-center gap-2 text-sm"
                    >
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
          ) : chartType === "bar" ? (
            <ChartContainer
              config={chartConfig}
              className="aspect-[16/9] w-full"
            >
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => truncateMiddle(String(v))}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompact}
                />
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="label" />}
                />
                <Bar
                  dataKey="value"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-[16/9] w-full"
            >
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => truncateMiddle(String(v))}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompact}
                />
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="label" />}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      ) : null}

      {/* SQL */}
      {tab === "sql" ? (
        <div className="p-4">
          {sql && sql.trim().length > 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={copySql}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <CheckIcon
                    className="h-3.5 w-3.5 text-emerald-500"
                    aria-hidden="true"
                  />
                ) : (
                  <ClipboardDocumentIcon
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
              <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 pr-16 font-mono text-xs leading-6 text-foreground">
                {sql}
              </pre>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              This answer came from the onchain agent, not a SQL query, so there
              is no SQL to show.{" "}
              {onOpenSqlWorkspace ? (
                <button
                  type="button"
                  onClick={onOpenSqlWorkspace}
                  className="font-medium text-primary hover:underline"
                >
                  Open the SQL workspace
                </button>
              ) : null}{" "}
              to write and run a query by hand.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ChatResultCard;
