"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { cn } from "@/lib/utils";

import { type ChartRow, type ChartSeries, seriesConfig } from "./chart-series";

/**
 * A time-series line chart - one or more series over an x axis (e.g. conversion
 * rate over time, the retention curve: messaged vs never-messaged).
 */
export function AnalyticsLineChart({
  data,
  xKey,
  series,
  className,
}: {
  data: ChartRow[];
  xKey: string;
  series: ChartSeries[];
  className?: string;
}) {
  const config = seriesConfig(series);
  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto h-[240px] w-full", className)}
    >
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.length > 1 ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
