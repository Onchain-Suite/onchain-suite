"use client";

import {
  BoltIcon,
  ChevronRightIcon,
  MegaphoneIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Sparkline } from "@/components/ui/sparkline";

import { cn } from "@/lib/utils";

import {
  analyticsService,
  type DashboardMetric,
  type MetricBacking,
} from "@/features/analytics/analytics.service";
import { useCampaignEngagement } from "@/features/campaigns/hooks/use-campaign-engagement";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const formatCount = (value: number) => value.toLocaleString();
const formatPercent = (value: number) =>
  `${Math.min(100, Math.max(0, value)).toFixed(1)}%`;

interface Metric {
  label: string;
  value: string;
  deltaPct: number;
  backing: MetricBacking;
  series: readonly number[];
}

const QUICK_LINKS = [
  {
    label: "Browse automation templates",
    href: PRIVATE_ROUTES.AUTOMATIONS,
    icon: BoltIcon,
  },
  {
    label: "Create your first campaign",
    href: PRIVATE_ROUTES.NEW_CAMPAIGN,
    icon: MegaphoneIcon,
  },
  {
    label: "Explore your audience",
    href: PRIVATE_ROUTES.AUDIENCE,
    icon: UserGroupIcon,
  },
];

function MetricCard({ label, value, deltaPct, backing, series }: Metric) {
  const up = deltaPct > 0;
  const down = deltaPct < 0;
  // Only "real"-backed metrics carry enough history to chart a trend line.
  const showSpark = backing === "real" && series.length >= 2;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        vs last 30d
        {deltaPct !== 0 ? (
          <span
            className={cn(
              "font-medium",
              up && "text-emerald-600 dark:text-emerald-400",
              down && "text-rose-600 dark:text-rose-400"
            )}
          >
            {up ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(1)}%
          </span>
        ) : (
          <span className="font-medium text-muted-foreground">no change</span>
        )}
      </p>
      {showSpark ? (
        <Sparkline data={[...series]} className="mt-4 text-primary" />
      ) : (
        <div className="mt-4 h-8" aria-hidden="true" />
      )}
    </div>
  );
}

export function MetricsDashboard() {
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => analyticsService.getDashboardOverview(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const overview = overviewQuery.data;

  // Open rate comes from the SAME pooled calc as the Campaigns page (via the
  // shared hook) so the two surfaces never disagree, instead of the backend's
  // separate /dashboard/overview.openRate.
  const { avgOpenRate } = useCampaignEngagement();

  const toMetric = (
    label: string,
    m: DashboardMetric | undefined,
    backing: MetricBacking,
    kind: "count" | "percent"
  ): Metric => ({
    label,
    value:
      m && typeof m.value === "number"
        ? kind === "percent"
          ? formatPercent(m.value)
          : formatCount(m.value)
        : "-",
    deltaPct: m?.deltaPct ?? 0,
    backing,
    series: (m?.series ?? []).map((p) => p.value),
  });

  const backing = overview?.meta?.backing;
  const metrics: Metric[] = [
    toMetric(
      "Active wallets",
      overview?.activeWallets,
      backing?.activeWallets ?? "none",
      "count"
    ),
    toMetric(
      "Messages sent",
      overview?.messagesSent,
      backing?.messagesSent ?? "none",
      "count"
    ),
    {
      label: "Open rate",
      value: typeof avgOpenRate === "number" ? formatPercent(avgOpenRate) : "-",
      deltaPct: 0,
      backing: "none" as MetricBacking,
      series: [],
    },
    toMetric(
      "Converted on-chain",
      overview?.convertedOnchain,
      backing?.convertedOnchain ?? "none",
      "count"
    ),
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Recent on-chain activity
          </h2>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <Squares2X2Icon
              className="size-8 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-foreground">
              On-chain activity feed coming soon
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              A live feed of swaps, mints, stakes and deposits across your
              audience wallets will show here once the on-chain activity API is
              available.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Get started
          </h2>
          <div className="space-y-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <link.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {link.label}
                </span>
                <ChevronRightIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            ))}

            <Link
              href={PRIVATE_ROUTES.AUTOMATIONS}
              className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Re-engage whales
                </span>
                <ChevronRightIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">
                Automate a win-back for your highest-value wallets
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Build a multi-channel automation from a template.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
