"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
 * A categorical bar chart - one or more series over a category axis. Pass
 * `stacked` for stacked bars (e.g. messages by channel, direct-vs-influenced
 * credit). Built on the shared `ChartContainer` + recharts.
 */
export function AnalyticsBarChart({
  data,
  categoryKey,
  series,
  stacked = false,
  className,
}: {
  data: ChartRow[];
  categoryKey: string;
  series: ChartSeries[];
  stacked?: boolean;
  className?: string;
}) {
  const config = seriesConfig(series);
  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto h-[240px] w-full", className)}
    >
      <BarChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={categoryKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.length > 1 ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId={stacked ? "stack" : undefined}
            fill={`var(--color-${s.key})`}
            radius={
              stacked
                ? i === series.length - 1
                  ? [4, 4, 0, 0]
                  : [0, 0, 0, 0]
                : [4, 4, 0, 0]
            }
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
