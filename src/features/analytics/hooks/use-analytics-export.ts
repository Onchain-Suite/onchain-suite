"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { Dashboard } from "../contracts/dashboards";
import type { AnalyticsPeriod } from "../contracts/org-analytics";
import { layoutMetrics } from "../data/builtin-layouts";
import { metricDef } from "../data/metric-catalog";
import { isBuiltIn } from "../utils/dashboards";
import { chartRows, kpiRows, toCsv } from "../utils/export";
import { resolveMetric } from "../utils/resolve-metric";
import {
  type SourceData,
  type SourceId,
  sourceQuery,
} from "./use-analytics-source";

/** Exports what a dashboard shows for the period as CSV, from the cached data. */
export function useAnalyticsExport(
  dashboard: Dashboard | null | undefined,
  period: AnalyticsPeriod
) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    if (!dashboard) return;
    setBusy(true);
    try {
      const charts = [
        ...(isBuiltIn(dashboard.id) ? layoutMetrics(dashboard.id) : []),
        ...dashboard.charts.map((c) => ({ title: c.title, metric: c.metric })),
      ];
      const ids = new Set<SourceId>(
        charts.flatMap((c) => metricDef(c.metric).sources)
      );
      if (dashboard.id === "overview") ids.add("overview");
      const data: Partial<SourceData> = {};
      await Promise.all(
        Array.from(ids).map(async (id) => {
          (data as Record<string, unknown>)[id] = await qc.ensureQueryData(
            sourceQuery(id, period)
          );
        })
      );
      const rows = [
        ["Chart", "Item", `Value (last ${period.replace("d", " days")})`],
        ...(dashboard.id === "overview" ? kpiRows(data.overview) : []),
        ...charts.flatMap((c) =>
          chartRows(c.title, resolveMetric(c.metric, data))
        ),
      ];
      const url = URL.createObjectURL(
        new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `onchainsuite-${dashboard.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(
        e instanceof Error ? `Export failed: ${e.message}` : "Export failed"
      );
    } finally {
      setBusy(false);
    }
  }, [dashboard, period, qc]);

  return { exportCsv: run, exporting: busy };
}
