import type {
  BuiltInDashboardId,
  ChartKind,
  ChartSpec,
  Dashboard,
  DashboardSummary,
  MetricId,
  PublishedLink,
} from "../contracts/dashboards";
import { metricDef } from "../data/metric-catalog";

/**
 * Dashboard operations as pure functions over a saved state, shared by the
 * in-browser store and its tests. The HTTP store does the same on the server.
 */

export const BUILT_IN: Array<{ id: BuiltInDashboardId; name: string }> = [
  { id: "overview", name: "Overview" },
  { id: "conversions", name: "Conversions" },
  { id: "engagement", name: "Engagement" },
  { id: "retention", name: "Retention" },
];

export const isBuiltIn = (id: string): id is BuiltInDashboardId =>
  BUILT_IN.some((b) => b.id === id);

export interface DashboardsState {
  dashboards: Dashboard[];
  links: PublishedLink[];
}

export const EMPTY_STATE: DashboardsState = { dashboards: [], links: [] };

/** A short random id; `prefix` keeps ids readable in storage and URLs. */
export const makeId = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** The four built-in tabs always exist; stored ones only carry the user's charts. */
export function withBuiltIns(state: DashboardsState): Dashboard[] {
  const builtIns = BUILT_IN.map(
    (b): Dashboard =>
      state.dashboards.find((d) => d.id === b.id) ?? {
        id: b.id,
        name: b.name,
        builtIn: true,
        chartCount: 0,
        createdAt: null,
        updatedAt: null,
        period: "30d",
        charts: [],
      }
  );
  return [...builtIns, ...state.dashboards.filter((d) => !isBuiltIn(d.id))];
}

export const summarize = (d: Dashboard): DashboardSummary => ({
  id: d.id,
  name: d.name,
  builtIn: d.builtIn,
  chartCount: d.charts.length,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export function createDashboard(
  state: DashboardsState,
  name: string,
  now = new Date().toISOString()
): { state: DashboardsState; dashboard: Dashboard } {
  const dashboard: Dashboard = {
    id: makeId("d"),
    name: name.trim() || "Untitled dashboard",
    builtIn: false,
    chartCount: 0,
    createdAt: now,
    updatedAt: now,
    period: "30d",
    charts: [],
  };
  return {
    state: { ...state, dashboards: [...state.dashboards, dashboard] },
    dashboard,
  };
}

/** Applies a patch. Built-ins keep their name; they can only change charts and period. */
export function updateDashboard(
  state: DashboardsState,
  id: string,
  patch: { name?: string; period?: Dashboard["period"]; charts?: ChartSpec[] },
  now = new Date().toISOString()
): { state: DashboardsState; dashboard: Dashboard | null } {
  const current = withBuiltIns(state).find((d) => d.id === id);
  if (!current) return { state, dashboard: null };
  const next: Dashboard = {
    ...current,
    ...(patch.name !== undefined && !current.builtIn
      ? { name: patch.name.trim() || current.name }
      : {}),
    ...(patch.period ? { period: patch.period } : {}),
    ...(patch.charts
      ? { charts: patch.charts, chartCount: patch.charts.length }
      : {}),
    createdAt: current.createdAt ?? now,
    updatedAt: now,
  };
  const exists = state.dashboards.some((d) => d.id === id);
  return {
    state: {
      ...state,
      dashboards: exists
        ? state.dashboards.map((d) => (d.id === id ? next : d))
        : [...state.dashboards, next],
    },
    dashboard: next,
  };
}

export function duplicateDashboard(
  state: DashboardsState,
  id: string,
  now = new Date().toISOString()
): { state: DashboardsState; dashboard: Dashboard | null } {
  const source = withBuiltIns(state).find((d) => d.id === id);
  if (!source) return { state, dashboard: null };
  const created = createDashboard(state, `${source.name} copy`, now);
  const charts = source.charts.map((c) => ({ ...c, id: makeId("c") }));
  return updateDashboard(created.state, created.dashboard.id, { charts }, now);
}

/** Deletes a custom dashboard and turns off every link to it. Built-ins stay. */
export function deleteDashboard(
  state: DashboardsState,
  id: string
): DashboardsState {
  if (isBuiltIn(id)) return state;
  return {
    dashboards: state.dashboards.filter((d) => d.id !== id),
    links: state.links.filter((l) => l.dashboardId !== id),
  };
}

/** A new chart for a measure, drawn the way that measure reads best. */
export function newChartSpec(
  metric: MetricId = "reach_over_time",
  chart?: ChartKind
): ChartSpec {
  const def = metricDef(metric);
  return {
    id: makeId("c"),
    title: def.label,
    metric,
    chart:
      chart && def.charts.includes(chart) ? chart : (def.charts[0] ?? "bar"),
  };
}

/** "Wallets reached, as a line chart": how a chart describes itself. */
export function describeChart(spec: ChartSpec): string {
  const def = metricDef(spec.metric);
  return def.periodic
    ? `${def.label} · follows the period`
    : `${def.label} · latest`;
}

export function publish(
  state: DashboardsState,
  dashboardId: string,
  title: string,
  origin: string,
  now = new Date().toISOString()
): { state: DashboardsState; link: PublishedLink } {
  const token = makeId("p");
  const link: PublishedLink = {
    token,
    dashboardId,
    title: title.trim() || "Dashboard",
    url: `${origin}/d/${token}`,
    createdAt: now,
  };
  return { state: { ...state, links: [...state.links, link] }, link };
}

export const revoke = (
  state: DashboardsState,
  token: string
): DashboardsState => ({
  ...state,
  links: state.links.filter((l) => l.token !== token),
});

/** Reads saved state defensively: anything malformed starts clean. */
export function parseState(raw: string | null): DashboardsState {
  if (!raw) return EMPTY_STATE;
  try {
    const v = JSON.parse(raw) as Partial<DashboardsState>;
    return {
      dashboards: Array.isArray(v.dashboards)
        ? v.dashboards.filter((d) => d && typeof d.id === "string")
        : [],
      links: Array.isArray(v.links)
        ? v.links.filter((l) => l && typeof l.token === "string")
        : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}
