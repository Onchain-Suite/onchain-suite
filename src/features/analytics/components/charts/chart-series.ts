import type { ChartConfig } from "@/components/ui/chart";

/** A plotted series: its data key, legend/tooltip label, and colour. */
export interface ChartSeries {
  key: string;
  label: string;
  /** Any CSS colour; defaults to a `--chart-N` token by position. */
  color?: string;
}

/** A row of chart data. Values are numbers to plot plus string labels/keys. */
export type ChartRow = Record<string, string | number | null>;

/**
 * Builds the shadcn `ChartConfig` from a series list. `ChartContainer` turns each
 * entry's colour into a `--color-<key>` CSS var, so marks use
 * `fill="var(--color-<key>)"` and tooltips/legends stay in sync. Pure, so it is
 * unit-tested without rendering.
 */
export function seriesConfig(series: ChartSeries[]): ChartConfig {
  return Object.fromEntries(
    series.map((s, i) => [
      s.key,
      { label: s.label, color: s.color ?? `var(--chart-${(i % 5) + 1})` },
    ])
  );
}
