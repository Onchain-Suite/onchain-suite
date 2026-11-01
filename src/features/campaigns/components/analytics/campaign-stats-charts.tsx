"use client";

import {
  Area,
  AreaChart,
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

import type { CampaignTimeSeriesPoint } from "../../campaigns.service";
import {
  CHART_HEIGHT,
  ChartCard,
  formatCount,
  formatPercent,
  Legend,
  SERIES,
} from "./chart-primitives";

/* ------------------------------------------------------------------ */
/* Recipients & deliveries over time                                   */
/* ------------------------------------------------------------------ */

const TREND_CONFIG = {
  sent: { label: "Recipients", color: "var(--chart-1)" },
  delivered: { label: "Delivered", color: "var(--chart-2)" },
} satisfies ChartConfig;

/** "2026-10-26" → "Oct 26", in UTC to match the server's day buckets. */
const trendDateLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
};

export function CampaignTrendChart({
  series,
}: {
  series: CampaignTimeSeriesPoint[];
}) {
  const data = series.map((point) => ({
    ...point,
    label: trendDateLabel(point.date),
  }));
  const totalSent = series.reduce((acc, p) => acc + p.sent, 0);
  const totalDelivered = series.reduce((acc, p) => acc + p.delivered, 0);

  return (
    <ChartCard
      title="Recipients & deliveries over time"
      description="Recipients sent to and emails delivered across your campaigns, by day."
      isEmpty={totalSent === 0 && totalDelivered === 0}
      emptyLabel="No campaign activity in this window yet"
      className="lg:col-span-2"
    >
      <ChartContainer
        config={TREND_CONFIG}
        className={cn("aspect-auto w-full", CHART_HEIGHT)}
      >
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 4 }}>
          <defs>
            <linearGradient id="fillCampaignSent" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-sent)"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="var(--color-sent)"
                stopOpacity={0.02}
              />
            </linearGradient>
            <linearGradient
              id="fillCampaignDelivered"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--color-delivered)"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="var(--color-delivered)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(value: number) => formatCount(value)}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Area
            type="monotone"
            dataKey="sent"
            stroke="var(--color-sent)"
            fill="url(#fillCampaignSent)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="delivered"
            stroke="var(--color-delivered)"
            fill="url(#fillCampaignDelivered)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
      <Legend
        className="mt-4"
        items={[
          {
            label: TREND_CONFIG.sent.label,
            color: SERIES.sent.color,
            value: formatCount(totalSent),
          },
          {
            label: TREND_CONFIG.delivered.label,
            color: SERIES.delivered.color,
            value: formatCount(totalDelivered),
          },
        ]}
      />
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Emails vs company emails (org audience, shared with automations)    */
/* ------------------------------------------------------------------ */

const DOMAIN_CONFIG = {
  company: { label: SERIES.company.label, color: SERIES.company.color },
  consumer: { label: SERIES.consumer.label, color: SERIES.consumer.color },
} satisfies ChartConfig;

export function CompanyDomainChart({
  companyDomain,
  consumerDomain,
  totalEmails,
}: {
  companyDomain: number;
  consumerDomain: number;
  totalEmails: number;
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
      </p>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Delivery funnel                                                     */
/* ------------------------------------------------------------------ */

const FUNNEL_CONFIG = {
  value: { label: "Emails", color: SERIES.sent.color },
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
