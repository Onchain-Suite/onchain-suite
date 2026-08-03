"use client";

import {
  ChartBarIcon,
  ChartPieIcon,
  CodeBracketIcon,
  PresentationChartLineIcon,
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

type Row = Record<string, unknown>;

/** Ordered, theme-friendly categorical palette for the chart series. */
const PALETTE = [
  "#3b82f6",
  "#6366f1",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#14b8a6",
  "#eab308",
  "#ec4899",
];

const asNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const isNumericColumn = (rows: Row[], key: string) =>
  rows.some((r) => asNum(r[key]) !== null) &&
  rows.every(
    (r) => r[key] === null || r[key] === undefined || asNum(r[key]) !== null
  );

const shorten = (value: string) =>
  /^0x[a-fA-F0-9]{6,}$/.test(value)
    ? `${value.slice(0, 6)}…${value.slice(-4)}`
    : value;

const cellText = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString();
  return shorten(String(v));
};

const humanize = (key: string) =>
  key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface ResultCardProps {
  rows: Row[];
  sql?: string;
  labelKey?: string;
  valueKey?: string;
  /** Rendered under the tabbed views (Save as segment / Create campaign / …). */
  actions?: ReactNode;
}

type View = "table" | "chart" | "sql";
type ChartType = "bar" | "line" | "donut";

/**
 * Reference result card: one dataset shown as a Table, a Chart (bar / line /
 * donut) or the underlying SQL, with the conversion actions beneath. Columns
 * and the chart's label/value axes are derived from the rows, so it renders any
 * structured query result.
 */
export function ResultCard({
  rows,
  sql,
  labelKey,
  valueKey,
  actions,
}: ResultCardProps) {
  const [view, setView] = useState<View>("table");
  const [chartType, setChartType] = useState<ChartType>("donut");

  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows.slice(0, 20)) {
      Object.keys(row).forEach((k) => keys.add(k));
    }
    return [...keys].slice(0, 8);
  }, [rows]);

  const resolvedLabelKey = useMemo(
    () =>
      labelKey ?? columns.find((c) => !isNumericColumn(rows, c)) ?? columns[0],
    [labelKey, columns, rows]
  );
  const resolvedValueKey = useMemo(
    () =>
      valueKey ??
      columns.find((c) => c !== resolvedLabelKey && isNumericColumn(rows, c)),
    [valueKey, columns, rows, resolvedLabelKey]
  );

  const chartData = useMemo(() => {
    if (!resolvedLabelKey || !resolvedValueKey) return [];
    return rows
      .slice(0, 8)
      .map((r) => ({
        name: shorten(String(r[resolvedLabelKey] ?? "—")),
        value: asNum(r[resolvedValueKey]) ?? 0,
      }))
      .filter((d) => d.value > 0);
  }, [rows, resolvedLabelKey, resolvedValueKey]);

  const total = useMemo(
    () => chartData.reduce((sum, d) => sum + d.value, 0),
    [chartData]
  );
  // Donut ring segments as stroke-dash arcs on a shared circle (r=42) —
  // deterministic and dependency-free, unlike ResponsiveContainer sizing.
  const donutSegments = useMemo(() => {
    const circumference = 2 * Math.PI * 42;
    let offset = 0;
    return chartData.map((d, i) => {
      const fraction = total > 0 ? d.value / total : 0;
      const dash = fraction * circumference;
      const segment = {
        name: d.name,
        color: PALETTE[i % PALETTE.length],
        dash,
        gap: circumference - dash,
        offset,
      };
      offset += dash;
      return segment;
    });
  }, [chartData, total]);
  const canChart = chartData.length > 0;

  const TABS: { id: View; label: string; icon: typeof TableCellsIcon }[] = [
    { id: "table", label: "Table", icon: TableCellsIcon },
    { id: "chart", label: "Chart", icon: ChartBarIcon },
    { id: "sql", label: "SQL", icon: CodeBracketIcon },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
      <div className="flex items-center gap-1 border-b border-border/60 px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {view === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {columns.map((c, i) => (
                    <th
                      key={c}
                      className={cn("px-3 py-2", i > 0 && "text-right")}
                    >
                      {humanize(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((row) => (
                  <tr
                    key={columns.map((c) => cellText(row[c])).join("|")}
                    className="border-b border-border/30 last:border-0"
                  >
                    {columns.map((c, ci) => (
                      <td
                        key={c}
                        className={cn(
                          "px-3 py-2.5 tabular-nums text-foreground",
                          ci === 0 ? "font-mono text-xs" : "text-right"
                        )}
                      >
                        {cellText(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {view === "chart" ? (
          !canChart ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              This result has no numeric column to chart.
            </p>
          ) : (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Chart type
                </span>
                <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                  {(
                    [
                      { id: "bar", label: "Bar", icon: ChartBarIcon },
                      {
                        id: "line",
                        label: "Line",
                        icon: PresentationChartLineIcon,
                      },
                      { id: "donut", label: "Donut", icon: ChartPieIcon },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = chartType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setChartType(opt.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          active
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {chartType === "donut" ? (
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                  <div className="relative h-52 w-52 shrink-0">
                    <svg
                      viewBox="0 0 100 100"
                      className="h-52 w-52 -rotate-90"
                      aria-hidden="true"
                    >
                      {donutSegments.map((s) => (
                        <circle
                          key={s.name}
                          cx={50}
                          cy={50}
                          r={42}
                          fill="none"
                          stroke={s.color}
                          strokeWidth={14}
                          strokeDasharray={`${s.dash} ${s.gap}`}
                          strokeDashoffset={-s.offset}
                        />
                      ))}
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-semibold text-foreground">
                        {total.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        total
                      </span>
                    </div>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-2">
                    {chartData.map((d, i) => (
                      <li
                        key={d.name}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{
                            backgroundColor: PALETTE[i % PALETTE.length],
                          }}
                        />
                        <span className="truncate font-medium text-foreground">
                          {d.name}
                        </span>
                        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                          {d.value.toLocaleString()} ·{" "}
                          {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "bar" ? (
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: 11,
                            fill: "var(--muted-foreground)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{
                            fontSize: 11,
                            fill: "var(--muted-foreground)",
                          }}
                          tickLine={false}
                          axisLine={false}
                          width={44}
                        />
                        <Tooltip
                          formatter={(v) => Number(v).toLocaleString()}
                          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {chartData.map((d, i) => (
                            <Cell
                              key={d.name}
                              fill={PALETTE[i % PALETTE.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: 11,
                            fill: "var(--muted-foreground)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{
                            fontSize: 11,
                            fill: "var(--muted-foreground)",
                          }}
                          tickLine={false}
                          axisLine={false}
                          width={44}
                        />
                        <Tooltip
                          formatter={(v) => Number(v).toLocaleString()}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={PALETTE[0]}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: PALETTE[0] }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )
        ) : null}

        {view === "sql" ? (
          sql && sql.trim().length > 0 ? (
            <pre className="overflow-x-auto rounded-xl border border-border/60 bg-muted/40 p-3 text-xs leading-5 text-foreground">
              <code>{sql}</code>
            </pre>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              This result was produced by the assistant&apos;s tools — no raw
              SQL to show.
            </p>
          )
        ) : null}
      </div>

      {actions ? (
        <div className="border-t border-border/60 p-3">{actions}</div>
      ) : null}
    </div>
  );
}

export default ResultCard;
