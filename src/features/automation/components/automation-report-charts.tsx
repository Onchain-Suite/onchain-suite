"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/ui/chart";

import { cn } from "@/lib/utils";

import type { AutomationReportRow } from "../automation-report.service";

/** Bars are grouped in a shared card; the legend is plain HTML below the plot
 *  so it can carry the value as well as the swatch. */
const SERIES = {
  captured: { label: "Captured", color: "var(--chart-1)" },
  open: { label: "Open rate", color: "var(--chart-1)" },
  ctr: { label: "CTR", color: "var(--chart-2)" },
  company: { label: "Company domains", color: "var(--chart-1)" },
  consumer: { label: "Consumer providers", color: "var(--chart-3)" },
} as const;

const formatCount = (value: number) => value.toLocaleString();
const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;

/** Long automation names would eat the category axis; the tooltip and the table
 *  below carry the full name. */
const axisLabel = (name: string, max = 22) =>
  name.length > max ? `${name.slice(0, max - 1)}…` : name;

const CHART_HEIGHT = "h-56";

function ChartCard({
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

function Legend({
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

/* ------------------------------------------------------------------ */
/* Emails vs company emails                                            */
/* ------------------------------------------------------------------ */

const DOMAIN_CONFIG = {
  company: { label: SERIES.company.label, color: SERIES.company.color },
  consumer: { label: SERIES.consumer.label, color: SERIES.consumer.color },
} satisfies ChartConfig;

export function CompanyDomainChart({
  companyDomain,
  consumerDomain,
  totalEmails,
  truncated,
}: {
  companyDomain: number;
  consumerDomain: number;
  totalEmails: number;
  truncated: boolean;
}) {
  const data = [
    { key: "company", name: SERIES.company.label, value: companyDomain },
    { key: "consumer", name: SERIES.consumer.label, value: consumerDomain },
  ];
  const share = totalEmails > 0 ? (companyDomain / totalEmails) * 100 : null;

  return (
    <ChartCard
      title="Emails vs company emails"
      description="Every email on file, split by whether the domain belongs to a company."
      isEmpty={totalEmails === 0}
      emptyLabel="No contacts have an email address yet"
    >
      <div className={cn("relative w-full", CHART_HEIGHT)}>
        <ChartContainer
          config={DOMAIN_CONFIG}
          className="aspect-auto h-full w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((slice) => (
                <Cell key={slice.key} fill={`var(--color-${slice.key})`} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {/* Centre readout rather than a fifth tile - the ring already carries
            the split, so the middle is the only space worth spending. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatCount(totalEmails)}
          </span>
          <span className="text-xs text-muted-foreground">emails on file</span>
        </div>
      </div>
      <Legend
        className="mt-4"
        items={[
          {
            label: SERIES.company.label,
            color: SERIES.company.color,
            value: formatCount(companyDomain),
          },
          {
            label: SERIES.consumer.label,
            color: SERIES.consumer.color,
            value: formatCount(consumerDomain),
          },
        ]}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {share === null
          ? "No emails to measure."
          : `${formatPercent(share)} of emails are on a company domain.`}
        {truncated ? " Sampled from the contacts scanned so far." : ""}
      </p>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Delivery funnel                                                     */
/* ------------------------------------------------------------------ */

const FUNNEL_CONFIG = {
  value: { label: "Emails", color: SERIES.captured.color },
} satisfies ChartConfig;

export function DeliveryFunnelChart({
  delivered,
  opened,
  clicked,
}: {
  delivered: number;
  opened: number;
  clicked: number;
}) {
  const data = [
    { stage: "Delivered", value: delivered },
    { stage: "Opened", value: opened },
    { stage: "Clicked", value: clicked },
  ];

  return (
    <ChartCard
      title="Delivery funnel"
      description="How many of the delivered emails were opened, then clicked."
      isEmpty={delivered === 0}
      emptyLabel="No emails delivered yet"
    >
      <ChartContainer
        config={FUNNEL_CONFIG}
        className={cn("aspect-auto w-full", CHART_HEIGHT)}
      >
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis
            type="number"
            tickFormatter={(value: number) => formatCount(value)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="stage"
            width={72}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={[0, 4, 4, 0]}
            barSize={22}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Captured by automation                                              */
/* ------------------------------------------------------------------ */

const CAPTURED_CONFIG = {
  captured: { label: SERIES.captured.label, color: SERIES.captured.color },
} satisfies ChartConfig;

export function CapturedByAutomationChart({
  rows,
  limit = 8,
}: {
  rows: AutomationReportRow[];
  limit?: number;
}) {
  const ranked = [...rows]
    .filter((row) => row.captured > 0)
    .sort((a, b) => b.captured - a.captured);
  const shown = ranked.slice(0, limit);
  const rest = ranked.slice(limit);
  const restTotal = rest.reduce((acc, row) => acc + row.captured, 0);

  const data = shown.map((row) => ({
    name: axisLabel(row.name),
    captured: row.captured,
  }));
  // Fold the tail into one bar instead of truncating silently - a chart that
  // stops at 8 of 30 automations is a lie about the total.
  if (restTotal > 0) {
    data.push({
      name: `Other (${formatCount(rest.length)})`,
      captured: restTotal,
    });
  }

  return (
    <ChartCard
      title="Emails captured by automation"
      description={`Contacts enrolled into each automation${
        rest.length > 0 ? `, top ${formatCount(shown.length)}` : ""
      }.`}
      isEmpty={data.length === 0}
      emptyLabel="No automation has captured a contact yet"
    >
      <ChartContainer
        config={CAPTURED_CONFIG}
        className={cn("aspect-auto w-full", CHART_HEIGHT)}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis
            type="number"
            tickFormatter={(value: number) => formatCount(value)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={148}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar
            dataKey="captured"
            fill="var(--color-captured)"
            radius={[0, 4, 4, 0]}
            barSize={16}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Open rate vs CTR by automation                                      */
/* ------------------------------------------------------------------ */

const RATE_CONFIG = {
  openRate: { label: SERIES.open.label, color: SERIES.open.color },
  clickRate: { label: SERIES.ctr.label, color: SERIES.ctr.color },
} satisfies ChartConfig;

export function EngagementByAutomationChart({
  rows,
  limit = 8,
}: {
  rows: AutomationReportRow[];
  limit?: number;
}) {
  const ranked = [...rows]
    .filter(
      (row) =>
        row.statsAvailable &&
        row.delivered > 0 &&
        row.openRate !== null &&
        row.clickRate !== null
    )
    .sort((a, b) => (b.openRate ?? 0) - (a.openRate ?? 0))
    .slice(0, limit);

  const data = ranked.map((row) => ({
    name: axisLabel(row.name, 14),
    openRate: Number((row.openRate ?? 0).toFixed(1)),
    clickRate: Number((row.clickRate ?? 0).toFixed(1)),
  }));

  return (
    <ChartCard
      title="Open rate vs CTR by automation"
      description="Per-automation engagement; the tiles above show the org-wide rate."
      isEmpty={data.length === 0}
      emptyLabel="No automation has delivered an email yet"
    >
      <ChartContainer
        config={RATE_CONFIG}
        className={cn("aspect-auto w-full", CHART_HEIGHT)}
      >
        <BarChart data={data} margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            interval={0}
            height={48}
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="dot"
                formatter={(value) => (
                  <span className="font-medium tabular-nums">
                    {typeof value === "number" ? `${value.toFixed(1)}%` : "—"}
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey="openRate"
            fill="var(--color-openRate)"
            radius={[4, 4, 0, 0]}
            barSize={14}
          />
          <Bar
            dataKey="clickRate"
            fill="var(--color-clickRate)"
            radius={[4, 4, 0, 0]}
            barSize={14}
          />
        </BarChart>
      </ChartContainer>
      <Legend
        className="mt-4"
        items={[
          { label: SERIES.open.label, color: SERIES.open.color },
          { label: SERIES.ctr.label, color: SERIES.ctr.color },
        ]}
      />
    </ChartCard>
  );
}
