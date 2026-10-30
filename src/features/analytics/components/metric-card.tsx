"use client";

import type { ChartData, ChartKind, MetricId } from "../contracts/dashboards";
import type { AnalyticsPeriod } from "../contracts/org-analytics";
import { metricDef } from "../data/metric-catalog";
import { useAnalyticsSources } from "../hooks/use-analytics-source";
import { resolveMetric } from "../utils/resolve-metric";
import {
  AnalyticsCard,
  CardEmpty,
  CardError,
  CardLoading,
  type CardSpan,
} from "./analytics-card";
import { MetricChart } from "./metric-chart";

/** Honest empty, or the chart, from already-resolved data. */
function Resolved({
  data,
  chart,
  className,
}: {
  data: ChartData;
  chart: ChartKind;
  className?: string;
}) {
  if (data.emptyReason || data.rows.length === 0) {
    return (
      <CardEmpty
        reason={data.emptyReason ?? "Nothing to show for this period yet."}
      />
    );
  }
  return <MetricChart data={data} chart={chart} className={className} />;
}

/** The live body: fetches this measure's sources and resolves them now. */
function MetricBodyLive({
  metric,
  chart,
  period,
  className,
}: {
  metric: MetricId;
  chart: ChartKind;
  period: AnalyticsPeriod;
  className?: string;
}) {
  const def = metricDef(metric);
  const { data, loading, error } = useAnalyticsSources(def.sources, period);
  if (loading) return <CardLoading />;
  if (error) return <CardError error={error} />;
  return (
    <Resolved
      data={resolveMetric(metric, data)}
      chart={chart}
      className={className}
    />
  );
}

/**
 * The body of a measure. With a `data` snapshot (a published link) it draws that
 * frozen data and never fetches, so an anonymous viewer needs no org access;
 * without one it fetches and resolves live.
 */
export function MetricBody({
  metric,
  chart,
  period,
  className,
  data,
}: {
  metric: MetricId;
  chart: ChartKind;
  period: AnalyticsPeriod;
  className?: string;
  data?: ChartData | null;
}) {
  // A snapshot is always a ChartData object; null/undefined means draw live.
  return data ? (
    <Resolved data={data} chart={chart} className={className} />
  ) : (
    <MetricBodyLive
      metric={metric}
      chart={chart}
      period={period}
      className={className}
    />
  );
}

/** A card that shows one measure from the catalog: built-in or user-made. */
export function MetricCard({
  title,
  meta,
  metric,
  chart,
  period,
  span = 1,
  foot,
  own,
  onEdit,
  data,
}: {
  title: string;
  meta?: string;
  metric: MetricId;
  chart: ChartKind;
  period: AnalyticsPeriod;
  span?: CardSpan;
  foot?: string;
  own?: boolean;
  onEdit?: () => void;
  /** A frozen snapshot (published link); omit for the live app. */
  data?: ChartData | null;
}) {
  return (
    <AnalyticsCard
      title={title}
      meta={meta}
      span={span}
      foot={foot}
      own={own}
      onEdit={onEdit}
    >
      <MetricBody metric={metric} chart={chart} period={period} data={data} />
    </AnalyticsCard>
  );
}
