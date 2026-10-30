import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type {
  ChartData,
  ChartSpec,
  CreateDashboardBody,
  Dashboard,
  DashboardSummary,
  PublicDashboardView,
  PublishedLink,
  UpdateDashboardBody,
} from "./contracts/dashboards";
import type { AnalyticsPeriod } from "./contracts/org-analytics";
import { composeCharts } from "./utils/compose-charts";
import {
  createDashboard,
  type DashboardsState,
  deleteDashboard,
  describeChart,
  duplicateDashboard,
  parseState,
  publish,
  revoke,
  summarize,
  updateDashboard,
  withBuiltIns,
} from "./utils/dashboards";
import { viewSessionId } from "./utils/view-session";

/** What a link publishes: the period and the chart specs. The backend computes
 *  each chart's data live at read time; no numbers are sent or stored. */
export interface PublishPayload {
  period: AnalyticsPeriod;
  charts: ChartSpec[];
}

export type * from "./contracts/dashboards";

/**
 * Custom dashboards, saved charts and published links.
 *
 * The backend endpoints are a DRAFT (migration/analytics-api-draft.md), so the app
 * runs on `localDashboardsApi`, which keeps everything in this browser. The
 * HTTP client below is written to the draft contract; set
 * `NEXT_PUBLIC_ANALYTICS_DASHBOARDS_API=1` once the backend ships it.
 */
export interface DashboardsApi {
  /** True while dashboards live in this browser only. */
  readonly local: boolean;
  list(): Promise<DashboardSummary[]>;
  get(id: string): Promise<Dashboard | null>;
  create(body: CreateDashboardBody): Promise<Dashboard>;
  update(id: string, body: UpdateDashboardBody): Promise<Dashboard>;
  duplicate(id: string): Promise<Dashboard>;
  remove(id: string): Promise<void>;
  links(id: string): Promise<PublishedLink[]>;
  /** Every live link in the workspace (the Getting started checklist). */
  allLinks(): Promise<PublishedLink[]>;
  /** `payload` carries the specs + period to publish (server mode only). */
  publish(
    id: string,
    title: string,
    payload?: PublishPayload
  ): Promise<PublishedLink>;
  revoke(token: string): Promise<void>;
  /** A published dashboard's name, branding and charts, as its link shows them. */
  published(token: string): Promise<PublicDashboardView | null>;
  /** Record an anonymous view of a published link (server mode only; else no-op). */
  recordView(token: string): Promise<void>;
}

/* ---------------- in this browser ---------------- */

const storageKey = () =>
  `ons.analytics.dashboards.${getSelectedOrganizationId() ?? "default"}`;
const PUBLISHED_KEY = "ons.analytics.published";

function read(): DashboardsState {
  try {
    return parseState(window.localStorage.getItem(storageKey()));
  } catch {
    return parseState(null);
  }
}

function write(state: DashboardsState) {
  try {
    window.localStorage.setItem(storageKey(), JSON.stringify(state));
    // Links are looked up by token alone, from any workspace in this browser.
    const all = JSON.parse(
      window.localStorage.getItem(PUBLISHED_KEY) ?? "{}"
    ) as Record<string, string>;
    for (const l of state.links) all[l.token] = storageKey();
    window.localStorage.setItem(PUBLISHED_KEY, JSON.stringify(all));
  } catch {
    // Private mode or full storage: the change lasts for this page only.
  }
}

const must = <T>(v: T | null, what: string): T => {
  if (v === null) throw new Error(`${what} not found`);
  return v;
};

export const localDashboardsApi: DashboardsApi = {
  local: true,
  async list() {
    return withBuiltIns(read()).map(summarize);
  },
  async get(id) {
    return withBuiltIns(read()).find((d) => d.id === id) ?? null;
  },
  async create(body) {
    const r = createDashboard(read(), body.name);
    if (!body.charts?.length) {
      write(r.state);
      return r.dashboard;
    }
    const u = updateDashboard(r.state, r.dashboard.id, { charts: body.charts });
    write(u.state);
    return must(u.dashboard, "Dashboard");
  },
  async update(id, body) {
    const r = updateDashboard(read(), id, body);
    write(r.state);
    return must(r.dashboard, "Dashboard");
  },
  async duplicate(id) {
    const r = duplicateDashboard(read(), id);
    write(r.state);
    return must(r.dashboard, "Dashboard");
  },
  async remove(id) {
    write(deleteDashboard(read(), id));
  },
  async links(id) {
    return read().links.filter((l) => l.dashboardId === id);
  },
  async allLinks() {
    return read().links;
  },
  async publish(id, title) {
    // Local links carry no snapshot: they draw live, in this browser only.
    const r = publish(read(), id, title, window.location.origin);
    write(r.state);
    return r.link;
  },
  async revoke(token) {
    write(revoke(read(), token));
  },
  async published(token) {
    try {
      const index = JSON.parse(
        window.localStorage.getItem(PUBLISHED_KEY) ?? "{}"
      ) as Record<string, string>;
      const key = index[token];
      if (!key) return null;
      const state = parseState(window.localStorage.getItem(key));
      const link = state.links.find((l) => l.token === token);
      const dashboard =
        link && withBuiltIns(state).find((d) => d.id === link.dashboardId);
      if (!link || !dashboard) return null;
      return {
        title: link.title,
        workspaceName: null,
        period: dashboard.period,
        computedAt: null,
        charts: composeCharts(dashboard).map((spec) => ({
          spec,
          data: null,
          meta: describeChart(spec),
        })),
      };
    } catch {
      return null;
    }
  },
  async recordView() {
    // Local links are not shared beyond this browser; nothing to count.
  },
};

/* ---------------- the draft API ---------------- */

const headers = () => {
  const org = getSelectedOrganizationId();
  return org ? { "x-org-id": org } : {};
};
const unwrap = <T>(body: unknown): T =>
  isJsonObject(body) && "data" in body ? (body.data as T) : (body as T);

export const httpDashboardsApi: DashboardsApi = {
  local: false,
  async list() {
    const r = await apiClient.get("/analytics/dashboards", {
      headers: headers(),
    });
    return unwrap<DashboardSummary[]>(r.data);
  },
  async get(id) {
    const r = await apiClient.get(
      `/analytics/dashboards/${encodeURIComponent(id)}`,
      { headers: headers() }
    );
    return unwrap<Dashboard>(r.data);
  },
  async create(body) {
    const r = await apiClient.post("/analytics/dashboards", body, {
      headers: headers(),
    });
    return unwrap<Dashboard>(r.data);
  },
  async update(id, body) {
    const r = await apiClient.patch(
      `/analytics/dashboards/${encodeURIComponent(id)}`,
      body,
      { headers: headers() }
    );
    return unwrap<Dashboard>(r.data);
  },
  async duplicate(id) {
    const r = await apiClient.post(
      `/analytics/dashboards/${encodeURIComponent(id)}/duplicate`,
      {},
      { headers: headers() }
    );
    return unwrap<Dashboard>(r.data);
  },
  async remove(id) {
    await apiClient.delete(`/analytics/dashboards/${encodeURIComponent(id)}`, {
      headers: headers(),
    });
  },
  async links(id) {
    const r = await apiClient.get(
      `/analytics/dashboards/${encodeURIComponent(id)}/links`,
      { headers: headers() }
    );
    return unwrap<PublishedLink[]>(r.data);
  },
  async allLinks() {
    const r = await apiClient.get("/analytics/links", { headers: headers() });
    return unwrap<PublishedLink[]>(r.data);
  },
  async publish(id, title, payload) {
    const r = await apiClient.post(
      `/analytics/dashboards/${encodeURIComponent(id)}/links`,
      { title, period: payload?.period, charts: payload?.charts ?? [] },
      { headers: headers() }
    );
    return unwrap<PublishedLink>(r.data);
  },
  async revoke(token) {
    await apiClient.delete(`/analytics/links/${encodeURIComponent(token)}`, {
      headers: headers(),
    });
  },
  async published(token) {
    // Public, unauthenticated read: the token is the only credential.
    const r = await apiClient.get(
      `/public/dashboards/${encodeURIComponent(token)}`
    );
    const body = unwrap<{
      title: string;
      workspaceName?: string;
      period: AnalyticsPeriod;
      computedAt?: string;
      charts: Array<{ spec: ChartSpec; data: ChartData }>;
    }>(r.data);
    return {
      title: body.title,
      workspaceName: body.workspaceName ?? null,
      period: body.period,
      computedAt: body.computedAt ?? null,
      charts: body.charts.map((c) => ({
        spec: c.spec,
        data: c.data,
        meta: describeChart(c.spec),
      })),
    };
  },
  async recordView(token) {
    // Fire-and-forget: a failed beacon never breaks the public page.
    try {
      await apiClient.post(
        `/public/dashboards/${encodeURIComponent(token)}/view`,
        { sessionId: viewSessionId() }
      );
    } catch {
      /* ignore */
    }
  },
};

/**
 * Dashboards are the author's own working set, so they stay in this browser;
 * only PUBLISHING (and reading a published link) needs the backend. When the
 * endpoints are live (`NEXT_PUBLIC_ANALYTICS_DASHBOARDS_API=1`) the publish,
 * revoke, links and public-read methods go server-side while create/edit/delete
 * stay local - so a share link works for anyone, not just this browser.
 */
export const dashboardsApi: DashboardsApi =
  process.env.NEXT_PUBLIC_ANALYTICS_DASHBOARDS_API === "1"
    ? {
        ...localDashboardsApi,
        local: false,
        links: httpDashboardsApi.links,
        allLinks: httpDashboardsApi.allLinks,
        publish: httpDashboardsApi.publish,
        revoke: httpDashboardsApi.revoke,
        published: httpDashboardsApi.published,
        recordView: httpDashboardsApi.recordView,
      }
    : localDashboardsApi;
