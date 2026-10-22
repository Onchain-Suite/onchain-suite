"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { cn } from "@/lib/utils";

import { type ChartRow, seriesConfig } from "./chart-series";

/** Parts of a whole: one slice per row, labelled by `labelKey`. */
export function AnalyticsDonutChart({
  data,
  labelKey,
  valueKey,
  className,
}: {
  data: ChartRow[];
  labelKey: string;
  valueKey: string;
  className?: string;
}) {
  const slices = data
    .map((r, i) => ({
      key: `s${i}`,
      label: String(r[labelKey] ?? ""),
      value: Number(r[valueKey] ?? 0),
    }))
    .filter((s) => s.value > 0);
  const config = seriesConfig(
    slices.map((s) => ({ key: s.key, label: s.label }))
  );
  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto h-[240px] w-full", className)}
    >
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="key" hideLabel />}
        />
        <Pie
          data={slices}
          dataKey="value"
          nameKey="key"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {slices.map((s) => (
            <Cell key={s.key} fill={`var(--color-${s.key})`} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="key" />} />
      </PieChart>
    </ChartContainer>
  );
}
