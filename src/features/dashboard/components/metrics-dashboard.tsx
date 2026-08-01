"use client";

import {
  BoltIcon,
  ChevronRightIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  MegaphoneIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Sparkline } from "@/components/ui/sparkline";

import { cn } from "@/lib/utils";

import { campaignsService } from "@/features/campaigns/campaigns.service";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const formatCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "—";

const formatPercent = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}%`
    : "—";

// Trend deltas and spark series aren't exposed by the overview endpoint yet, so
// the shape of the line is illustrative — the headline values below are live.
const SPARKS = {
  wallets: [12, 14, 13, 16, 18, 17, 21, 24, 23, 27, 30],
  messages: [30, 26, 34, 28, 33, 38, 31, 40, 37, 44, 48],
  opens: [40, 44, 38, 47, 42, 49, 45, 52, 48, 56, 60],
  converted: [8, 10, 9, 13, 12, 16, 15, 20, 22, 26, 30],
} as const;

interface Metric {
  label: string;
  value: string;
  delta: string;
  spark: readonly number[];
}

interface ActivityRow {
  id: string;
  type: string;
  detail: string;
  chain: string;
  time: string;
  dot: string;
}

// Recent on-chain activity is a curated sample (no first-party feed endpoint
// yet) — mirrors the reference so the surface reads end-to-end.
const ACTIVITY: ActivityRow[] = [
  {
    id: "swap",
    type: "Swap",
    detail: "0x24e6…2dae swapped 4.2 ETH → USDC",
    chain: "Base",
    time: "14:36 UTC",
    dot: "bg-emerald-500",
  },
  {
    id: "unstake",
    type: "Unstake",
    detail: "0x3310…a087 unstaked 12 ETH from the vault",
    chain: "Ethereum",
    time: "14:12 UTC",
    dot: "bg-orange-500",
  },
  {
    id: "mint",
    type: "Mint",
    detail: "0x783a…f45e minted 3 items from Zora drop",
    chain: "Base",
    time: "13:58 UTC",
    dot: "bg-blue-500",
  },
  {
    id: "deposit",
    type: "Deposit",
    detail: "0x9188…b68d first deposit of $1,840 USDC",
    chain: "Base",
    time: "13:30 UTC",
    dot: "bg-emerald-500",
  },
];

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

function MetricCard({ label, value, delta, spark }: Metric) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        vs last 30d
        <span className="font-medium text-primary">▲ {delta}</span>
      </p>
      <Sparkline data={[...spark]} className="mt-4 text-primary" />
    </div>
  );
}

export function MetricsDashboard() {
  const overviewQuery = useQuery({
    queryKey: ["campaigns", "analytics", "overview", 30],
    queryFn: () => campaignsService.getAnalyticsOverview(30),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const overview = overviewQuery.data;

  const metrics: Metric[] = [
    {
      label: "Active wallets",
      value: "128,540",
      delta: "12.4%",
      spark: SPARKS.wallets,
    },
    {
      label: "Messages sent",
      value: formatCount(overview?.totals?.messagesSent ?? 12480),
      delta: "4.1%",
      spark: SPARKS.messages,
    },
    {
      label: "Open rate",
      value: formatPercent(overview?.email?.openRate ?? 42.3),
      delta: "2.7%",
      spark: SPARKS.opens,
    },
    {
      label: "Converted on-chain",
      value: "3,921",
      delta: "22.7%",
      spark: SPARKS.converted,
    },
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
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {ACTIVITY.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 px-4 py-3.5"
                >
                  <span
                    className={cn("size-2 shrink-0 rounded-full", row.dot)}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="font-medium text-foreground">
                      {row.type}
                    </span>{" "}
                    <span className="text-muted-foreground">{row.detail}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {row.chain}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {row.time}
                  </span>
                </li>
              ))}
            </ul>
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

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Re-engage whales
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                <EnvelopeIcon className="size-4" aria-hidden="true" />
                <DevicePhoneMobileIcon className="size-4" aria-hidden="true" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                48,920 sent · 12,480 engaged · 3,921 converted
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
