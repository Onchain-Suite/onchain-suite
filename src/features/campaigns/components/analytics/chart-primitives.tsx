"use client";

import { cn } from "@/lib/utils";

/**
 * Shared chart chrome for the campaign Analytics charts (card frame, HTML
 * legend, swatch palette, formatters). Split out of `campaign-stats-charts`
 * so the two chart modules stay inside the file-size budget and the campaigns
 * twin reads as one system with the automation charts.
 */

/** Shared swatch palette - the campaigns twin of the automation charts. */
export const SERIES = {
  sent: { label: "Recipients", color: "var(--chart-1)" },
  delivered: { label: "Delivered", color: "var(--chart-2)" },
  open: { label: "Open rate", color: "var(--chart-1)" },
  ctr: { label: "CTR", color: "var(--chart-2)" },
  company: { label: "Company domains", color: "var(--chart-1)" },
  consumer: { label: "Consumer providers", color: "var(--chart-3)" },
} as const;

export const CHART_HEIGHT = "h-56";

export const formatCount = (value: number) => value.toLocaleString();
export const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;

/** Long campaign names would eat the category axis; the tooltip and the table
 *  below carry the full name. */
export const axisLabel = (name: string, max = 22) =>
  name.length > max ? `${name.slice(0, max - 1)}…` : name;

export function ChartCard({
  title,
  description,
  isEmpty,
  emptyLabel,
  children,
  className,
}: {
  title: string;
  description: string;
  isEmpty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-5",
        className
      )}
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {isEmpty ? (
        <div
          className={cn(
            "mt-4 flex items-center justify-center rounded-lg border border-dashed border-border",
            CHART_HEIGHT
          )}
        >
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <div className="mt-4">{children}</div>
      )}
    </section>
  );
}

export function Legend({
  items,
  className,
}: {
  items: { label: string; color: string; value?: string }[];
  className?: string;
}) {
  return (
    <ul
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.label}</span>
          {item.value ? (
            <span className="font-medium tabular-nums text-foreground">
              {item.value}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
