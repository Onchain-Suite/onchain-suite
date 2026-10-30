import type { ChartSpec, Dashboard } from "../contracts/dashboards";
import { BUILT_IN_LAYOUTS } from "../data/builtin-layouts";
import { isBuiltIn } from "./dashboards";

/**
 * The charts a dashboard actually publishes: built-in measure cards first (for a
 * built-in tab) then the user's own. `special` and `missing` built-in cards are
 * left to the live app and never published - a share link carries only measures
 * the public read can compute. Only the specs travel; the backend computes each
 * chart's data live at read time.
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
