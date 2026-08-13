import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

export type IntelligenceQueryStatus =
  "running" | "completed" | "failed" | string;

export interface IntelligenceQueryRunResponse {
  queryId: string;
  status: IntelligenceQueryStatus;
  resultSummary?: string | null;
  provider?: string;
  // Backend contract: columns are { key, label?, type? }. `name` kept for
  // backward-compat with older responses.
  columns?: Array<{
    key?: string;
    name?: string;
    label?: string;
    type?: string;
  }>;
  rows?: Array<Record<string, unknown>> | unknown[];
  totalRows?: number;
  cache?: Record<string, unknown>;
  summary?: Record<string, unknown>;
}

export interface IntelligenceQueryValidateResponse {
  valid: boolean;
  suggestions?: string[];
}

export interface IntelligenceQueryHistoryItem {
  queryId: string;
  id?: string;
  query: string;
  status: IntelligenceQueryStatus;
  createdAt?: string;
  updatedAt?: string;
  resultSummary?: string;
  provider?: string;
  cacheHit?: boolean;
  metadata?: Record<string, unknown>;
}

export interface IntelligenceGoldrushRunBody {
  resourceType:
    | "balances"
    | "transactions"
    | "nft_holdings"
    | "portfolio_summary"
    | "enriched_activity";
  chain: string;
  subjectAddress: string;
  forceRefresh?: boolean;
  allowStale?: boolean;
  cacheScope?: "organization" | "user";
  limit?: number;
  cursor?: string;
  noSpam?: boolean;
}

export interface IntelligenceGoldrushMcpQueryBody {
  conversationId?: string;
  message?: string;
  prompt?: string;
  sql?: string;
  protocol?: string;
  chain?: string;
  chains?: string[];
  contractAddress?: string;
  contractAddresses?: string[];
  contracts?: Array<{ chain?: string; address: string; label?: string }>;
  walletAddress?: string;
  walletAddresses?: string[];
  mode?: "fast" | "best";
  maxSteps?: number;
  useProjectSettings?: boolean;
  useProtocolRegistry?: boolean;
}

export interface IntelligenceGoldrushMcpStep {
  toolName?: string;
  title?: string;
  description?: string;
  preview?: unknown;
  [key: string]: unknown;
}

export type IntelligenceGoldrushMcpStructuredResultKind =
  | "multichain_address_activity"
  | "multichain_balances"
  | "multichain_transactions"
  | "wallet_balances"
  | "historical_wallet_balances"
  | "native_token_balance"
  | "erc20_token_transfers"
  | "portfolio_value"
  | "token_holders"
  | "transaction"
  | "transaction_summary"
  | "transactions"
  | "block_transactions"
  | "nft_for_address"
  | "nft_check_ownership"
  | "token_approvals"
  | "bitcoin_hd_wallet_balances"
  | "bitcoin_non_hd_wallet_balances"
  | "bitcoin_transactions"
  | "historical_token_prices"
  | "gas_prices"
  | "log_events_by_address"
  | "log_events_by_topic"
  | "block"
  | "block_heights"
  | "generic_rows"
  | "generic_object"
  | string;

export interface IntelligenceGoldrushMcpStructuredResult {
  toolName?: string;
  kind: IntelligenceGoldrushMcpStructuredResultKind;
  title?: string;
  summary?: string;
  rows: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
}

export interface IntelligenceGoldrushMcpQueryResponse {
  conversationId?: string;
  queryId?: string;
  mode?: "dynamic_agent" | "deterministic_fallback" | string;
  status?: "answered" | "needs_clarification" | string;
  answer?: string;
  question?: string;
  structuredResult?: IntelligenceGoldrushMcpStructuredResult | null;
  rationale?: string;
  confidence?: number;
  plan?: unknown;
  steps?: IntelligenceGoldrushMcpStep[];
  execution?: unknown;
  [key: string]: unknown;
}

export interface IntelligenceGoldrushMcpTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

export interface IntelligenceGoldrushMcpToolsResponse {
  items: IntelligenceGoldrushMcpTool[];
}

export interface IntelligenceGoldrushMcpCatalogResponse {
  tools?: Array<Record<string, unknown>>;
  resources?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface IntelligenceGoldrushMcpResource {
  uri: string;
  name?: string;
  title?: string;
  description?: string;
  mimeType?: string;
  [key: string]: unknown;
}

export interface IntelligenceGoldrushMcpResourcesResponse {
  items: IntelligenceGoldrushMcpResource[];
}

export interface IntelligenceGoldrushMcpRunBody {
  toolName: string;
  arguments?: Record<string, unknown>;
}

export interface IntelligenceGoldrushMcpReadResourceBody {
  uri: string;
}

export interface IntelligenceGoldrushMcpRunResponse {
  toolName?: string;
  arguments?: Record<string, unknown>;
  isError?: boolean;
  structuredContent?: unknown;
  textContent?: unknown;
  parsedText?: unknown;
  raw?: unknown;
  [key: string]: unknown;
}

export interface IntelligenceGoldrushMcpReadResourceResponse {
  uri?: string;
  textContent?: unknown;
  parsedText?: unknown;
  raw?: unknown;
  [key: string]: unknown;
}

export interface IntelligenceGoldrushMcpPlanResponse {
  intent?: string;
  supported?: boolean;
  protocol?: unknown;
  requestedChains?: string[];
  resolvedContracts?: Array<Record<string, unknown>>;
  sources?: unknown;
  execution?: unknown;
  warnings?: string[];
  [key: string]: unknown;
}

export interface IntelligenceQueryStatusResponse {
  queryId: string;
  status: IntelligenceQueryStatus;
  error?: string;
  updatedAt?: string;
}

export interface IntelligenceQueryResultsResponse {
  rows: Array<Record<string, unknown>> | unknown[];
  total: number;
}

export interface IntelligenceQuerySummaryResponse {
  summary: string;
  winbackPotential?: string;
  score?: number;
}

export interface IntelligenceQuerySaveResponse {
  reportId?: string;
  success?: boolean;
}

export interface IntelligenceQueryStarter {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  query: string;
}

export interface IntelligenceQueryStartersResponse {
  items: IntelligenceQueryStarter[];
}

export interface IntelligenceQuerySuggestionRequest {
  prompt?: string;
  protocol?: string;
  sector?:
    | "nft"
    | "defi"
    | "gaming"
    | "meme"
    | "dao"
    | "payments"
    | "infrastructure"
    | "general";
  chain?: string;
  contractAddresses?: string[];
  goal?: string;
  limit?: number;
  includeSql?: boolean;
  mode?: "fast" | "best";
}

export interface IntelligenceQuerySuggestion {
  id: string;
  title: string;
  prompt?: string;
  reason?: string;
  sector?: string;
  goal?: string;
  tags?: string[];
  suggestedTables?: string[];
  sqlDraft?: string;
  starterQuery?: IntelligenceQueryStarter | Record<string, unknown> | null;
  warnings?: string[];
  confidence?: number;
}

export interface IntelligenceQuerySuggestionsResponse {
  source?: string;
  summary?: string;
  context?: Record<string, unknown>;
  suggestions: IntelligenceQuerySuggestion[];
}

export interface IntelligenceProtocolRegistryEntry {
  id: string;
  name: string;
  slug?: string;
  sector?: string;
  chain?: string;
  contractAddresses?: string[];
  aliases?: string[];
  metadata?: Record<string, unknown>;
  updatedAt?: string;
}

export interface IntelligenceProtocolRegistryListResponse {
  items: IntelligenceProtocolRegistryEntry[];
}

export interface IntelligenceQuerySuggestionTrackRequest {
  selected?: boolean;
  executed?: boolean;
  saved?: boolean;
  convertedToSegment?: boolean;
  convertedToCampaign?: boolean;
  metadata?: Record<string, unknown>;
}

export interface IntelligenceQuerySuggestionTrackResponse {
  id: string;
  suggestionId?: string;
  selected?: boolean;
  executed?: boolean;
  saved?: boolean;
  convertedToSegment?: boolean;
  convertedToCampaign?: boolean;
  lastInteractionAt?: string;
  metadata?: Record<string, unknown>;
}

export interface IntelligenceQuerySuggestionsAnalyticsResponse {
  totals?: Record<string, unknown>;
  topProtocols?: Array<Record<string, unknown>>;
}

export interface IntelligenceGenerateSqlResponse {
  prompt?: string;
  sql?: string;
  explanation?: string;
  warnings?: string[];
  valid?: boolean;
  starterQuery?: IntelligenceQueryStarter | Record<string, unknown> | null;
  schema?: Record<string, unknown>;
  provider?: string;
  mode?: "fast" | "best" | string;
}

export interface IntelligenceSegmentFromQueryResponse {
  segmentId: string;
  profileCount?: number;
  /** Contacts newly created while materializing the segment (wallet-first). */
  contactsCreated?: number;
}

/** Column type inferred by the backend report layer. */
export type IntelligenceReportColumnType =
  "number" | "date" | "wallet" | "string";

/**
 * A backend-suggested visualization for a stored query. Line/bar charts carry
 * `xKey`/`yKey`; pie charts carry `labelKey`/`valueKey`. `data` is chart-ready
 * (already aggregated/sorted/bounded server-side).
 */
export interface IntelligenceQueryReportChart {
  type: "line" | "bar" | "pie";
  title: string;
  xKey?: string;
  yKey?: string;
  labelKey?: string;
  valueKey?: string;
  data: Array<Record<string, unknown>>;
}

/** Summary stats for one numeric column of a stored query. */
export interface IntelligenceQueryReportStat {
  key: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

/** `GET /intelligence/query/:queryId/report-data` - chart-ready report payload. */
export interface IntelligenceQueryReportDataResponse {
  queryId: string;
  generatedAt?: string;
  rowCount: number;
  columns: Array<{ key: string; type: IntelligenceReportColumnType }>;
  table: { columns: string[]; rows: Array<Record<string, unknown>> };
  charts: IntelligenceQueryReportChart[];
  stats: IntelligenceQueryReportStat[];
}

export interface IntelligenceCampaignFromQueryResponse {
  campaignId: string;
}

export interface IntelligenceSchemaResponse {
  tables?: Array<Record<string, unknown>>;
  entities?: Array<Record<string, unknown>>;
  columns?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface IntelligenceMetricsResponse {
  score?: number;
  segmentsCount?: number;
  revenuePotential?: number;
  [key: string]: unknown;
}

export interface IntelligenceSegment {
  id: string;
  name: string;
  /**
   * Derived member count (wallet-list length). `null` means the segment is
   * rule-based and lazily resolved on use; render "Resolved on use".
   */
  size?: number | null;
  /** Query this segment was created/imported from, when applicable. */
  sourceQueryId?: string | null;
  matchCount?: number;
  lastUsedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  tags?: string[];
  rules?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IntelligenceSegmentsListResponse {
  items: IntelligenceSegment[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface IntelligenceSegmentsMetricsResponse {
  segmentsCount?: number;
  revenuePotential?: number;
  [key: string]: unknown;
}

export interface IntelligenceSegmentProfilesResponse {
  items: Array<Record<string, unknown>>;
  total?: number;
  page?: number;
  limit?: number;
}

export interface IntelligenceReportsListResponse {
  items: Array<Record<string, unknown>>;
  total?: number;
  page?: number;
  limit?: number;
}

export interface IntelligenceQueryCacheListResponse {
  data: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
}

export type IntelligenceQueryCacheDetailResponse = Record<string, unknown>;

export type IntelligenceWalletEnrichmentEnqueueResponse = Record<
  string,
  unknown
>;

export type IntelligenceContactsEnrichmentEnqueueResponse = Record<
  string,
  unknown
>;

export type IntelligenceWalletEnrichmentMetricsResponse = Record<
  string,
  unknown
>;

/** GoldRush credit meter - `GET /intelligence/query/credits`. */
export interface IntelligenceCreditMeter {
  period: string;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  warnAt?: number;
  status: "ok" | "warn" | "exceeded" | string;
}

/** Enrichment progress - `GET /intelligence/query/enrichment/status`. */
export interface IntelligenceEnrichmentStatus {
  enrichedWallets: number;
  lastEnrichedAt: string | null;
  queue: {
    active: number;
    waiting: number;
    delayed: number;
    completed: number;
    failed: number;
  } | null;
  pending: number;
  idle: boolean;
}

/** Result of seeding enrichment from saved contracts. */
export interface IntelligenceEnrichProtocolResponse {
  contracts: Array<{ chain: string; address: string; holdersEnqueued: number }>;
  walletsEnqueued: number;
  contactsEnqueued: number;
}

export interface IntelligenceGoldrushMcpStreamEvent {
  type?: string;
  data?: unknown;
}

export type IntelligenceGoldrushMcpStreamTransport = "get" | "post";

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
          : (err.message ?? "Intelligence request failed");
    throw new Error(String(message), { cause: e });
  }
};

const appendUniqueSearchParams = (
  params: URLSearchParams,
  key: string,
  values?: string[]
) => {
  if (!Array.isArray(values)) return;
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    params.append(key, trimmed);
  }
};

const buildGoldrushMcpStreamSearchParams = (
  input: IntelligenceGoldrushMcpQueryBody
) => {
  const params = new URLSearchParams();

  if (input.prompt) params.set("prompt", input.prompt);
  if (input.sql) params.set("sql", input.sql);
  if (input.protocol) params.set("protocol", input.protocol);
  if (input.chain) params.set("chain", input.chain);
  if (input.contractAddress) {
    params.set("contractAddress", input.contractAddress);
  }
  if (input.walletAddress) params.set("walletAddress", input.walletAddress);
  if (input.mode) params.set("mode", input.mode);
  if (typeof input.maxSteps === "number") {
    params.set("maxSteps", String(input.maxSteps));
  }
  if (typeof input.useProjectSettings === "boolean") {
    params.set("useProjectSettings", String(input.useProjectSettings));
  }
  if (typeof input.useProtocolRegistry === "boolean") {
    params.set("useProtocolRegistry", String(input.useProtocolRegistry));
  }

  appendUniqueSearchParams(params, "chains", input.chains);
  appendUniqueSearchParams(
    params,
    "contractAddresses",
    input.contractAddresses
  );
  appendUniqueSearchParams(params, "walletAddresses", input.walletAddresses);

  if (Array.isArray(input.contracts)) {
    for (const contract of input.contracts) {
      const address = contract.address.trim();
      if (address.length === 0) continue;
      const payload: Record<string, string> = { address };
      if (contract.chain?.trim()) payload.chain = contract.chain.trim();
      if (contract.label?.trim()) payload.label = contract.label.trim();
      params.append("contracts", JSON.stringify(payload));
    }
  }

  return params;
};

const parseSseEventData = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const toStreamEvent = (
  eventType: string | undefined,
  rawData: string
): IntelligenceGoldrushMcpStreamEvent => {
  const parsed = parseSseEventData(rawData);
  return {
    type:
      eventType ??
      (isJsonObject(parsed) && typeof parsed.type === "string"
        ? parsed.type
        : undefined),
    data: parsed,
  };
};

const MCP_STREAM_EVENT_TYPES = [
  "started",
  "planner_ready",
  "resource_context",
  "tools_discovered",
  "step_started",
  "decision",
  "validation_issue",
  "tool_call_started",
  "tool_call_result",
  "clarification",
  "summarizing",
  "answer_token",
  "final",
  "error",
] as const;

const createAbortError = () => {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The SSE stream was aborted.", "AbortError");
  }
  return new Error("The SSE stream was aborted.");
};

/** A wallet returned by the live segment-preview endpoint. */
export interface IntelligenceSegmentPreviewWallet {
  address: string;
  ens?: string | null;
}

/**
 * Result of `POST /intelligence/segments/preview` - a live estimate of how many
 * wallets a draft segment matches, plus a few examples. `matchCount` is null when
 * the endpoint is unavailable so the UI can fall back to an honest "computed on
 * save" state instead of showing a fabricated number.
 */
export interface IntelligenceSegmentPreview {
  matchCount: number | null;
  sampleWallets: IntelligenceSegmentPreviewWallet[];
}

const normalizeSegmentPreview = (
  payload: unknown
): IntelligenceSegmentPreview => {
  const obj = isJsonObject(payload) ? payload : {};
  const countRaw =
    obj.matchCount ?? obj.count ?? obj.size ?? obj.matchingWallets ?? obj.total;
  const matchCount =
    typeof countRaw === "number" && Number.isFinite(countRaw) ? countRaw : null;
  const listRaw =
    obj.sampleWallets ?? obj.samples ?? obj.wallets ?? obj.preview ?? obj.items;
  const sampleWallets: IntelligenceSegmentPreviewWallet[] = Array.isArray(
    listRaw
  )
    ? listRaw
        .map((entry): IntelligenceSegmentPreviewWallet | null => {
          if (typeof entry === "string") return { address: entry };
          if (!isJsonObject(entry)) return null;
          const address = [
            entry.address,
            entry.wallet,
            entry.walletAddress,
            entry.id,
          ].find((v) => typeof v === "string" && v.length > 0);
          if (typeof address !== "string") return null;
          const ens = [entry.ens, entry.name, entry.label].find(
            (v) => typeof v === "string" && v.length > 0
          );
          return { address, ens: typeof ens === "string" ? ens : null };
        })
        .filter((w): w is IntelligenceSegmentPreviewWallet => w !== null)
        .slice(0, 5)
    : [];
  return { matchCount, sampleWallets };
};

export const intelligenceService = {
  /**
   * Live estimate for a draft segment. Guarded: the backend endpoint may not
   * exist yet, in which case the caller treats a rejection as "no live count".
   */
  async previewSegment(
    body: {
      match: "AND" | "OR";
      conditions: { field: string; operator: string; value: number }[];
    },
    orgId?: string,
    options?: { signal?: AbortSignal }
  ): Promise<IntelligenceSegmentPreview> {
    const payload = await request<unknown>(
      {
        method: "POST",
        url: "/intelligence/segments/preview",
        data: body,
        signal: options?.signal,
      },
      orgId
    );
    return normalizeSegmentPreview(payload);
  },

  /**
   * Natural-language -> structured segment rules. `POST /intelligence/segments/
   * generate-rules` (EDITOR+). Returns the same `{ match, conditions }` shape the
   * builder uses; the backend fails soft to an empty rule set (never 500), so an
   * empty `conditions` array is a valid "couldn't parse - build by hand" result.
   */
  async generateSegmentRules(
    prompt: string,
    orgId?: string
  ): Promise<{
    match: "AND" | "OR";
    conditions: { field: string; operator: string; value: string }[];
  }> {
    const payload = await request<unknown>(
      {
        method: "POST",
        url: "/intelligence/segments/generate-rules",
        data: { prompt },
      },
      orgId
    );
    const root = isJsonObject(payload) ? payload : {};
    const match = root.match === "OR" ? "OR" : "AND";
    const rawConditions = Array.isArray(root.conditions) ? root.conditions : [];
    const conditions = rawConditions
      .map((c) => {
        if (!isJsonObject(c)) return null;
        const field = typeof c.field === "string" ? c.field : "";
        const operator = typeof c.operator === "string" ? c.operator : "";
        if (!field || !operator) return null;
        const value =
          typeof c.value === "string"
            ? c.value
            : typeof c.value === "number"
              ? String(c.value)
              : "";
        return { field, operator, value };
      })
      .filter(
        (c): c is { field: string; operator: string; value: string } =>
          c !== null
      );
    return { match, conditions };
  },

  runQuery(body: { query: string }, orgId?: string) {
    return request<IntelligenceQueryRunResponse>(
      { method: "POST", url: "/intelligence/query/run", data: body },
      orgId
    );
  },

  getQueryStarters(orgId?: string) {
    return request<IntelligenceQueryStartersResponse>(
      { method: "GET", url: "/intelligence/query/starters" },
      orgId
    );
  },

  getQuerySuggestions(
    body: IntelligenceQuerySuggestionRequest,
    orgId?: string
  ) {
    return request<IntelligenceQuerySuggestionsResponse>(
      { method: "POST", url: "/intelligence/query/suggestions", data: body },
      orgId
    );
  },

  listQueryProtocols(
    params?: { search?: string; sector?: string; chain?: string },
    orgId?: string
  ) {
    return request<IntelligenceProtocolRegistryListResponse>(
      { method: "GET", url: "/intelligence/query/protocols", params },
      orgId
    );
  },

  upsertQueryProtocol(
    body: {
      name: string;
      sector: string;
      chain?: string;
      contractAddresses?: string[];
      aliases?: string[];
      metadata?: Record<string, unknown>;
    },
    orgId?: string
  ) {
    return request<IntelligenceProtocolRegistryEntry>(
      { method: "POST", url: "/intelligence/query/protocols", data: body },
      orgId
    );
  },

  trackQuerySuggestion(
    logId: string,
    body: IntelligenceQuerySuggestionTrackRequest,
    orgId?: string
  ) {
    return request<IntelligenceQuerySuggestionTrackResponse>(
      {
        method: "POST",
        url: `/intelligence/query/suggestions/${logId}/track`,
        data: body,
      },
      orgId
    );
  },

  getQuerySuggestionsAnalytics(orgId?: string) {
    return request<IntelligenceQuerySuggestionsAnalyticsResponse>(
      { method: "GET", url: "/intelligence/query/suggestions/analytics" },
      orgId
    );
  },

  generateSql(
    body: { prompt: string; mode?: "fast" | "best" },
    orgId?: string
  ) {
    return request<IntelligenceGenerateSqlResponse>(
      { method: "POST", url: "/intelligence/query/generate-sql", data: body },
      orgId
    );
  },

  runGoldrushQuery(body: IntelligenceGoldrushRunBody, orgId?: string) {
    return request<IntelligenceQueryRunResponse>(
      {
        method: "POST",
        url: "/intelligence/query/goldrush/run",
        data: body,
      },
      orgId
    );
  },

  queryGoldrushMcp(
    body: IntelligenceGoldrushMcpQueryBody,
    orgId?: string,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ) {
    return request<IntelligenceGoldrushMcpQueryResponse>(
      {
        method: "POST",
        url: "/intelligence/query/goldrush/mcp/query",
        data: body,
        signal: options?.signal,
        // Hard ceiling so the agent can't spin forever with no response.
        timeout: options?.timeoutMs ?? 120_000,
      },
      orgId
    );
  },

  getGoldrushMcpCatalog(orgId?: string) {
    return request<IntelligenceGoldrushMcpCatalogResponse>(
      {
        method: "GET",
        url: "/intelligence/query/goldrush/mcp/catalog",
      },
      orgId
    );
  },

  getGoldrushMcpTools(orgId?: string) {
    return request<IntelligenceGoldrushMcpToolsResponse>(
      {
        method: "GET",
        url: "/intelligence/query/goldrush/mcp/tools",
      },
      orgId
    );
  },

  getGoldrushMcpResources(orgId?: string) {
    return request<IntelligenceGoldrushMcpResourcesResponse>(
      {
        method: "GET",
        url: "/intelligence/query/goldrush/mcp/resources",
      },
      orgId
    );
  },

  readGoldrushMcpResource(
    body: IntelligenceGoldrushMcpReadResourceBody,
    orgId?: string
  ) {
    return request<IntelligenceGoldrushMcpReadResourceResponse>(
      {
        method: "POST",
        url: "/intelligence/query/goldrush/mcp/resources/read",
        data: body,
      },
      orgId
    );
  },

  runGoldrushMcpTool(body: IntelligenceGoldrushMcpRunBody, orgId?: string) {
    return request<IntelligenceGoldrushMcpRunResponse>(
      {
        method: "POST",
        url: "/intelligence/query/goldrush/mcp/run",
        data: body,
      },
      orgId
    );
  },

  planGoldrushMcp(
    body: IntelligenceGoldrushMcpQueryBody,
    orgId?: string,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ) {
    return request<IntelligenceGoldrushMcpPlanResponse>(
      {
        method: "POST",
        url: "/intelligence/query/goldrush/mcp/plan",
        data: body,
        signal: options?.signal,
        timeout: options?.timeoutMs ?? 60_000,
      },
      orgId
    );
  },

  selectGoldrushMcpStreamTransport(
    body: IntelligenceGoldrushMcpQueryBody
  ): IntelligenceGoldrushMcpStreamTransport {
    const promptLength = body.prompt?.trim().length ?? 0;
    const sqlLength = body.sql?.trim().length ?? 0;
    const chainsCount = body.chains?.length ?? 0;
    const contractAddressesCount = body.contractAddresses?.length ?? 0;
    const walletAddressesCount = body.walletAddresses?.length ?? 0;
    const contractsCount = body.contracts?.length ?? 0;

    if (contractsCount > 0) return "post";
    if (promptLength > 400 || sqlLength > 600) return "post";
    if (chainsCount > 4) return "post";
    if (contractAddressesCount > 4 || walletAddressesCount > 4) return "post";

    const queryLength =
      buildGoldrushMcpStreamSearchParams(body).toString().length;
    return queryLength > 1400 ? "post" : "get";
  },

  buildGoldrushMcpStreamUrl(
    body: IntelligenceGoldrushMcpQueryBody,
    orgId?: string
  ) {
    const params = buildGoldrushMcpStreamSearchParams(body);
    if (typeof orgId === "string" && orgId.trim().length > 0) {
      params.set("orgId", orgId.trim());
    }
    const queryString = params.toString();
    return queryString.length > 0
      ? `/api/v1/intelligence/query/goldrush/mcp/query/stream?${queryString}`
      : "/api/v1/intelligence/query/goldrush/mcp/query/stream";
  },

  async streamGoldrushMcpQueryViaFetch(
    body: IntelligenceGoldrushMcpQueryBody,
    options?: {
      orgId?: string;
      signal?: AbortSignal;
      onEvent?: (event: IntelligenceGoldrushMcpStreamEvent) => void;
      transport?: IntelligenceGoldrushMcpStreamTransport;
    }
  ) {
    const orgId = pickOrgId(options?.orgId) ?? undefined;
    const transport =
      options?.transport ?? this.selectGoldrushMcpStreamTransport(body);
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
    };
    if (orgId) headers["x-org-id"] = orgId;
    if (transport === "post") {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(
      this.buildGoldrushMcpStreamUrl(
        transport === "get" ? body : {},
        transport === "get" ? orgId : undefined
      ),
      {
        method: transport === "get" ? "GET" : "POST",
        credentials: "include",
        headers,
        signal: options?.signal,
        body: transport === "post" ? JSON.stringify(body) : undefined,
      }
    );

    if (!response.ok || !response.body) {
      const fallback = `Intelligence stream failed (${response.status})`;
      const text = await response.text().catch(() => "");
      const message = text.trim().length > 0 ? text.trim() : fallback;
      throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const emitEvent = (chunk: string) => {
      const lines = chunk.split("\n");
      let eventType: string | undefined;
      const dataLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith(":")) continue;
        if (trimmed.startsWith("event:")) {
          eventType = trimmed.slice("event:".length).trim() || undefined;
          continue;
        }
        if (trimmed.startsWith("data:")) {
          dataLines.push(trimmed.slice("data:".length).trim());
        }
      }

      if (dataLines.length === 0) return;
      options?.onEvent?.(toStreamEvent(eventType, dataLines.join("\n")));
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      events.forEach(emitEvent);
    }

    const finalChunk = buffer.trim();
    if (finalChunk.length > 0) emitEvent(finalChunk);
  },

  async streamGoldrushMcpQueryViaEventSource(
    body: IntelligenceGoldrushMcpQueryBody,
    options?: {
      orgId?: string;
      signal?: AbortSignal;
      onEvent?: (event: IntelligenceGoldrushMcpStreamEvent) => void;
    }
  ) {
    const EventSourceCtor = globalThis.EventSource;
    if (!EventSourceCtor) {
      return this.streamGoldrushMcpQueryViaFetch(body, {
        ...options,
        transport: "get",
      });
    }

    const orgId = pickOrgId(options?.orgId) ?? undefined;
    const url = this.buildGoldrushMcpStreamUrl(body, orgId);

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const eventSource = new EventSourceCtor(url, { withCredentials: true });
      const listeners = new Map<
        string,
        (event: MessageEvent<string>) => void
      >();

      const cleanup = () => {
        if (options?.signal) {
          options.signal.removeEventListener("abort", handleAbort);
        }
        for (const [type, handler] of listeners.entries()) {
          eventSource.removeEventListener(type, handler as EventListener);
        }
        eventSource.onerror = null;
        eventSource.close();
      };

      const settle = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };

      const handleAbort = () => {
        settle(() => reject(createAbortError()));
      };

      if (options?.signal) {
        if (options.signal.aborted) {
          handleAbort();
          return;
        }
        options.signal.addEventListener("abort", handleAbort, { once: true });
      }

      MCP_STREAM_EVENT_TYPES.forEach((type) => {
        const handler = (event: MessageEvent<string>) => {
          const nextEvent = toStreamEvent(type, event.data);
          options?.onEvent?.(nextEvent);
          if (nextEvent.type === "final") {
            settle(resolve);
          }
          if (nextEvent.type === "error") {
            settle(() => reject(new Error("Intelligence stream failed")));
          }
        };
        listeners.set(type, handler);
        eventSource.addEventListener(type, handler as EventListener);
      });

      const messageHandler = (event: MessageEvent<string>) => {
        options?.onEvent?.(toStreamEvent(undefined, event.data));
      };
      listeners.set("message", messageHandler);
      eventSource.addEventListener("message", messageHandler as EventListener);

      eventSource.onerror = () => {
        settle(() => reject(new Error("Intelligence stream failed")));
      };
    });
  },

  async streamGoldrushMcpQuery(
    body: IntelligenceGoldrushMcpQueryBody,
    options?: {
      orgId?: string;
      signal?: AbortSignal;
      onEvent?: (event: IntelligenceGoldrushMcpStreamEvent) => void;
      transport?: "auto" | IntelligenceGoldrushMcpStreamTransport;
      preferNativeEventSource?: boolean;
    }
  ) {
    const transport =
      options?.transport && options.transport !== "auto"
        ? options.transport
        : this.selectGoldrushMcpStreamTransport(body);

    if (transport === "get" && options?.preferNativeEventSource) {
      return this.streamGoldrushMcpQueryViaEventSource(body, options);
    }

    return this.streamGoldrushMcpQueryViaFetch(body, {
      ...options,
      transport,
    });
  },

  validateQuery(body: { query: string }, orgId?: string) {
    return request<IntelligenceQueryValidateResponse>(
      { method: "POST", url: "/intelligence/query/validate", data: body },
      orgId
    );
  },

  getQueryHistory(orgId?: string) {
    return request<
      | { items?: IntelligenceQueryHistoryItem[] }
      | IntelligenceQueryHistoryItem[]
    >({ method: "GET", url: "/intelligence/query/history" }, orgId);
  },

  getQueryStatus(queryId: string, orgId?: string) {
    return request<IntelligenceQueryStatusResponse>(
      { method: "GET", url: `/intelligence/query/${queryId}/status` },
      orgId
    );
  },

  getQueryResults(
    queryId: string,
    params?: { page?: number; limit?: number },
    orgId?: string
  ) {
    return request<IntelligenceQueryResultsResponse>(
      {
        method: "GET",
        url: `/intelligence/query/${queryId}/results`,
        params,
      },
      orgId
    );
  },

  getQuerySummary(queryId: string, orgId?: string) {
    return request<IntelligenceQuerySummaryResponse>(
      { method: "GET", url: `/intelligence/query/${queryId}/summary` },
      orgId
    );
  },

  /**
   * Chart-ready report payload for a stored query (typed columns, suggested
   * line/bar/pie charts, per-numeric-column stats, bounded table).
   */
  getQueryReportData(queryId: string, orgId?: string) {
    return request<IntelligenceQueryReportDataResponse>(
      { method: "GET", url: `/intelligence/query/${queryId}/report-data` },
      orgId
    );
  },

  /**
   * Downloads the stored query results as CSV. Fetched as a blob (rather than
   * a plain link) so the `x-org-id` header rides along with the session
   * cookie. Returns the blob plus the filename from `Content-Disposition`.
   */
  async downloadQueryCsv(
    queryId: string,
    orgId?: string
  ): Promise<{ blob: Blob; filename: string }> {
    const resolvedOrgId = pickOrgId(orgId);
    const res = await apiClient.request<Blob>({
      method: "GET",
      url: `/intelligence/query/${queryId}/export.csv`,
      responseType: "blob",
      headers: {
        ...(resolvedOrgId ? { "x-org-id": resolvedOrgId } : {}),
        "x-onchain-silent-error": "1",
      },
    });
    const disposition = String(res.headers?.["content-disposition"] ?? "");
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    return {
      blob: res.data,
      filename: match?.[1] ?? `onchainsuite-report-${queryId}.csv`,
    };
  },

  listQueryCache(
    params?: {
      chain?: string;
      resourceType?: string;
      subjectAddress?: string;
      page?: number;
      limit?: number;
    },
    orgId?: string
  ) {
    return request<IntelligenceQueryCacheListResponse>(
      { method: "GET", url: "/intelligence/query/cache", params },
      orgId
    );
  },

  getQueryCacheEntry(cacheId: string, orgId?: string) {
    return request<IntelligenceQueryCacheDetailResponse>(
      { method: "GET", url: `/intelligence/query/cache/${cacheId}` },
      orgId
    );
  },

  deleteQueryCacheEntry(cacheId: string, orgId?: string) {
    return request<{ deleted?: boolean; cacheId?: string }>(
      { method: "DELETE", url: `/intelligence/query/cache/${cacheId}` },
      orgId
    );
  },

  enqueueWalletEnrichment(
    body: { walletAddress: string; chain: string; forceRefresh?: boolean },
    orgId?: string
  ) {
    return request<IntelligenceWalletEnrichmentEnqueueResponse>(
      {
        method: "POST",
        url: "/intelligence/query/enrichment/wallets/enqueue",
        data: body,
      },
      orgId
    );
  },

  enqueueContactsEnrichment(
    body: { chain: string; limit?: number; forceRefresh?: boolean },
    orgId?: string
  ) {
    return request<IntelligenceContactsEnrichmentEnqueueResponse>(
      {
        method: "POST",
        url: "/intelligence/query/enrichment/contacts/enqueue",
        data: body,
      },
      orgId
    );
  },

  getWalletEnrichmentMetrics(walletAddress: string, orgId?: string) {
    return request<IntelligenceWalletEnrichmentMetricsResponse>(
      {
        method: "GET",
        url: `/intelligence/query/enrichment/wallets/${walletAddress}`,
      },
      orgId
    );
  },

  // GoldRush credit meter (MCP + enrichment consume credits; SQL does not).
  getCredits(orgId?: string) {
    return request<IntelligenceCreditMeter>(
      { method: "GET", url: "/intelligence/query/credits" },
      orgId
    );
  },

  getEnrichmentStatus(orgId?: string) {
    return request<IntelligenceEnrichmentStatus>(
      { method: "GET", url: "/intelligence/query/enrichment/status" },
      orgId
    );
  },

  // Seed Intelligence tables from saved project-settings contracts (or the
  // provided ones). Discovers holders + enqueues per-wallet enrichment.
  enrichProtocol(
    body?: {
      contracts?: Array<{ chain?: string; address: string }>;
      includeContacts?: boolean;
      limitPerContract?: number;
      forceRefresh?: boolean;
    },
    orgId?: string
  ) {
    return request<IntelligenceEnrichProtocolResponse>(
      {
        method: "POST",
        url: "/intelligence/query/enrichment/protocol",
        data: body ?? {},
      },
      orgId
    );
  },

  // Enrich one wallet and briefly wait for the row to land (button flow).
  enrichWalletAndWait(
    body: {
      walletAddress: string;
      chain: string;
      forceRefresh?: boolean;
      timeoutMs?: number;
      pollMs?: number;
    },
    orgId?: string
  ) {
    return request<{
      ready: boolean;
      jobId?: string;
      walletAddress: string;
      chain: string;
      metric?: Record<string, unknown> | null;
    }>(
      {
        method: "POST",
        url: "/intelligence/query/enrichment/wallets/enqueue-and-wait",
        data: body,
      },
      orgId
    );
  },

  saveQuery(queryId: string, body: { name: string }, orgId?: string) {
    return request<IntelligenceQuerySaveResponse>(
      {
        method: "POST",
        url: `/intelligence/query/${queryId}/save`,
        data: body,
      },
      orgId
    );
  },

  createSegmentFromQuery(
    body: { queryId: string; name: string; tags?: string[] },
    orgId?: string
  ) {
    return request<IntelligenceSegmentFromQueryResponse>(
      {
        method: "POST",
        url: "/intelligence/query/segments/from-query",
        data: body,
      },
      orgId
    );
  },

  createCampaignFromQuery(
    body: { queryId: string; subject?: string; templateId?: unknown },
    orgId?: string
  ) {
    return request<IntelligenceCampaignFromQueryResponse>(
      {
        method: "POST",
        url: "/intelligence/query/campaign/from-query",
        data: body,
      },
      orgId
    );
  },

  getSchema(orgId?: string) {
    return request<IntelligenceSchemaResponse>(
      { method: "GET", url: "/intelligence/schema" },
      orgId
    );
  },

  getMetrics(orgId?: string) {
    return request<IntelligenceMetricsResponse>(
      { method: "GET", url: "/intelligence/metrics" },
      orgId
    );
  },

  listSegments(
    params?: { search?: string; page?: number; limit?: number; sort?: string },
    orgId?: string
  ) {
    return request<
      | IntelligenceSegmentsListResponse
      | { items?: IntelligenceSegment[] }
      | IntelligenceSegment[]
    >({ method: "GET", url: "/intelligence/segments", params }, orgId);
  },

  getSegmentsMetrics(orgId?: string) {
    return request<IntelligenceSegmentsMetricsResponse>(
      { method: "GET", url: "/intelligence/segments/metrics" },
      orgId
    );
  },

  getSegment(segmentId: string, orgId?: string) {
    return request<IntelligenceSegment>(
      { method: "GET", url: `/intelligence/segments/${segmentId}` },
      orgId
    );
  },

  createSegment(
    body: { name: string; rules?: unknown; tags?: string[] },
    orgId?: string
  ) {
    return request<{ segmentId: string; size?: number }>(
      { method: "POST", url: "/intelligence/segments", data: body },
      orgId
    );
  },

  importSegmentFromQuery(
    body: { queryId: string; name: string },
    orgId?: string
  ) {
    return request<{
      segmentId: string;
      size?: number;
      emailMatch?: number;
      revenue?: number;
    }>(
      {
        method: "POST",
        url: "/intelligence/segments/import-from-query",
        data: body,
      },
      orgId
    );
  },

  updateSegment(
    segmentId: string,
    body: { name?: string; rules?: unknown; tags?: string[] },
    orgId?: string
  ) {
    return request<{ success?: boolean }>(
      {
        method: "PUT",
        url: `/intelligence/segments/${segmentId}`,
        data: body,
      },
      orgId
    );
  },

  deleteSegment(segmentId: string, orgId?: string) {
    return request<{ success?: boolean }>(
      { method: "DELETE", url: `/intelligence/segments/${segmentId}` },
      orgId
    );
  },

  refreshSegment(segmentId: string, orgId?: string) {
    return request<{ success?: boolean }>(
      { method: "POST", url: `/intelligence/segments/${segmentId}/refresh` },
      orgId
    );
  },

  getSegmentProfiles(
    segmentId: string,
    params?: { page?: number; limit?: number },
    orgId?: string
  ) {
    return request<IntelligenceSegmentProfilesResponse>(
      {
        method: "GET",
        url: `/intelligence/segments/${segmentId}/profiles`,
        params,
      },
      orgId
    );
  },

  markSegmentUsed(segmentId: string, orgId?: string) {
    return request<{ success?: boolean }>(
      { method: "POST", url: `/intelligence/segments/${segmentId}/use` },
      orgId
    );
  },

  listReports(
    params?: { search?: string; page?: number; limit?: number },
    orgId?: string
  ) {
    return request<
      IntelligenceReportsListResponse | { items?: unknown[] } | unknown[]
    >({ method: "GET", url: "/intelligence/reports", params }, orgId);
  },

  getReport(reportId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: `/intelligence/reports/${reportId}` },
      orgId
    );
  },

  getReportsMetrics(orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: "/intelligence/reports/metrics" },
      orgId
    );
  },

  getReportsSummary(orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: "/intelligence/reports/summary" },
      orgId
    );
  },

  getReportsFilters(orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "GET", url: "/intelligence/reports/filters" },
      orgId
    );
  },

  refreshReport(reportId: string, orgId?: string) {
    return request<Record<string, unknown>>(
      { method: "POST", url: `/intelligence/reports/${reportId}/refresh` },
      orgId
    );
  },
};
