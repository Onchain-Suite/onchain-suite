"use client";

import { useQuery } from "@tanstack/react-query";

import "../analytics.css";
import { dashboardsApi } from "../../dashboards.service";
import { BUILT_IN_LAYOUTS } from "../../data/builtin-layouts";
import { describeChart, isBuiltIn } from "../../utils/dashboards";
import { MetricCard } from "../metric-card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * A published dashboard, read-only and without the app shell. Built-in tabs
 * show their charts; custom dashboards show their own.
 */
export function PublicDashboard({ token }: { token: string }) {
  const q = useQuery({
    queryKey: ["analytics", "published", token],
    queryFn: () => dashboardsApi.published(token),
    retry: false,
  });

  if (q.isLoading) {
    return (
      <div className="an-public">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[280px] w-full" />
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="an-public">
        <div className="an-gone">
          <b>This dashboard isn&apos;t available</b>
          <p>
            The link was turned off, or it was made somewhere this browser
            can&apos;t see.
          </p>
        </div>
      </div>
    );
  }

  const { title, dashboard } = q.data;
  const builtInCharts = isBuiltIn(dashboard.id)
    ? BUILT_IN_LAYOUTS[dashboard.id].flatMap((c) =>
        c.kind === "metric"
          ? [
              {
                id: c.title,
                title: c.title,
                metric: c.metric,
                chart: c.chart,
                meta: c.meta,
              },
            ]
          : []
      )
    : [];
  const charts = [
    ...builtInCharts,
    ...dashboard.charts.map((c) => ({ ...c, meta: describeChart(c) })),
  ];

  return (
    <div className="an-public">
      <header>
        <div className="an-public__eyebrow">OnchainSuite dashboard</div>
        <h1>{title}</h1>
        <p className="an-head__sub">
          <span className="an-public__live">
            Live · recomputed when you open it
          </span>
        </p>
      </header>
      {charts.length === 0 ? (
        <div className="an-gone">
          <b>Nothing on this dashboard yet</b>
        </div>
      ) : (
        <div className="an-bento">
          {charts.map((c) => (
            <MetricCard
              key={c.id}
              title={c.title}
              meta={c.meta}
              metric={c.metric}
              chart={c.chart}
              period={dashboard.period}
            />
          ))}
        </div>
      )}
      <p className="an-public__foot">
        Totals only. No individual contact is shown on a published dashboard.
      </p>
    </div>
  );
}
