"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSelectedOrganizationId } from "@/lib/utils";

import type {
  ChartSpec,
  Dashboard,
  UpdateDashboardBody,
} from "../contracts/dashboards";
import { dashboardsApi } from "../dashboards.service";

const root = () =>
  ["analytics", "dashboards", getSelectedOrganizationId() ?? ""] as const;

export function useDashboardList() {
  return useQuery({
    queryKey: [...root(), "list"],
    queryFn: () => dashboardsApi.list(),
  });
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: [...root(), "one", id],
    queryFn: () => dashboardsApi.get(id),
  });
}

export function useDashboardLinks(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...root(), "links", id],
    queryFn: () => dashboardsApi.links(id),
    enabled,
  });
}

/** Create, edit, copy, delete and publish dashboards; every change refreshes the lists. */
export function useDashboardActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: root() });

  const create = useMutation({
    mutationFn: (name: string) => dashboardsApi.create({ name }),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDashboardBody }) =>
      dashboardsApi.update(id, body),
    // The open dashboard updates at once, so a chart appears as it is saved.
    onMutate: async ({ id, body }) => {
      const key = [...root(), "one", id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Dashboard | null>(key);
      if (previous)
        qc.setQueryData(key, {
          ...previous,
          ...body,
          chartCount: (body.charts ?? previous.charts).length,
        });
      return { key, previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: refresh,
  });
  const duplicate = useMutation({
    mutationFn: (id: string) => dashboardsApi.duplicate(id),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => dashboardsApi.remove(id),
    onSuccess: refresh,
  });
  const publish = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      dashboardsApi.publish(id, title),
    onSuccess: refresh,
  });
  const revoke = useMutation({
    mutationFn: (token: string) => dashboardsApi.revoke(token),
    onSuccess: refresh,
  });

  /** Saves one chart into a dashboard: adds it, or replaces the one with its id. */
  const saveChart = (dashboard: Dashboard, spec: ChartSpec) =>
    update.mutateAsync({
      id: dashboard.id,
      body: {
        charts: dashboard.charts.some((c) => c.id === spec.id)
          ? dashboard.charts.map((c) => (c.id === spec.id ? spec : c))
          : [...dashboard.charts, spec],
      },
    });
  const removeChart = (dashboard: Dashboard, chartId: string) =>
    update.mutateAsync({
      id: dashboard.id,
      body: { charts: dashboard.charts.filter((c) => c.id !== chartId) },
    });

  return {
    create,
    update,
    duplicate,
    remove,
    publish,
    revoke,
    saveChart,
    removeChart,
    local: dashboardsApi.local,
  };
}
