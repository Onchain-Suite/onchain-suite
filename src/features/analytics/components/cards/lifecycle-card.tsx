"use client";

import { useAnalyticsSource } from "../../hooks/use-analytics-source";
import { formatCount } from "../../utils/format";
import { resolveMetric } from "../../utils/resolve-metric";
import {
  AnalyticsCard,
  CardEmpty,
  CardError,
  CardLoading,
} from "../analytics-card";
import { MetricChart } from "../metric-chart";

/** Contacts by health: active, cooling, cold, healthiest first. */
export function LifecycleCard() {
  const q = useAnalyticsSource("audience", "30d");
  const data = resolveMetric("lifecycle", { audience: q.data });
  const a = q.data;
  return (
    <AnalyticsCard
      title="Lifecycle"
      meta={
        typeof a?.total === "number"
          ? `${formatCount(a.total)} contacts, healthiest first`
          : undefined
      }
      span={2}
      foot="Stages come from each contact's health score: recent on-chain and message activity."
    >
      {q.isLoading ? (
        <CardLoading />
      ) : q.error ? (
        <CardError error={q.error as Error} />
      ) : data.emptyReason || !a ? (
        <CardEmpty reason={data.emptyReason ?? "No contacts yet."} />
      ) : (
        <>
          <div className="an-lc">
            <div>
              <b>{formatCount(Number(a.activeCount ?? 0))}</b>
              <span>active</span>
            </div>
            <div className="is-warn">
              <b>{formatCount(Number(a.coolingCount ?? 0))}</b>
              <span>cooling off</span>
            </div>
            <div className="is-cold">
              <b>{formatCount(Number(a.coldCount ?? 0))}</b>
              <span>gone cold</span>
            </div>
          </div>
          <MetricChart data={data} chart="hbar" className="h-[150px]" />
        </>
      )}
    </AnalyticsCard>
  );
}
