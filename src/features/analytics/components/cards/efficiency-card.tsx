"use client";

import type { AnalyticsPeriod } from "../../contracts/org-analytics";
import { useAnalyticsSources } from "../../hooks/use-analytics-source";
import { formatCount } from "../../utils/format";
import { AnalyticsCard, CardEmpty, CardLoading } from "../analytics-card";

const per = (a: number | null | undefined, b: number | null | undefined) =>
  typeof a === "number" && typeof b === "number" && b > 0
    ? Math.round((a / b) * 10) / 10
    : null;

/** What one conversion costs, in messages and in wallets reached. */
export function EfficiencyCard({ period }: { period: AnalyticsPeriod }) {
  const { data, loading } = useAnalyticsSources(
    ["overview", "campaigns"],
    period
  );
  const conversions = data.overview?.kpis.onChainConversions.value ?? null;
  const reached = data.overview?.kpis.walletsReached.value ?? null;
  const sent = data.campaigns?.totals?.messagesSent ?? null;
  const perMessage = per(sent, conversions);
  const perReached = per(reached, conversions);

  return (
    <AnalyticsCard title="Efficiency" meta="Per on-chain conversion">
      {loading ? (
        <CardLoading />
      ) : conversions === null ? (
        <CardEmpty reason="Choose which on-chain events count as conversions, then this shows what each one costs." />
      ) : (
        <div className="an-eff">
          <div>
            <span>Messages per conversion</span>
            <b>{perMessage === null ? "–" : formatCount(perMessage)}</b>
            <span>
              {formatCount(sent)} sent · {formatCount(conversions)} conversions
            </span>
          </div>
          <div>
            <span>Wallets reached per conversion</span>
            <b>{perReached === null ? "–" : formatCount(perReached)}</b>
            <span>
              Correlation within the window, not proof a message caused it
            </span>
          </div>
        </div>
      )}
    </AnalyticsCard>
  );
}
