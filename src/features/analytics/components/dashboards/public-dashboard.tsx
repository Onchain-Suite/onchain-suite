"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import "../analytics.css";
import { dashboardsApi } from "../../dashboards.service";
import { MetricCard } from "../metric-card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * A published dashboard, read-only and without the app shell. Each chart is
 * recomputed live for the workspace every time the link is opened (the server
 * computes it for an anonymous viewer). Branded with the workspace's name.
 */
export function PublicDashboard({ token }: { token: string }) {
  const q = useQuery({
    queryKey: ["analytics", "published", token],
    queryFn: () => dashboardsApi.published(token),
    retry: false,
  });

  // Count this open (anonymous, deduped per visit); never blocks the render.
  useEffect(() => {
    dashboardsApi.recordView(token).catch(() => {});
  }, [token]);

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

  const { title, workspaceName, period, charts } = q.data;

  return (
    <div className="an-public">
      <header>
        <div className="an-public__eyebrow">
          {workspaceName
            ? `${workspaceName} · dashboard`
            : "OnchainSuite dashboard"}
        </div>
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
              key={c.spec.id}
              title={c.spec.title}
              meta={c.meta}
              metric={c.spec.metric}
              chart={c.spec.chart}
              period={period}
              data={c.data}
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
