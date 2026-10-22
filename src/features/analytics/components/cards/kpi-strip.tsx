"use client";

import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

import type { AnalyticsPeriod, KpiValue } from "../../contracts/org-analytics";
import { useAnalyticsSource } from "../../hooks/use-analytics-source";
import {
  type Delta,
  formatCount,
  formatDelta,
  formatPercent,
} from "../../utils/format";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface Kpi {
  label: string;
  hint: string;
  value: string | null;
  delta: Delta | null;
}

const kpi = (
  label: string,
  hint: string,
  v: KpiValue | undefined,
  kind: "count" | "rate"
): Kpi => ({
  label,
  hint,
  value:
    v?.value === null || v?.value === undefined
      ? null
      : kind === "rate"
        ? formatPercent(v.value)
        : formatCount(v.value),
  delta: v ? formatDelta(v.value, v.previous, v.changePct, kind) : null,
});

/** The headline numbers for the period, each against the period before it. */
export function KpiStrip({ period }: { period: AnalyticsPeriod }) {
  const overview = useAnalyticsSource("overview", period);
  const campaigns = useAnalyticsSource("campaigns", period);

  if (overview.isLoading)
    return <Skeleton className="an-bfull h-[84px] w-full rounded-lg" />;
  const k = overview.data?.kpis;
  const sent = campaigns.data?.totals?.messagesSent;

  const items: Kpi[] = [
    kpi(
      "Wallets reached",
      "Distinct wallets a message was delivered to.",
      k?.walletsReached,
      "count"
    ),
    {
      label: "Messages sent",
      hint: "Email and in-app push sends in the period.",
      value: typeof sent === "number" ? formatCount(sent) : null,
      delta: null,
    },
    kpi(
      "Email open rate",
      "Unique opens over emails delivered.",
      k?.emailOpenRate,
      "rate"
    ),
    kpi(
      "Push view rate",
      "In-app pushes viewed over delivered.",
      k?.pushViewRate,
      "rate"
    ),
    kpi(
      "Active wallets",
      "Wallets with on-chain or in-app activity in the period.",
      k?.activeWallets,
      "count"
    ),
    kpi(
      "On-chain conversions",
      "Events you count as conversions. Empty until you choose them.",
      k?.onChainConversions,
      "count"
    ),
  ];

  return (
    <div
      className="an-strip an-bfull"
      role="group"
      aria-label={`Headline numbers, last ${period.replace("d", " days")}`}
    >
      {items.map((it) => (
        <div key={it.label} className="an-kpi">
          <span className="an-kpi__lbl" title={it.hint}>
            {it.label}
            <InformationCircleIcon aria-hidden="true" />
          </span>
          {it.value === null ? (
            <b className="an-kpi__nil">Not measured yet</b>
          ) : (
            <b>{it.value}</b>
          )}
          {it.delta ? (
            <span className={`an-delta an-delta--${it.delta.tone}`}>
              {it.delta.tone === "up" ? (
                <ArrowTrendingUpIcon aria-hidden="true" />
              ) : null}
              {it.delta.tone === "down" ? (
                <ArrowTrendingDownIcon aria-hidden="true" />
              ) : null}
              {it.delta.text} vs previous
            </span>
          ) : (
            <span className="an-delta an-delta--flat">
              {it.value === null ? " " : "No earlier period to compare"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
