import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import { withApiErrorFields } from "./utils/builder-issues";

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const extractData = <T>(payload: unknown): T => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

const request = async <T>(
  config: AxiosRequestConfig,
  orgId?: string
): Promise<T> => {
  const resolvedOrgId = pickOrgId(orgId);
  const headers = {
    ...(config.headers ?? {}),
    ...(resolvedOrgId ? { "x-org-id": resolvedOrgId } : {}),
    "x-onchain-silent-error": "1",
  };

  try {
    const res = await apiClient.request<T>({ ...config, headers });
    return extractData<T>(res.data);
  } catch (e) {
    const err = e as AxiosError<unknown>;
    const data = err.response?.data;
    const nestedError =
      isJsonObject(data) && isJsonObject(data.error) ? data.error : undefined;
    const message = isJsonObject(nestedError)
      ? nestedError.message
      : isJsonObject(data)
        ? data.message
        : typeof data === "string"
          ? data
          : (err.message ?? "Automations request failed");
    // Keep the structured payload on the Error. Flattening to a string threw
    // away `code` and the `errors[]`/`warnings[]` the builder returns with
    // AUTOMATION_BUILDER_INVALID - which is why a rejected graph could only be
    // reported as "Automation builder graph is invalid", with no way to tell
    // the user WHICH step was wrong.
    throw withApiErrorFields(new Error(String(message), { cause: e }), {
      code:
        isJsonObject(nestedError) && typeof nestedError.code === "string"
          ? nestedError.code
          : isJsonObject(data) && typeof data.code === "string"
            ? data.code
            : undefined,
      details: isJsonObject(nestedError) ? nestedError.details : undefined,
      body: data,
    });
  }
};

export type AutomationsStatus =
  "draft" | "active" | "paused" | "archived" | string;

export type AutomationsListParams = {
  status?: "draft" | "active" | "paused" | string;
  tab?: "drafts" | string;
  search?: string;
  page?: number;
  limit?: number;
};

export type AutomationsSearchParams = {
  q?: string;
  page?: number;
  limit?: number;
};

export type AutomationsCountsResponse = {
  active: number;
  drafts: number;
  templates: number;
};

export type AutomationsMetricsResponse = {
  active: number;
  entries: number;
  conversions: number;
  revenue: number;
};

export type AutomationsCreateBody = {
  name: string;
  description?: string;
  triggerSpec?: unknown;
  trigger?: unknown;
  flowGraph?: unknown;
  builder?: unknown;
  steps?: unknown;
};

export type AutomationsCreateResponse = {
  automationId: string;
  status: "draft" | string;
};

/** One trigger that published but registered no watch, so it will never fire.
 *  Persisted server-side (2026-08-31): it comes back from the automation detail,
 *  the builder load, both builder saves, discard and the status toggle - not
 *  only from the publish response - so the warning survives a reload. */
export type AutomationWatchSkip = {
  nodeId?: string;
  code?: string;
  reason?: string;
};

export type AutomationBuilderResponse = {
  automationId?: string;
  status?: string;
  triggerSpec?: unknown;
  version?: number | string;
  nodes?: unknown[];
  edges?: unknown[];
  settings?: unknown;
  updatedAt?: string;
  draftSavedAt?: string;
  builderWarnings?: unknown[];
  watchesSkipped?: AutomationWatchSkip[];
  [key: string]: unknown;
};

/** One on-chain trigger's CURRENT subscription state, from
 *  `GET /automations/{id}/watches`. Distinct from `watchesSkipped`, which
 *  records what went wrong at the last sync: a watch can bind cleanly at
 *  publish and be marked `failed` by the reconciler later, and nothing else
 *  surfaces that. Treat anything but `live: true` as not firing. */
export type AutomationWatchTrigger = {
  nodeId: string;
  live: boolean;
  chain?: string;
  address?: string;
  topic0?: string;
  signature?: string | null;
  decodes?: boolean;
  actorPath?: string | null;
  watchStatus?: "active" | "draining" | "failed";
  /** null until the first event - and a stalled timestamp is the staleness
   *  signal for a subscription that quietly died. */
  lastEventAt?: string | null;
  lastError?: string | null;
  /** Set instead of the live fields when the trigger never bound. */
  code?: string;
  reason?: string;
};

export type AutomationWatchesResponse = {
  automationId?: string;
  status?: string;
  /** `"unavailable"` means the subscription read FAILED - not that nothing is
   *  subscribed. A missing live entry proves nothing in that state, so it must
   *  never render as a dead trigger. */
  subscriptions?: "known" | "unavailable" | string;
  triggers?: AutomationWatchTrigger[];
};

export type AutomationRuntimeTriggerResponse = {
  matchedAutomations?: number;
  entries?: number;
  [key: string]: unknown;
};

export type AutomationStatusUpdateBody = {
  status: "active" | "paused" | "draft" | "archived" | string;
};

export type BuilderProjectContract = {
  chain: string;
  address: string;
  label?: string;
  icon?: string;
  foundational?: boolean;
  streaming?: boolean;
};

export type BuilderProjectContractsResponse = {
  defaultChain: string | null;
  defaultContract: { chain: string; address: string } | null;
  contracts: BuilderProjectContract[];
};

export type OnchainCatalogDefinition = {
  id: string;
  label: string;
  description?: string;
  chainFamily: string;
  standard?: string;
  eventName?: string;
  topic0?: string;
  topic0s?: string[];
  aliases?: string[];
  programIds?: string[];
  instructionNames?: string[];
  categories?: string[];
  defaultConfig?: Record<string, unknown>;
};

/** One issue from the builder `validate` endpoint. `nodeId` is set for
 *  node-scoped errors so the UI can point at the offending step; graph-level
 *  errors (empty flow, missing trigger) omit it. */
export type BuilderValidationIssue = {
  code?: string;
  message?: string;
  nodeId?: string;
};

export type OnchainCatalogResponse = {
  source: string;
  /** All supported networks from the backend registry — the chain picker's
   *  source of truth. `slug` is the stored value (the runtime resolves it).
   *  `testnet` lets the picker group mainnets and testnets separately. */
  chains?: {
    slug: string;
    label: string;
    family: string;
    testnet?: boolean;
  }[];
  chainFamilies: { id: string; label: string; chains: string[] }[];
  definitions: OnchainCatalogDefinition[];
};

export const automationService = {
  listAutomations(params?: AutomationsListParams, orgId?: string) {
    return request<
      | { items?: unknown[]; meta?: unknown }
      | { data?: unknown[]; meta?: unknown }
      | unknown[]
    >({ method: "GET", url: "/automations", params }, orgId);
  },

  searchAutomations(params?: AutomationsSearchParams, orgId?: string) {
    return request<{ items?: unknown[]; meta?: unknown } | unknown[]>(
      { method: "GET", url: "/automations/search", params },
      orgId
    );
  },

  getCounts(orgId?: string) {
    return request<AutomationsCountsResponse>(
      { method: "GET", url: "/automations/counts" },
      orgId
    );
  },

  getMetrics(orgId?: string) {
    return request<AutomationsMetricsResponse>(
      { method: "GET", url: "/automations/metrics" },
      orgId
    );
  },

  createAutomation(body: AutomationsCreateBody, orgId?: string) {
    return request<AutomationsCreateResponse>(
      { method: "POST", url: "/automations", data: body },
      orgId
    );
  },

  getAutomation(automationId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: `/automations/${automationId}` },
      orgId
    );
  },

  updateAutomation(
    automationId: string,
    body: Record<string, unknown>,
    orgId?: string
  ) {
    return request<Record<string, unknown>>(
      { method: "PUT", url: `/automations/${automationId}`, data: body },
      orgId
    );
  },

  updateAutomationStatus(
    automationId: string,
    body: AutomationStatusUpdateBody,
    orgId?: string
  ) {
    return request<Record<string, unknown>>(
      { method: "PUT", url: `/automations/${automationId}/status`, data: body },
      orgId
    );
  },

  publishAutomation(automationId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "POST", url: `/automations/${automationId}/publish` },
      orgId
    );
  },

  duplicateAutomation(automationId: string, orgId?: string) {
    return request<{ automationId?: string } & Record<string, unknown>>(
      { method: "POST", url: `/automations/${automationId}/duplicate` },
      orgId
    );
  },

  deleteAutomation(automationId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "DELETE", url: `/automations/${automationId}` },
      orgId
    );
  },

  getLastEdited(automationId: string, orgId?: string) {
    return request<{ lastEditedAt?: string } & Record<string, unknown>>(
      { method: "GET", url: `/automations/${automationId}/last-edited` },
      orgId
    );
  },

  listTemplates(orgId?: string) {
    return request<{ items?: unknown[] } | unknown[]>(
      { method: "GET", url: "/automations/templates" },
      orgId
    );
  },

  getTemplate(templateId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: `/automations/templates/${templateId}` },
      orgId
    );
  },

  applyTemplate(templateId: string, orgId?: string) {
    return request<{ automationId?: string } & Record<string, unknown>>(
      {
        method: "POST",
        url: `/automations/templates/${templateId}/apply`,
      },
      orgId
    );
  },

  getBuilder(automationId: string, orgId?: string) {
    return request<AutomationBuilderResponse>(
      { method: "GET", url: `/automations/${automationId}/builder` },
      orgId
    );
  },

  saveBuilder(
    automationId: string,
    body: Record<string, unknown>,
    orgId?: string
  ) {
    return request<AutomationBuilderResponse>(
      {
        method: "PUT",
        url: `/automations/${automationId}/builder`,
        data: body,
      },
      orgId
    );
  },

  saveBuilderDraft(
    automationId: string,
    body: Record<string, unknown>,
    orgId?: string
  ) {
    return request<AutomationBuilderResponse>(
      {
        method: "PUT",
        url: `/automations/${automationId}/builder/draft`,
        data: body,
      },
      orgId
    );
  },

  validateBuilder(
    automationId: string,
    body: Record<string, unknown>,
    orgId?: string
  ) {
    return request<
      {
        errors?: BuilderValidationIssue[];
        warnings?: BuilderValidationIssue[];
      } & Record<string, unknown>
    >(
      {
        method: "POST",
        url: `/automations/${automationId}/builder/validate`,
        data: body,
      },
      orgId
    );
  },

  discardBuilder(automationId: string, orgId?: string) {
    return request<AutomationBuilderResponse>(
      { method: "POST", url: `/automations/${automationId}/builder/discard` },
      orgId
    );
  },

  resetBuilder(automationId: string, orgId?: string) {
    return request<AutomationBuilderResponse>(
      { method: "POST", url: `/automations/${automationId}/builder/reset` },
      orgId
    );
  },

  getBuilderProjectContracts(orgId?: string) {
    return request<BuilderProjectContractsResponse>(
      { method: "GET", url: "/automations/builder/project-contracts" },
      orgId
    );
  },

  getOnchainCatalog(orgId?: string) {
    return request<OnchainCatalogResponse>(
      { method: "GET", url: "/automations/builder/onchain/catalog" },
      orgId
    );
  },

  /**
   * Events a specific contract emits (decoded from its recent on-chain logs),
   * for the trigger's Event dropdown. Backed lazily + cached server-side, with a
   * catalog fallback, so it's safe to fetch on contract-select.
   */
  getContractEvents(chain: string, address: string, orgId?: string) {
    return request<{
      events: { value: string; label: string; topic0?: string }[];
      // A chosen contract resolves to its own events; `empty`/`unavailable`/
      // `unsupported` describe why there are none. `catalog` is only the
      // no-contract browse list.
      source: "live" | "empty" | "unavailable" | "unsupported" | "catalog";
    }>(
      {
        method: "GET",
        url: "/automations/builder/onchain/contract-events",
        params: { chain, address },
      },
      orgId
    );
  },

  /**
   * `GET /events/catalog` - distinct Custom Events API event names from the
   * last 30 days, for app_event trigger autocomplete (docs/backend.md
   * 2026-07-21). Ingestion itself is server-to-server (`POST /events`,
   * secret-key auth) - the dashboard only ever reads the catalog.
   */
  async getEventsCatalog(orgId?: string): Promise<string[]> {
    const payload = await request<unknown>(
      { method: "GET", url: "/events/catalog" },
      orgId
    );
    const root = isJsonObject(payload) ? payload : {};
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(root.items)
        ? root.items
        : Array.isArray(root.events)
          ? root.events
          : Array.isArray(root.names)
            ? root.names
            : [];
    return list
      .map((entry) =>
        typeof entry === "string"
          ? entry
          : isJsonObject(entry) && typeof entry.name === "string"
            ? entry.name
            : isJsonObject(entry) && typeof entry.event === "string"
              ? entry.event
              : null
      )
      .filter((name): name is string => Boolean(name && name.length > 0));
  },

  listTriggerTypes(orgId?: string) {
    return request<{ items?: unknown[] } | unknown[]>(
      { method: "GET", url: "/automations/builder/triggers" },
      orgId
    );
  },

  getTriggerSchema(triggerType: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: `/automations/builder/triggers/${triggerType}` },
      orgId
    );
  },

  listAvailableTriggers(orgId?: string) {
    // The controller is `automations/runtime`; the un-prefixed path 404s in
    // production (docs/backend.md, 2026-08-30 route sweep).
    return request<{ items?: unknown[] } | unknown[]>(
      { method: "GET", url: "/automations/runtime/triggers/available" },
      orgId
    );
  },

  /**
   * What the automation is subscribed to RIGHT NOW - the only way to see a
   * watch the reconciler marked `failed` after a clean publish.
   */
  getWatches(automationId: string, orgId?: string) {
    return request<AutomationWatchesResponse>(
      { method: "GET", url: `/automations/${automationId}/watches` },
      orgId
    );
  },

  listActionTypes(orgId?: string) {
    return request<{ items?: unknown[] } | unknown[]>(
      { method: "GET", url: "/automations/builder/actions" },
      orgId
    );
  },

  getActionSchema(actionType: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: `/automations/builder/actions/${actionType}` },
      orgId
    );
  },

  listBuilderEmailTemplates(orgId?: string) {
    return request<{ items?: unknown[] } | unknown[]>(
      { method: "GET", url: "/automations/builder/email-templates" },
      orgId
    );
  },

  previewAutomation(
    automationId: string,
    body: Record<string, unknown>,
    orgId?: string
  ) {
    return request<Record<string, unknown>>(
      {
        method: "POST",
        url: `/automations/${automationId}/preview`,
        data: body,
      },
      orgId
    );
  },

  triggerSegmentEntered(
    body: {
      segmentId: string;
      contactId?: string;
      email?: string;
      walletAddress?: string;
      sourceEventId?: string;
      payload?: Record<string, unknown>;
    },
    orgId?: string
  ) {
    return request<AutomationRuntimeTriggerResponse>(
      {
        method: "POST",
        url: "/automations/runtime/triggers/segment-entered",
        data: body,
      },
      orgId
    );
  },

  triggerListJoined(
    body: {
      segmentId: string;
      contactId?: string;
      email?: string;
      walletAddress?: string;
      sourceEventId?: string;
      payload?: Record<string, unknown>;
    },
    orgId?: string
  ) {
    return request<AutomationRuntimeTriggerResponse>(
      {
        method: "POST",
        url: "/automations/runtime/triggers/list-joined",
        data: body,
      },
      orgId
    );
  },

  triggerFormSubmitted(
    body: {
      formId: string;
      contactId?: string;
      email?: string;
      walletAddress?: string;
      sourceEventId?: string;
      payload?: Record<string, unknown>;
    },
    orgId?: string
  ) {
    return request<AutomationRuntimeTriggerResponse>(
      {
        method: "POST",
        url: "/automations/runtime/triggers/form-submitted",
        data: body,
      },
      orgId
    );
  },

  triggerOnchainEvent(
    body: {
      chain: string;
      event: string;
      walletAddress?: string;
      contractAddress?: string;
      txHash?: string;
      sourceEventId?: string;
      payload?: Record<string, unknown>;
    },
    orgId?: string
  ) {
    return request<AutomationRuntimeTriggerResponse>(
      {
        method: "POST",
        url: "/automations/runtime/triggers/onchain-event",
        data: body,
      },
      orgId
    );
  },

  triggerEmailOpened(
    body: {
      campaignId?: string;
      deliveryId?: string;
      contactId?: string;
      email?: string;
      walletAddress?: string;
      sourceEventId?: string;
      payload?: Record<string, unknown>;
    },
    orgId?: string
  ) {
    return request<AutomationRuntimeTriggerResponse>(
      {
        method: "POST",
        url: "/automations/runtime/triggers/email-opened",
        data: body,
      },
      orgId
    );
  },

  triggerHealthThreshold(
    body: {
      score: number;
      contactId?: string;
      email?: string;
      walletAddress?: string;
      sourceEventId?: string;
      payload?: Record<string, unknown>;
    },
    orgId?: string
  ) {
    return request<AutomationRuntimeTriggerResponse>(
      {
        method: "POST",
        url: "/automations/runtime/triggers/health-threshold",
        data: body,
      },
      orgId
    );
  },

  getStatsOverview(automationId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: `/automations/${automationId}/stats` },
      orgId
    );
  },

  /** Per-node funnel (reached / completed / dropped) + overall enrolled → completed. */
  getFlowAnalytics(automationId: string, orgId?: string) {
    return request<{
      automationId: string;
      overall: { enrolled: number; completed: number; completionRate: number };
      nodes: {
        nodeId: string;
        type: string | null;
        reached: number;
        completed: number;
        skipped: number;
        failed: number;
        dropped: number;
      }[];
    }>(
      { method: "GET", url: `/automations/${automationId}/flow-analytics` },
      orgId
    );
  },

  getStatsPreview(automationId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: `/automations/${automationId}/stats/preview` },
      orgId
    );
  },

  getStatsTimeSeries(
    automationId: string,
    params?: { period?: "7days" | "30days" | "90days" | string },
    orgId?: string
  ) {
    return request<Record<string, unknown>>(
      {
        method: "GET",
        url: `/automations/${automationId}/stats/time-series`,
        params,
      },
      orgId
    );
  },

  getStatsPaths(automationId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: `/automations/${automationId}/stats/paths` },
      orgId
    );
  },

  listStatsEntries(
    automationId: string,
    params?: { page?: number; limit?: number; sort?: string },
    orgId?: string
  ) {
    return request<Record<string, unknown>>(
      {
        method: "GET",
        url: `/automations/${automationId}/stats/entries`,
        params,
      },
      orgId
    );
  },

  getStatsEntryDetails(automationId: string, entryId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      {
        method: "GET",
        url: `/automations/${automationId}/stats/entries/${entryId}`,
      },
      orgId
    );
  },

  getStatsRevenue(automationId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: `/automations/${automationId}/stats/revenue` },
      orgId
    );
  },

  getPerformance(automationId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: `/automations/${automationId}/performance` },
      orgId
    );
  },
};
