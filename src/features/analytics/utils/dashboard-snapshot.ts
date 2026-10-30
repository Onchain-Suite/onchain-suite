import type { QueryClient } from "@tanstack/react-query";

import type { ChartData, ChartSpec, Dashboard } from "../contracts/dashboards";
import { BUILT_IN_LAYOUTS } from "../data/builtin-layouts";
import { metricDef } from "../data/metric-catalog";
import {
  type SourceData,
  type SourceId,
  sourceQuery,
} from "../hooks/use-analytics-source";
import { isBuiltIn } from "./dashboards";
import { resolveMetric } from "./resolve-metric";

/** One chart frozen into a published link: which measure, drawn how, plus its
 *  data as of publish time. */
export type SnapshotChart = { spec: ChartSpec; data: ChartData };

/**
 * The charts a dashboard actually shows: built-in measure cards first (for a
 * built-in tab) then the user's own. `special` and `missing` built-in cards are
 * left to the live app and never published - a share link carries only measures
 * whose numbers can be snapshotted.
 */
export function composeCharts(dashboard: Dashboard): ChartSpec[] {
  const builtIns: ChartSpec[] = isBuiltIn(dashboard.id)
    ? BUILT_IN_LAYOUTS[dashboard.id].flatMap((c) =>
        c.kind === "metric"
          ? [{ id: c.title, title: c.title, metric: c.metric, chart: c.chart }]
          : []
      )
    : [];
  return [...builtIns, ...dashboard.charts];
}

/**
 * Resolve every chart's data once, for a snapshot taken at publish time. Each
 * source is pulled through the query cache, so this reuses what the open
 * dashboard already loaded rather than refetching. A source that fails is left
 * out and `resolveMetric` renders that one measure's honest empty state - a
 * single broken endpoint never fails the whole publish.
 */
export async function buildDashboardSnapshot(
  qc: QueryClient,
  dashboard: Dashboard
): Promise<SnapshotChart[]> {
  const charts = composeCharts(dashboard);
  const { period } = dashboard;

  const sources = new Set<SourceId>();
  for (const c of charts)
    for (const s of metricDef(c.metric).sources) sources.add(s);

  const fetched: Partial<SourceData> = {};
  await Promise.all(
    [...sources].map(async (id) => {
      try {
        (fetched as Record<string, unknown>)[id] = await qc.fetchQuery(
          sourceQuery(id, period)
        );
      } catch {
        // Absent on purpose: resolveMetric shows that measure's empty state.
      }
    })
  );

  return charts.map((spec) => ({
    spec,
    data: resolveMetric(spec.metric, fetched),
  }));
}
