/**
 * Custom dashboards, saved charts and published links.
 *
 * **DRAFT CONTRACT: no backend yet.** These types are the request and response
 * shapes proposed to the backend team in `migration/analytics-api-draft.md`. Until
 * the endpoints exist, `dashboards.service.ts` keeps them in this browser
 * (localStorage) behind the same interface, so switching to the API is a
 * one-line change there.
 *
 * Proposed routes (all org-scoped via `x-org-id` unless noted):
 *   GET    /analytics/dashboards                 -> { data: DashboardSummary[] }
 *   POST   /analytics/dashboards                 -> Dashboard          (CreateDashboardBody)
 *   GET    /analytics/dashboards/:id             -> Dashboard
 *   PATCH  /analytics/dashboards/:id             -> Dashboard          (UpdateDashboardBody)
 *   POST   /analytics/dashboards/:id/duplicate   -> Dashboard
 *   DELETE /analytics/dashboards/:id             -> 204
 *   GET    /analytics/dashboards/:id/links       -> { data: PublishedLink[] }
 *   POST   /analytics/dashboards/:id/links       -> PublishedLink      (PublishBody)
 *   DELETE /analytics/links/:token               -> 204
 *   GET    /public/dashboards/:token             -> PublicDashboard    (no auth)
 *
 * The four built-in tabs (`overview`, `conversions`, `engagement`,
 * `retention`) are dashboards with those reserved ids: they always exist,
 * cannot be renamed or deleted, and their `charts` are the user's own charts
 * shown after the built-in cards.
 */

import type { AnalyticsPeriod } from "./org-analytics";

/** A chart someone added: which measure, drawn how. */
export interface ChartSpec {
  id: string;
  title: string;
  /** A key of the metric catalog (`data/metric-catalog.ts`). */
  metric: MetricId;
  chart: ChartKind;
}

export type ChartKind =
  "line" | "area" | "bar" | "stacked" | "hbar" | "donut" | "number" | "table";

/**
 * Every measure a chart can show. Each maps to an endpoint that exists today,
 * so a saved chart always draws real numbers.
 */
export type MetricId =
  | "reach_over_time"
  | "conversions_over_time"
  | "conversion_rate_over_time"
  | "messages_by_channel"
  | "engagement_rates"
  | "push_funnel"
  | "onchain_activity"
  | "conversions_by_event"
  | "new_contacts_by_week"
  | "reachability"
  | "lifecycle"
  | "segment_engagement"
  | "holders_by_balance"
  | "cohort_retention";

export type BuiltInDashboardId =
  "overview" | "conversions" | "engagement" | "retention";

export interface DashboardSummary {
  id: string;
  name: string;
  builtIn: boolean;
  chartCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Dashboard extends DashboardSummary {
  /** The period the dashboard opens on; viewers can change it for themselves. */
  period: AnalyticsPeriod;
  charts: ChartSpec[];
}

export interface CreateDashboardBody {
  name: string;
  charts?: ChartSpec[];
}

/** Built-in dashboards accept `charts` and `period` only. */
export interface UpdateDashboardBody {
  name?: string;
  period?: AnalyticsPeriod;
  charts?: ChartSpec[];
}

export interface PublishBody {
  /** Shown as the public page's heading. Defaults to the dashboard name. */
  title?: string;
}

/** A read-only public link to a dashboard. Revoking it stops it at once. */
export interface PublishedLink {
  token: string;
  dashboardId: string;
  title: string;
  /** Absolute URL of the public page, e.g. `https://app…/d/<token>`. */
  url: string;
  createdAt: string;
}

/**
 * `GET /public/dashboards/:token`: what an anonymous viewer gets. The server
 * computes every chart's data so the page needs no org access; it holds no
 * contact-level rows, only the aggregates the charts draw.
 */
export interface PublicDashboard {
  title: string;
  workspaceName: string;
  period: AnalyticsPeriod;
  computedAt: string;
  charts: Array<{ spec: ChartSpec; data: ChartData }>;
}

/** Chart-ready data: rows keyed by a category plus one key per series. */
export interface ChartData {
  categoryKey: string;
  rows: Array<Record<string, string | number | null>>;
  series: Array<{ key: string; label: string; color?: string }>;
  /** How values read: a count, a percentage, or seconds. */
  unit: "count" | "percent" | "seconds";
  /** The single headline number for `number` charts; null when unknown. */
  total: number | null;
  /** Why there is nothing to draw, when there is nothing. */
  emptyReason?: string;
}
