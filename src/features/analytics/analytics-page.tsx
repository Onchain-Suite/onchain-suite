"use client";

import {
  ArrowDownTrayIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  CursorArrowRaysIcon,
  EnvelopeOpenIcon,
  InformationCircleIcon,
  MegaphoneIcon,
  PresentationChartLineIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

import {
  analyticsService,
  type DashboardMetric,
  type DashboardMetricKey,
  type DashboardOverview,
  type DashboardSeriesPoint,
  type MetricBacking,
} from "./analytics.service";
import { useCampaignEngagement } from "@/features/campaigns/hooks/use-campaign-engagement";

/**
 * Analytics dashboard. Every headline figure comes from the real
 * GET /dashboard/overview endpoint (docs/backend.md 2026-08-13); `meta.backing`
 * decides which cards may show a trend. Sections with no backing endpoint
 * (off-chain CTR/unsubscribe, on-chain holders/swaps/retention, push delivery,
 * pinned reports) render honest "not available yet" states rather than
 * fabricated numbers. The report-template launcher is a static catalog.
 */

type MetricConfig = {
  key: DashboardMetricKey;
  label: string;
  format: "count" | "percent";
  hint: string;
};

const METRICS: MetricConfig[] = [
  {
    key: "messagesSent",
    label: "Messages sent",
    format: "count",
    hint: "Emails and in-app pushes sent in the last 30 days, from delivery events.",
  },
  {
    key: "openRate",
    label: "Email open rate",
    format: "percent",
    hint: "Share of delivered emails opened, pooled across your sent campaigns - the same figure the Campaigns page and Dashboard show. Email only; in-app push is measured as a view rate.",
  },
  {
    key: "activeWallets",
    label: "Active wallets",
    format: "count",
    hint: "Wallets in your audience active on-chain in the last 30 days. A point-in-time snapshot with no historical trend yet.",
  },
  {
    key: "convertedOnchain",
    label: "On-chain conversions",
    format: "count",
    hint: "On-chain conversions are only measured on demand per campaign goal, so there is no org-wide figure yet.",
  },
];

const TEMPLATES = [
  {
    Icon: UsersIcon,
    name: "Holder distribution",
    desc: "Balances, concentration and top wallets by token.",
    tag: "On-chain",
    hint: "How a token's supply spreads across wallets - concentration, top holders, and the long tail. Tells you whether a few wallets hold most of the supply or it's widely distributed.",
  },
  {
    Icon: PresentationChartLineIcon,
    name: "Retention cohorts",
    desc: "Weekly wallet retention since first interaction.",
    tag: "On-chain",
    hint: "Group wallets by the week they first interacted, then track how many stay active in the following weeks - your on-chain retention curve.",
  },
  {
    Icon: EnvelopeOpenIcon,
    name: "Engagement by segment",
    desc: "Open, click and push-view rates per audience.",
    tag: "Off-chain",
    hint: "Open, click and in-app view rates broken down per audience segment, so you can see which cohorts actually engage with your messages.",
  },
  {
    Icon: CursorArrowRaysIcon,
    name: "Conversion attribution",
    desc: "On-chain actions mapped back to campaigns and flows.",
    tag: "Blended",
    hint: "Links on-chain actions (swaps, mints, deposits) back to the campaign or automation that drove them, so you can see what actually converted.",
  },
  {
    Icon: MegaphoneIcon,
    name: "Campaign report",
    desc: "Delivery, engagement and conversion per campaign.",
    tag: "Off-chain",
    hint: "Per-campaign delivery, engagement and on-chain conversion in one exportable summary.",
  },
  {
    Icon: BoltIcon,
    name: "Automation performance",
    desc: "Entries, completion and conversion by flow.",
    tag: "Blended",
    hint: "For each automation flow: how many wallets entered, how many completed it, and how many converted.",
  },
];

const numberFmt = new Intl.NumberFormat("en-US");

const formatMetricValue = (
  metric: DashboardMetric,
  format: MetricConfig["format"]
) =>
  format === "percent"
    ? `${metric.value.toFixed(1)}%`
    : numberFmt.format(Math.round(metric.value));

const formatDelta = (deltaPct: number) =>
  `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`;

/** Sparkline / chart points scaled to the series' own min/max. */
const seriesPoints = (
  series: DashboardSeriesPoint[],
  w: number,
  h: number,
  pad = 0
) => {
  if (series.length < 2) return "";
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const inner = h - pad * 2;
  return series
    .map((p, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = pad + (inner - ((p.value - min) / range) * inner);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

export function AnalyticsPage() {
  const overviewQuery = useQuery({
    queryKey: ["analytics", "dashboard", "overview"],
    queryFn: () => analyticsService.getDashboardOverview(),
    staleTime: 60_000,
  });

  const overview = overviewQuery.data;

  const exportCsv = () => {
    if (!overview) return;
    const rows: (string | number)[][] = [
      ["Metric", "Value", "Window", "Data source"],
      ...METRICS.map((m) => {
        const metric = overview[m.key];
        const backing = overview.meta.backing[m.key];
        const value =
          backing === "none"
            ? "Not measured yet"
            : formatMetricValue(metric, m.format);
        const source =
          backing === "real"
            ? "Real"
            : backing === "value-only"
              ? "Snapshot (no trend)"
              : "Not measured";
        return [m.label, value, "Last 30 days", source];
      }),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "onchainsuite-analytics-30d.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground"
            title="The overview reflects a rolling 30-day window. Custom ranges are not available yet."
          >
            Last 30 days
            <Info hint="The overview reflects a rolling 30-day window. Custom ranges are not available yet." />
          </span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!overview}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="size-4" aria-hidden="true" />
            Export report
          </button>
        </div>
      </div>

      {overviewQuery.isLoading ? (
        <LoadingState />
      ) : overviewQuery.isError || !overview ? (
        <ErrorState onRetry={() => overviewQuery.refetch()} />
      ) : (
        <Content overview={overview} />
      )}
    </div>
  );
}

function Content({ overview }: { overview: DashboardOverview }) {
  const { backing, notes } = overview.meta;

  // Reconcile the open rate with the Campaigns page + Dashboard: they all read
  // the same recipient-weighted pool of every sent campaign, so this surface
  // never disagrees with them. Falls back to the backend figure when there are
  // no sent campaigns to pool.
  const { avgOpenRate } = useCampaignEngagement();

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => {
          // Swap in the pooled campaign open rate (no historical series, so it
          // renders as a value-only snapshot rather than a fabricated trend).
          const usePooledOpen =
            m.key === "openRate" && typeof avgOpenRate === "number";
          const metric = usePooledOpen
            ? { ...overview.openRate, value: avgOpenRate, series: [] }
            : overview[m.key];
          const cardBacking = usePooledOpen ? "value-only" : backing[m.key];
          return (
            <KpiCard
              key={m.key}
              config={m}
              metric={metric}
              backing={cardBacking}
            />
          );
        })}
      </div>

      {/* Off-chain + On-chain - no backing endpoint yet */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Off-chain engagement"
          right={
            <Info hint="Email and in-app push performance for messages you sent." />
          }
        >
          <EmptyState
            title="Not available yet"
            body="A per-channel breakdown of open, click, view and unsubscribe rates is not exposed by the API yet. See a campaign's own analytics for its funnel."
          />
        </Card>
        <Card
          title="On-chain activity"
          right={
            <Info hint="What wallets in your audience did on-chain over the period." />
          }
        >
          <EmptyState
            title="Not available yet"
            body="New holders, swaps and retention are not aggregated org-wide yet. Only per-wallet summaries exist today."
          />
        </Card>
      </div>

      {/* Push delivery - no backing endpoint yet */}
      <Card title="In-app push delivery">
        <EmptyState
          title="Not available yet"
          body="An org-wide queued / delivered / viewed / clicked funnel for in-app push is not exposed yet. A campaign's own analytics shows its in-app funnel."
        />
      </Card>

      {/* Report templates - static launcher catalog */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Report templates
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map(({ Icon, name, desc, tag, hint }) => (
            <div
              key={name}
              className="flex flex-col rounded-xl border border-border/60 bg-card/60 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {tag}
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-foreground">
                {name}
                <Info hint={hint} />
              </p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                {desc}
              </p>
              <div className="mt-3 flex gap-2">
                <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                  Run report
                </button>
                <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                  Export
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pinned from Intelligence - no real source yet */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Pinned from Intelligence
        </h2>
        <div className="overflow-hidden rounded-xl border border-border/60">
          <EmptyState
            title="No pinned reports yet"
            body="Pin a saved query from Intelligence to see it here."
          />
        </div>
      </div>

      {notes.length > 0 ? (
        <p className="text-xs text-muted-foreground">{notes.join(" · ")}</p>
      ) : null}
    </div>
  );
}

function KpiCard({
  config,
  metric,
  backing,
}: {
  config: MetricConfig;
  metric: DashboardMetric;
  backing: MetricBacking;
}) {
  const chartable = backing === "real" && metric.series.length >= 2;
  const spark = useMemo(
    () => (chartable ? seriesPoints(metric.series, 120, 32, 2) : ""),
    [chartable, metric.series]
  );
  const up = metric.deltaPct >= 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {config.label}
        <Info hint={config.hint} />
      </div>
      {backing === "none" ? (
        <p className="mt-1.5 text-lg font-medium text-muted-foreground">
          Not measured yet
        </p>
      ) : (
        <p className="mt-1.5 text-2xl font-semibold text-foreground">
          {formatMetricValue(metric, config.format)}
        </p>
      )}

      {backing === "real" ? (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs font-medium",
            up
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          {up ? (
            <ArrowTrendingUpIcon className="size-3.5" aria-hidden="true" />
          ) : (
            <ArrowTrendingDownIcon className="size-3.5" aria-hidden="true" />
          )}
          {formatDelta(metric.deltaPct)}
          <span className="text-muted-foreground">vs prior 30d</span>
        </p>
      ) : backing === "value-only" ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Snapshot · no trend yet
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Not measured org-wide
        </p>
      )}

      {chartable ? (
        <svg
          viewBox="0 0 120 32"
          preserveAspectRatio="none"
          className="mt-2 h-8 w-full"
          role="img"
          aria-label={`${config.label} trend`}
        >
          <polyline
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
            points={spark}
          />
        </svg>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["k1", "k2", "k3", "k4"].map((k) => (
          <div
            key={k}
            className="h-28 animate-pulse rounded-xl border border-border/60 bg-card/60"
          />
        ))}
      </div>
      {/* Off-chain + On-chain */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-44 animate-pulse rounded-xl border border-border/60 bg-card/60" />
        <div className="h-44 animate-pulse rounded-xl border border-border/60 bg-card/60" />
      </div>
      {/* In-app push delivery */}
      <div className="h-40 animate-pulse rounded-xl border border-border/60 bg-card/60" />
      {/* Report templates */}
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-card/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["t1", "t2", "t3", "t4", "t5", "t6"].map((k) => (
            <div
              key={k}
              className="h-36 animate-pulse rounded-xl border border-border/60 bg-card/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-10 text-center">
      <p className="text-sm font-medium text-foreground">
        Could not load analytics
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        The dashboard overview could not be reached. Check your connection and
        try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/**
 * Inline help tooltip. Uses a CSS-only hover/focus bubble (styled with popover
 * tokens) instead of the browser's native `title`, which is unstyled and only
 * appears after a ~1s delay. This shows instantly and is keyboard-reachable.
 */
function Info({ hint }: { hint: string }) {
  return (
    <span className="group/info relative inline-flex align-middle">
      <button
        type="button"
        aria-label={hint}
        className="inline-flex cursor-help rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <InformationCircleIcon className="size-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[16rem] -translate-x-1/2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs font-normal normal-case leading-snug tracking-normal text-popover-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover/info:opacity-100 group-focus-within/info:opacity-100"
      >
        {hint}
      </span>
    </span>
  );
}
