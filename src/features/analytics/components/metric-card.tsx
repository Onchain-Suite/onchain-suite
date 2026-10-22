"use client";

import type { ChartKind, MetricId } from "../contracts/dashboards";
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

/** The body of a measure: loading, error, honest empty, or the chart. */
export function MetricBody({
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
  const resolved = resolveMetric(metric, data);
  if (resolved.emptyReason || resolved.rows.length === 0) {
    return (
      <CardEmpty
        reason={resolved.emptyReason ?? "Nothing to show for this period yet."}
      />
    );
  }
  return <MetricChart data={resolved} chart={chart} className={className} />;
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
      <MetricBody metric={metric} chart={chart} period={period} />
    </AnalyticsCard>
  );
}
