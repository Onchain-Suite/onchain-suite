"use client";

import type { ChartData, ChartKind } from "../contracts/dashboards";
import { formatValue } from "../utils/format";
import {
  AnalyticsAreaChart,
  AnalyticsBarChart,
  AnalyticsDonutChart,
  AnalyticsHBarChart,
  AnalyticsLineChart,
} from "./charts";

/**
 * Draws chart data the way a chart kind asks. Every measure resolves to the
 * same `ChartData`, so any measure can be shown any supported way.
 */
export function MetricChart({
  data,
  chart,
  className,
}: {
  data: ChartData;
  chart: ChartKind;
  className?: string;
}) {
  const { rows, series, categoryKey, unit } = data;
  const [first] = series;

  if (chart === "number") {
    const value =
      data.total ??
      (first
        ? rows.reduce(
            (s, r) =>
              s +
              (typeof r[first.key] === "number" ? (r[first.key] as number) : 0),
            0
          )
        : null);
    return (
      <div className="an-num">
        <b>{formatValue(value, unit)}</b>
        <span>{first?.label ?? ""}</span>
      </div>
    );
  }

  if (chart === "table") {
    return (
      <table className="an-table">
        <thead>
          <tr>
            <th scope="col">
              {categoryKey === "bucket"
                ? "Period"
                : categoryKey.replace(/^\w/, (c) => c.toUpperCase())}
            </th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            // Rows are positional buckets with no id of their own.
            // eslint-disable-next-line react/no-array-index-key
            <tr key={i}>
              <td>{String(r[categoryKey] ?? "")}</td>
              {series.map((s) => (
                <td key={s.key}>
                  {formatValue(
                    typeof r[s.key] === "number" ? (r[s.key] as number) : null,
                    unit
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (chart === "donut" && first) {
    return (
      <AnalyticsDonutChart
        data={rows}
        labelKey={categoryKey}
        valueKey={first.key}
        className={className}
      />
    );
  }
  if (chart === "hbar" && first) {
    return (
      <AnalyticsHBarChart
        data={rows}
        labelKey={categoryKey}
        valueKey={first.key}
        valueLabel={first.label}
        color={first.color}
        className={className}
      />
    );
  }
  if (chart === "line")
    return (
      <AnalyticsLineChart
        data={rows}
        xKey={categoryKey}
        series={series}
        className={className}
      />
    );
  if (chart === "area")
    return (
      <AnalyticsAreaChart
        data={rows}
        xKey={categoryKey}
        series={series}
        className={className}
      />
    );
  return (
    <AnalyticsBarChart
      data={rows}
      categoryKey={categoryKey}
      series={series}
      stacked={chart === "stacked"}
      className={className}
    />
  );
}
