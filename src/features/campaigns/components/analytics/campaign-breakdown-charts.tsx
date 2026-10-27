"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/ui/chart";

import { cn } from "@/lib/utils";

import type { CampaignSummaryRow } from "../../campaigns.service";
import {
  axisLabel,
  CHART_HEIGHT,
  ChartCard,
  formatCount,
  Legend,
  SERIES,
} from "./chart-primitives";

/* ------------------------------------------------------------------ */
/* Recipients by campaign                                              */
/* ------------------------------------------------------------------ */

const CAPTURED_CONFIG = {
  sent: { label: SERIES.sent.label, color: SERIES.sent.color },
} satisfies ChartConfig;

export function RecipientsByCampaignChart({
  rows,
  limit = 8,
}: {
  rows: CampaignSummaryRow[];
  limit?: number;
}) {
  const ranked = [...rows]
    .filter((row) => row.sent > 0)
    .sort((a, b) => b.sent - a.sent);
  const shown = ranked.slice(0, limit);
  const rest = ranked.slice(limit);
  const restTotal = rest.reduce((acc, row) => acc + row.sent, 0);

  const data = shown.map((row) => ({
    name: axisLabel(row.name),
    sent: row.sent,
  }));
  // Fold the tail into one bar instead of truncating silently.
  if (restTotal > 0) {
    data.push({ name: `Other (${formatCount(rest.length)})`, sent: restTotal });
  }

  return (
    <ChartCard
      title="Recipients by campaign"
      description={`Recipients sent to by each campaign${
        rest.length > 0 ? `, top ${formatCount(shown.length)}` : ""
      }.`}
      isEmpty={data.length === 0}
      emptyLabel="No campaign has sent to a recipient yet"
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
            dataKey="sent"
            fill="var(--color-sent)"
            radius={[0, 4, 4, 0]}
            barSize={16}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Open rate vs CTR by campaign                                        */
/* ------------------------------------------------------------------ */

const RATE_CONFIG = {
  openRate: { label: SERIES.open.label, color: SERIES.open.color },
  clickRate: { label: SERIES.ctr.label, color: SERIES.ctr.color },
} satisfies ChartConfig;

export function EngagementByCampaignChart({
  rows,
  limit = 8,
}: {
  rows: CampaignSummaryRow[];
  limit?: number;
}) {
  const ranked = [...rows]
    .filter((row) => row.delivered > 0)
    .sort((a, b) => b.openRate - a.openRate)
    .slice(0, limit);

  const data = ranked.map((row) => ({
    name: axisLabel(row.name, 14),
    openRate: Number(row.openRate.toFixed(1)),
    clickRate: Number(row.clickRate.toFixed(1)),
  }));

  return (
    <ChartCard
      title="Open rate vs CTR by campaign"
      description="Per-campaign engagement; the tiles above show the org-wide rate."
      isEmpty={data.length === 0}
      emptyLabel="No campaign has delivered an email yet"
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
