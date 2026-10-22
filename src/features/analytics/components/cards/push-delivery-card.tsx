"use client";

import type { AnalyticsPeriod } from "../../contracts/org-analytics";
import { useAnalyticsSource } from "../../hooks/use-analytics-source";
import { formatCount, formatDuration } from "../../utils/format";
import { resolveMetric } from "../../utils/resolve-metric";
import {
  AnalyticsCard,
  CardEmpty,
  CardError,
  CardLoading,
} from "../analytics-card";
import { MetricChart } from "../metric-chart";

/** Queued to clicked, plus what is still waiting and what expired unseen. */
export function PushDeliveryCard({ period }: { period: AnalyticsPeriod }) {
  const push = useAnalyticsSource("push", period);
  const f = push.data?.funnel;
  const data = resolveMetric("push_funnel", { push: push.data });
  return (
    <AnalyticsCard
      title="In-app push delivery"
      meta={
        typeof f?.medianTimeToView === "number"
          ? `Median delivery to view · ${formatDuration(f.medianTimeToView)}`
          : undefined
      }
      span={2}
    >
      {push.isLoading ? (
        <CardLoading />
      ) : push.error ? (
        <CardError error={push.error as Error} />
      ) : data.emptyReason || !f ? (
        <CardEmpty reason={data.emptyReason ?? "No in-app push yet."} />
      ) : (
        <>
          <MetricChart data={data} chart="hbar" className="h-[200px]" />
          <div className="an-leaks">
            <div className="an-leak an-leak--info">
              <b>{formatCount(f.stillPending)}</b>
              <span>Still pending</span>
              <i>Delivered, not seen yet, and not expired.</i>
            </div>
            <div className="an-leak an-leak--warn">
              <b>{formatCount(f.expiredUnseen)}</b>
              <span>Expired unseen</span>
              <i>Ran out of time before anyone opened the app.</i>
            </div>
          </div>
        </>
      )}
    </AnalyticsCard>
  );
}
