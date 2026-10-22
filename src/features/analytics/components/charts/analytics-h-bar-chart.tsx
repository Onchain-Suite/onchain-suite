"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { cn } from "@/lib/utils";

import { type ChartRow, seriesConfig } from "./chart-series";

/**
 * A horizontal bar chart for labelled breakdowns where the category labels are
 * long (e.g. off-chain engagement rates, on-chain activity). One value series,
 * categories down the y axis.
 */
export function AnalyticsHBarChart({
  data,
  labelKey,
  valueKey,
  valueLabel,
  color,
  className,
}: {
  data: ChartRow[];
  labelKey: string;
  valueKey: string;
  valueLabel?: string;
  color?: string;
  className?: string;
}) {
  const config = seriesConfig([
    { key: valueKey, label: valueLabel ?? valueKey, color },
  ]);
  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto h-[240px] w-full", className)}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey={labelKey}
          tickLine={false}
          axisLine={false}
          width={132}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey={valueKey}
          fill={`var(--color-${valueKey})`}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
