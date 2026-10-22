"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { cn } from "@/lib/utils";

import { type ChartRow, type ChartSeries, seriesConfig } from "./chart-series";

/** Filled series over time; `stacked` piles them into one total. */
export function AnalyticsAreaChart({
  data,
  xKey,
  series,
  stacked = false,
  className,
}: {
  data: ChartRow[];
  xKey: string;
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
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          {series.map((s) => (
            <linearGradient
              key={s.key}
              id={`an-fill-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={`var(--color-${s.key})`}
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor={`var(--color-${s.key})`}
                stopOpacity={0.02}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
        />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.length > 1 ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stackId={stacked ? "stack" : undefined}
            stroke={`var(--color-${s.key})`}
            fill={`url(#an-fill-${s.key})`}
            strokeWidth={2}
            connectNulls
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
