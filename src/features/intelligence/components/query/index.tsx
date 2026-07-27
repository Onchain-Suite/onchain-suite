"use client";

import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  CodeBracketIcon,
  PlayIcon,
  SparklesIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ChainLogo } from "@/components/common/chain-logo";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

import { isJsonObject } from "@/lib/utils";

import {
  type IntelligenceGoldrushMcpQueryResponse,
  type IntelligenceGoldrushMcpStep,
  type IntelligenceGoldrushMcpStreamEvent,
  type IntelligenceGoldrushMcpStructuredResult,
  type IntelligenceGoldrushMcpStructuredResultKind,
  intelligenceService,
} from "../../intelligence.service";
import { McpTypingIndicator } from "./mcp-typing-indicator";
import { SqlBlockchainLoader } from "./sql-blockchain-loader";
import { SqlResultsTable } from "./sql-results-table";
import {
  dropFormattedSiblingColumns,
  preferFormattedCell,
} from "@/features/intelligence/utils";

const DEFAULT_SQL_QUERY = "";

/**
 * Ceiling for SQL status polling. Every async op must be bounded — if the
 * backend never reports `completed`/`failed` within this window we stop
 * polling and render an explicit timeout state in the results area instead of
 * spinning forever.
 */
const SQL_STATUS_POLL_TIMEOUT_MS = 90_000;
const SQL_STATUS_POLL_INTERVAL_MS = 1_000;

/**
 * Normalize the editor SQL into what the backend accepts:
 *  - strip leading comments/whitespace so it begins with `select`/`with`
 *    (a leading comment trips "Only SELECT queries are allowed"), and
 *  - drop statement-ending semicolons (the backend runs a single read-only
 *    statement and rejects any semicolons).
 * The editor keeps the user's text as-is; this only affects what we send.
 */
const toExecutableSql = (sql: string): string => {
  let s = sql;
  // Peel leading whitespace / line comments / block comments until the next
  // token is real SQL (bounded loop guards against pathological input).
  for (let i = 0; i < 1000; i += 1) {
    const before = s;
    s = s.replace(/^\s+/, "");
    if (s.startsWith("--")) {
      const nl = s.indexOf("\n");
      s = nl === -1 ? "" : s.slice(nl + 1);
    } else if (s.startsWith("/*")) {
      const end = s.indexOf("*/");
      s = end === -1 ? "" : s.slice(end + 2);
    }
    if (s === before) break;
  }
  // Remove semicolons at the end of a line or the query (keeps any inside
  // string literals on a line with more content untouched).
  s = s.replace(/;[ \t]*(?=\r?\n|$)/g, "");
  return s.trim();
};

const asRecord = (row: unknown): Record<string, unknown> =>
  isJsonObject(row) ? (row as Record<string, unknown>) : { value: row };

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[$,%\s,]/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

// ISO 8601 date-times (e.g. 2026-07-12T05:55:31.554Z) as returned by the API.
const ISO_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

const asDisplayText = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && ISO_TIMESTAMP_RE.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
  }
  return String(value);
};

const prettifyColumnLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const columnsFromRows = (rows: Array<Record<string, unknown>>) => {
  const keys = new Set<string>();
  for (const r of rows) {
    Object.keys(r).forEach((k) => keys.add(k));
  }
  return dropFormattedSiblingColumns(Array.from(keys));
};

const pickUnknownArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (isJsonObject(value) && Array.isArray(value.items)) return value.items;
  if (isJsonObject(value) && Array.isArray(value.data)) return value.data;
  return [];
};

const pickFirstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const hashString = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

const asKeyText = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : undefined;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return undefined;
};

const createStructuredRowKey = (
  row: StructuredResultRow,
  preferredColumns: Array<string | null | undefined>,
  scope: string
) => {
  const preferred = preferredColumns
    .filter((column): column is string => typeof column === "string")
    .map((column) => column.trim())
    .filter((column) => column.length > 0);
  const preferredValue = preferred
    .map((column) => asKeyText(row[column]))
    .find(Boolean);
  const idValue = pickFirstText(
    row.id,
    row.uuid,
    row.request_id,
    row.requestId,
    row.tx_hash,
    row.transaction_hash,
    row.hash,
    row.address,
    row.wallet_address,
    row.wallet,
    row.owner,
    row.from_address,
    row.to_address,
    row.contract_address,
    row.symbol,
    row.name
  );
  const seed = [scope, idValue, preferredValue].filter(Boolean).join("|");
  const fallbackSeed =
    seed.length > 0
      ? seed
      : [scope, JSON.stringify(row)].filter(Boolean).join("|");
  return `${scope}-${hashString(fallbackSeed)}`;
};

const createStableLineKeys = (lines: string[], scope: string) => {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const count = seen.get(line) ?? 0;
    seen.set(line, count + 1);
    return {
      key: `${scope}-${hashString(line)}-${count}`,
      line,
    };
  });
};

const collectObjectCandidates = (
  payload: unknown
): Array<Record<string, unknown>> => {
  if (!isJsonObject(payload)) return [];
  const queue: Array<Record<string, unknown>> = [
    payload as Record<string, unknown>,
  ];
  const seen = new Set<Record<string, unknown>>();
  const candidates: Array<Record<string, unknown>> = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    candidates.push(current);
    [
      "data",
      "parsedText",
      "textContent",
      "raw",
      "result",
      "response",
      "final",
      "payload",
    ].forEach((key) => {
      const nested = current[key];
      if (isJsonObject(nested)) {
        queue.push(nested as Record<string, unknown>);
      }
    });
  }

  return candidates;
};

const toStreamActivityEntry = (event: IntelligenceGoldrushMcpStreamEvent) => {
  const eventType = event.type ?? "update";
  const candidates = collectObjectCandidates(event.data);
  const [first] = candidates;
  const toolName = candidates
    .map((candidate) =>
      pickFirstText(candidate.toolName, candidate.name, candidate.title)
    )
    .find(Boolean);
  const detail = candidates
    .map((candidate) =>
      pickFirstText(
        candidate.message,
        candidate.description,
        candidate.summary,
        candidate.rationale,
        candidate.question,
        candidate.answer
      )
    )
    .find(Boolean);

  switch (eventType) {
    case "started":
      return {
        label: "Thought process",
        detail:
          detail ??
          "Working through the request and connecting to the MCP agent.",
        tone: "default" as const,
      };
    case "planner_ready":
      return {
        label: "Execution plan ready",
        detail:
          detail ??
          "Pressure-testing the best route before running any live MCP calls.",
        tone: "default" as const,
      };
    case "resource_context":
      return {
        label: "Context loaded",
        detail:
          detail ??
          `${pickUnknownArray(first?.resources).length || "Relevant"} MCP resources were loaded.`,
        tone: "default" as const,
      };
    case "tools_discovered":
      return {
        label: "Tool path selected",
        detail:
          detail ??
          `${pickUnknownArray(first?.tools).length || "Relevant"} MCP tools are in play for this request.`,
        tone: "default" as const,
      };
    case "step_started":
      return {
        label: "Next step",
        detail:
          detail ??
          toolName ??
          "Preparing the next reasoning step for the request.",
        tone: "default" as const,
      };
    case "decision":
      return {
        label: "Decision made",
        detail: detail ?? toolName ?? "The agent selected the next action.",
        tone: "default" as const,
      };
    case "validation_issue":
      return {
        label: "Input adjusted",
        detail:
          detail ?? "The request arguments needed a small normalization step.",
        tone: "warning" as const,
      };
    case "tool_call_started":
      return {
        label: "Tool running",
        detail:
          toolName ??
          detail ??
          "Executing a live MCP tool against the provider.",
        tone: "default" as const,
      };
    case "tool_call_result":
      return {
        label: "Tool returned",
        detail:
          toolName ??
          detail ??
          "Received provider output and folded it into the answer.",
        tone: "success" as const,
      };
    case "clarification":
      return {
        label: "Clarification needed",
        detail: detail ?? "The agent needs one more detail",
        tone: "warning" as const,
      };
    case "summarizing":
      return {
        label: "Composing answer",
        detail:
          detail ?? "Turning the MCP output into a product-ready response.",
        tone: "default" as const,
      };
    case "final":
      return {
        label: "Answer ready",
        detail: detail ?? "The MCP agent finished successfully.",
        tone: "success" as const,
      };
    case "error":
      return {
        label: "Error",
        detail:
          detail ?? "The MCP stream failed and could not finish this request.",
        tone: "error" as const,
      };
    default:
      return {
        label: prettifyColumnLabel(eventType),
        detail: detail ?? toolName ?? "The agent returned another update.",
        tone: "default" as const,
      };
  }
};

const extractConversationId = (payload: unknown) =>
  collectObjectCandidates(payload)
    .map((candidate) => pickFirstText(candidate.conversationId))
    .find(Boolean);

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

const toStreamStep = (
  event: IntelligenceGoldrushMcpStreamEvent
): IntelligenceGoldrushMcpStep | null => {
  const eventType = event.type ?? "";
  if (
    eventType !== "tool_call_started" &&
    eventType !== "tool_call_result" &&
    eventType !== "decision"
  ) {
    return null;
  }

  const candidates = collectObjectCandidates(event.data);
  const toolName = candidates
    .map((candidate) =>
      pickFirstText(candidate.toolName, candidate.name, candidate.title)
    )
    .find(Boolean);
  const description = candidates
    .map((candidate) =>
      pickFirstText(
        candidate.description,
        candidate.summary,
        candidate.message,
        candidate.rationale
      )
    )
    .find(Boolean);

  if (!toolName && !description) return null;

  return {
    toolName,
    title: toolName,
    description,
  };
};

const toStreamFinalResponse = (
  event: IntelligenceGoldrushMcpStreamEvent,
  collectedSteps: IntelligenceGoldrushMcpStep[]
): IntelligenceGoldrushMcpQueryResponse | null => {
  const candidates = collectObjectCandidates(event.data);
  const responseCandidate =
    candidates.find(
      (candidate) =>
        "answer" in candidate ||
        "question" in candidate ||
        "status" in candidate ||
        "mode" in candidate
    ) ?? null;

  if (!responseCandidate) return null;

  const response = {
    ...responseCandidate,
  } as IntelligenceGoldrushMcpQueryResponse;

  if (
    (!Array.isArray(response.steps) || response.steps.length === 0) &&
    collectedSteps.length > 0
  ) {
    response.steps = collectedSteps;
  }

  return response;
};

interface MpcFailureReport {
  message: string;
  /** Actionable explanation for known failure modes (config, quota, …). */
  guidance?: string;
  statusCode?: number;
  requestId?: string;
  conversationId?: string;
  prompt?: string;
  at: string;
}

/**
 * Translate known backend failure messages into guidance the user can act
 * on — a bare "503 … not configured" tells them nothing.
 */
const MCP_FAILURE_GUIDANCE: Array<{ match: RegExp; guidance: string }> = [
  {
    match: /mcp routing is not configured/i,
    guidance:
      "The on-chain data agent (GoldRush MCP) isn't enabled on this backend environment — an operator needs to configure the GoldRush API key and MCP routing on the server. Until then, Chat and SQL modes still answer questions over your own audience and campaign data.",
  },
  {
    match: /unknown variant `?developer`?/i,
    guidance:
      'The backend\'s AI agent sent a message role ("developer") that its configured LLM provider doesn\'t accept. This is a backend configuration bug — the agent needs to use the "system" role (or an LLM endpoint that supports "developer") for this environment\'s model. Nothing on your side; flag it to the backend team.',
  },
  {
    match: /plan_limit_exceeded|credit/i,
    guidance:
      "Your organization has used its GoldRush/AI credit allowance and the usage wallet can't cover the overage. Top up the wallet or upgrade in Settings → Billing.",
  },
  {
    match: /rate limit|too many requests/i,
    guidance:
      "You're sending requests faster than the API allows. Wait a few seconds and try again.",
  },
];

const guidanceForMcpFailure = (
  message: string,
  statusCode?: number
): string | undefined => {
  const matched = MCP_FAILURE_GUIDANCE.find((entry) =>
    entry.match.test(message)
  );
  if (matched) return matched.guidance;
  if (statusCode === 503) {
    return "The on-chain agent is temporarily unavailable. Try again shortly — if this persists, the backend service may need attention.";
  }
  return undefined;
};

const toMcpFailureReport = (
  error: unknown,
  context: {
    prompt?: string;
    conversationId?: string | null;
  }
): MpcFailureReport => {
  const candidates = [
    ...collectObjectCandidates(error),
    ...(error instanceof Error ? collectObjectCandidates(error.cause) : []),
  ];
  const message =
    (error instanceof Error && error.message.trim().length > 0
      ? error.message
      : undefined) ??
    candidates
      .map((candidate) =>
        pickFirstText(
          candidate.message,
          isJsonObject(candidate.response)
            ? candidate.response.message
            : undefined,
          isJsonObject(candidate.response) &&
            isJsonObject(candidate.response.data)
            ? candidate.response.data.message
            : undefined,
          isJsonObject(candidate.error) ? candidate.error.message : undefined
        )
      )
      .find(Boolean) ??
    "Failed to run MCP chat";
  const statusCode = candidates
    .map((candidate) => {
      const directStatus = candidate.status;
      const nestedResponse = isJsonObject(candidate.response)
        ? candidate.response
        : undefined;
      const nestedStatus = nestedResponse?.status;
      return typeof directStatus === "number"
        ? directStatus
        : typeof nestedStatus === "number"
          ? nestedStatus
          : undefined;
    })
    .find((value): value is number => typeof value === "number");
  const requestId = candidates
    .map((candidate) =>
      pickFirstText(
        candidate.requestId,
        candidate.traceId,
        candidate.correlationId,
        isJsonObject(candidate.error) ? candidate.error.requestId : undefined
      )
    )
    .find(Boolean);
  const conversationId =
    candidates
      .map((candidate) => pickFirstText(candidate.conversationId))
      .find(Boolean) ??
    context.conversationId ??
    undefined;

  return {
    message,
    guidance: guidanceForMcpFailure(message, statusCode),
    statusCode,
    requestId,
    conversationId,
    prompt: context.prompt,
    at: new Date().toISOString(),
  };
};

const formatMcpFailureReport = (report: MpcFailureReport) =>
  [
    report.guidance ?? null,
    report.guidance ? "" : null,
    `Time: ${report.at}`,
    typeof report.statusCode === "number"
      ? `Status: ${report.statusCode}`
      : null,
    report.requestId ? `Request ID: ${report.requestId}` : null,
    report.conversationId ? `Conversation ID: ${report.conversationId}` : null,
    report.prompt ? `Prompt: ${report.prompt}` : null,
    `Message: ${report.message}`,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");

type StructuredResultRow = Record<string, unknown>;

type StreamActivityEntry = {
  id: string;
  label: string;
  detail?: string;
  tone: "default" | "success" | "warning" | "error";
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind?: "answer" | "question" | "error";
  rationale?: string;
  errorReport?: MpcFailureReport;
  confidence?: number;
  queryReady?: boolean;
  toolSteps?: Array<{
    toolName?: string;
    title?: string;
    description?: string;
  }>;
  mode?: string;
  conversationId?: string;
  queryId?: string;
  structuredResult?: IntelligenceGoldrushMcpStructuredResult | null;
}

const MATRIX_GLYPHS =
  "01ABCDEF0123456789<>[]{}$#@&*+-=/\\\\|::;._MCPCHAINQUERY";

const buildMatrixFrame = (rows = 10, columns = 30) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => {
      if (Math.random() < 0.18) return " ";
      return MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
    }).join("")
  );

const getFallbackReasoningActivity = (
  recovering: boolean,
  prompt?: string
): StreamActivityEntry[] => {
  const trimmed = (prompt ?? "").replace(/\s+/g, " ").trim();
  const questionRef =
    trimmed.length > 0
      ? `“${trimmed.length > 72 ? `${trimmed.slice(0, 72)}…` : trimmed}”`
      : "your question";
  return [
    {
      id: "session",
      label: "Reading your question",
      detail: `Working out what ${questionRef} needs from live onchain data.`,
      tone: "default",
    },
    {
      id: "coverage",
      label: "Fetching onchain data",
      detail:
        "Pulling the wallets, tokens, and activity your answer depends on across the covered chains.",
      tone: "default",
    },
    {
      id: "result-path",
      label: recovering ? "Almost there" : "Writing your answer",
      detail: recovering
        ? "The connection recovered — finishing your answer now."
        : "Turning the data into a clear answer.",
      tone: recovering ? "warning" : "success",
    },
  ];
};

const isStructuredResult = (
  value: unknown
): value is IntelligenceGoldrushMcpStructuredResult =>
  isJsonObject(value) &&
  typeof value.kind === "string" &&
  Array.isArray(value.rows);

/**
 * Backend answers occasionally dump the raw tool envelope
 * ("Rendered multichain_transactions result: { ... }") instead of prose —
 * never show those to users.
 */
const isRawToolDump = (text: string) => {
  const trimmed = text.trim();
  return (
    /^rendered\s+\S+\s+result\s*:/i.test(trimmed) || trimmed.startsWith("{")
  );
};

/**
 * API envelope/pagination fields that sometimes leak through as "rows"
 * (e.g. a single row of { updated_at, cursor_after, quote_currency, items }
 * when a lookup returns no items). Rows with only these columns carry no
 * information a user can read.
 */
const ENVELOPE_COLUMNS = new Set([
  "updated_at",
  "cursor_after",
  "cursor_before",
  "quote_currency",
  "items",
  "links",
  "pagination",
  "next_update_at",
]);

const meaningfulStructuredRows = (
  rows: StructuredResultRow[]
): StructuredResultRow[] => {
  const informativeColumns = columnsFromRows(rows).filter(
    (column) => !ENVELOPE_COLUMNS.has(column.toLowerCase())
  );
  return informativeColumns.length === 0 ? [] : rows;
};

/** Plain-language "nothing found" line, phrased for the result kind. */
const emptyResultMessage = (
  kind: IntelligenceGoldrushMcpStructuredResultKind
) => {
  const normalized = String(kind).toLowerCase();
  if (normalized.includes("transaction") || normalized.includes("transfer")) {
    return "No transactions were found for this wallet on the covered chains.";
  }
  if (normalized.includes("holder")) {
    return "No holders were found for this token.";
  }
  if (normalized.includes("balance") || normalized.includes("portfolio")) {
    return "No balances were found for this wallet on the covered chains.";
  }
  if (normalized.includes("nft")) {
    return "No NFTs were found for this wallet.";
  }
  return "Nothing was found for this lookup — there's no matching onchain activity.";
};

const normalizeStructuredRows = (
  rows: IntelligenceGoldrushMcpStructuredResult["rows"]
) => rows.map(asRecord);

const findPreferredColumn = (
  rows: StructuredResultRow[],
  preferred: string[]
): string | null => {
  const columns = columnsFromRows(rows).map((column) => ({
    raw: column,
    normalized: column.toLowerCase(),
  }));

  for (const key of preferred) {
    const exact = columns.find((column) => column.normalized === key);
    if (exact) return exact.raw;
  }

  for (const key of preferred) {
    const partial = columns.find((column) => column.normalized.includes(key));
    if (partial) return partial.raw;
  }

  return null;
};

const truncateMiddle = (value: string, start = 8, end = 6) =>
  value.length <= start + end + 3
    ? value
    : `${value.slice(0, start)}...${value.slice(-end)}`;

const asIdentifierText = (value: unknown) => {
  const text = asDisplayText(value);
  const normalized = text.trim();
  if (/^(0x[a-fA-F0-9]{8,}|[1-9A-HJ-NP-Za-km-z]{24,})$/.test(normalized)) {
    return truncateMiddle(normalized);
  }
  if (normalized.length > 24 && !normalized.includes(" ")) {
    return truncateMiddle(normalized);
  }
  return text;
};

const formatCompactNumber = (value: unknown) => {
  const numericValue = asNumber(value);
  if (numericValue === null) return asDisplayText(value);
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: numericValue >= 100 ? 0 : 2,
  }).format(numericValue);
};

const formatUsdValue = (value: unknown) => {
  const numericValue = asNumber(value);
  if (numericValue === null) return asDisplayText(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: numericValue >= 100 ? 0 : 2,
  }).format(numericValue);
};

const formatPercentValue = (value: unknown) => {
  const numericValue = asNumber(value);
  if (numericValue === null) return asDisplayText(value);
  const normalized =
    numericValue > 0 && numericValue <= 1 ? numericValue * 100 : numericValue;
  return `${normalized.toFixed(normalized >= 10 ? 1 : 2)}%`;
};

const formatTimestamp = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") {
    return asDisplayText(value);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return asDisplayText(value);
  return date.toLocaleString();
};

type SuggestionSector =
  | "general"
  | "defi"
  | "nft"
  | "gaming"
  | "meme"
  | "dao"
  | "payments"
  | "infrastructure";

const DEFAULT_MCP_CHAINS = [
  "eth-mainnet",
  "base-mainnet",
  "arbitrum-mainnet",
  "optimism-mainnet",
  "polygon-mainnet",
  "solana-mainnet",
] as const;

interface QueryTabProps {
  activeSurface: "chat" | "sql";
  openEmailComposer: (recipient: unknown) => void;
  setActiveTab: (tab: string) => void;
  // Seed the editor with a previously saved run (Reports tab "Open" action).
  // Mirrors the history-panel click-through: with a queryId the status poll +
  // results fetch re-open the saved run's data; with a chat prompt the MCP
  // composer is pre-filled for a resend. Read once on mount.
  initialQueryId?: string | null;
  initialSql?: string;
  initialChatPrompt?: string;
}

export function QueryTab({
  activeSurface,
  openEmailComposer,
  setActiveTab,
  initialQueryId,
  initialSql,
  initialChatPrompt,
}: QueryTabProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [sqlQuery, setSqlQuery] = useState(initialSql ?? DEFAULT_SQL_QUERY);
  // Transient "Copied" feedback on the SQL copy button (repo idiom: small
  // state + timeout, cleared on unmount so it never fires after teardown).
  const [sqlCopied, setSqlCopied] = useState(false);
  const sqlCopiedTimeoutRef = useRef<number | null>(null);
  const [queryId, setQueryId] = useState<string | null>(initialQueryId ?? null);
  const [hasRunQuery, setHasRunQuery] = useState(Boolean(initialQueryId));
  // Bounded status polling: once the poll exceeds SQL_STATUS_POLL_TIMEOUT_MS
  // we stop and show an explicit timeout error (with a retry) in the results
  // area — a run must never end with nothing visible.
  const [sqlPollTimedOut, setSqlPollTimedOut] = useState(false);
  const sqlPollStartedAtRef = useRef<number | null>(null);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameDialogKind, setNameDialogKind] = useState<
    "report" | "segment" | "campaign"
  >("report");
  const [nameDialogValue, setNameDialogValue] = useState("");
  // Result of a successful "Create segment" — drives the confirmation dialog
  // (profile/contact counts + links) instead of navigating away immediately.
  const [segmentResult, setSegmentResult] = useState<{
    segmentId: string;
    profileCount?: number;
    contactsCreated?: number;
  } | null>(null);
  const [chatPrompt, setChatPrompt] = useState(initialChatPrompt ?? "");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatThreadEndRef = useRef<HTMLDivElement | null>(null);
  const mcpAbortRef = useRef<AbortController | null>(null);
  const [protocolSearch] = useState("");
  const [selectedProtocolId] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [lastSubmittedChatPrompt, setLastSubmittedChatPrompt] = useState("");
  const [selectedSector] = useState<SuggestionSector>("general");
  const [selectedChains] = useState<string[]>([...DEFAULT_MCP_CHAINS]);
  const [streamActivity, setStreamActivity] = useState<StreamActivityEntry[]>(
    []
  );
  const [streamFallbackUsed, setStreamFallbackUsed] = useState(false);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(
    null
  );
  const handleCopySql = useCallback(() => {
    navigator.clipboard
      .writeText(sqlQuery)
      .then(() => {
        setSqlCopied(true);
        if (sqlCopiedTimeoutRef.current !== null) {
          window.clearTimeout(sqlCopiedTimeoutRef.current);
        }
        sqlCopiedTimeoutRef.current = window.setTimeout(() => {
          setSqlCopied(false);
          sqlCopiedTimeoutRef.current = null;
        }, 2000);
      })
      .catch(() => {
        toast.error("Failed to copy SQL to clipboard");
      });
  }, [sqlQuery]);

  useEffect(
    () => () => {
      if (sqlCopiedTimeoutRef.current !== null) {
        window.clearTimeout(sqlCopiedTimeoutRef.current);
      }
    },
    []
  );

  // What we actually send to validate/run — leading comments stripped so the
  // backend sees a query that starts with SELECT/WITH.
  const executableSql = toExecutableSql(sqlQuery);
  const trimmedAssistantPrompt = assistantPrompt.trim();
  const normalizedProtocolSearch = protocolSearch.trim();
  const [primaryChain] = selectedChains;

  // Warms the schema cache for the SQL editor; result read elsewhere via cache.
  const _schemaQuery = useQuery({
    queryKey: ["intelligence", "schema"],
    queryFn: () => intelligenceService.getSchema(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const historyQuery = useQuery({
    queryKey: ["intelligence", "query", "history"],
    queryFn: async () => {
      const res = await intelligenceService.getQueryHistory();
      const items = Array.isArray(res)
        ? res
        : ((res as { items?: unknown[] }).items ?? []);
      return Array.isArray(items) ? items : [];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const startersQuery = useQuery({
    queryKey: ["intelligence", "query", "starters"],
    queryFn: () => intelligenceService.getQueryStarters(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const protocolsQuery = useQuery({
    queryKey: [
      "intelligence",
      "query",
      "protocols",
      {
        search: normalizedProtocolSearch,
        sector: selectedSector,
        chains: selectedChains,
      },
    ],
    queryFn: () =>
      intelligenceService.listQueryProtocols({
        search:
          normalizedProtocolSearch.length > 0
            ? normalizedProtocolSearch
            : undefined,
        sector: selectedSector === "general" ? undefined : selectedSector,
        chain: selectedChains.length === 1 ? primaryChain : undefined,
      }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const protocols = useMemo(
    () => protocolsQuery.data?.items ?? [],
    [protocolsQuery.data?.items]
  );

  const selectedProtocol = useMemo(
    () => protocols.find((protocol) => protocol.id === selectedProtocolId),
    [protocols, selectedProtocolId]
  );
  const chainCoverageLabel = useMemo(() => {
    if (selectedChains.length === 0) return "Auto / multichain";
    const families = new Set(
      selectedChains.map((chain) =>
        chain.includes("solana") ? "Solana" : "EVM"
      )
    );
    if (families.size === 2) return "EVM + Solana";
    return families.has("Solana") ? "Solana" : "EVM";
  }, [selectedChains]);

  const trackSuggestionInteraction = useCallback(
    async (payload: {
      selected?: boolean;
      executed?: boolean;
      saved?: boolean;
      convertedToSegment?: boolean;
      convertedToCampaign?: boolean;
      metadata?: Record<string, unknown>;
    }) => {
      if (!activeSuggestionId) return;
      try {
        await intelligenceService.trackQuerySuggestion(
          activeSuggestionId,
          payload
        );
      } catch {
        // Analytics should never block the main query flow.
      }
    },
    [activeSuggestionId]
  );
  const buildMcpRequest = useCallback(
    (prompt: string) => ({
      conversationId: activeConversationId ?? undefined,
      message: prompt,
      prompt,
      protocol: selectedProtocol?.name,
      chain: selectedChains.length === 1 ? primaryChain : undefined,
      chains: selectedChains.length > 0 ? selectedChains : undefined,
      contractAddresses:
        Array.isArray(selectedProtocol?.contractAddresses) &&
        selectedProtocol.contractAddresses.length > 0
          ? selectedProtocol.contractAddresses
          : undefined,
      mode: "best" as const,
      useProjectSettings: true,
      useProtocolRegistry: true,
    }),
    [
      activeConversationId,
      primaryChain,
      selectedChains,
      selectedProtocol?.contractAddresses,
      selectedProtocol?.name,
    ]
  );

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (executableSql.length === 0) {
        throw new Error("Write a SQL query first");
      }
      return intelligenceService.validateQuery({ query: executableSql });
    },
    onSuccess: (res) => {
      // Inline check-mark on the button signals success; surface problems
      // (invalid SQL) in the toaster instead of a standalone panel.
      if (!res.valid) {
        const detail = Array.isArray(res.suggestions)
          ? res.suggestions.filter((s) => s.trim().length > 0).join(" ")
          : "";
        toast.error(
          detail.length > 0 ? detail : "Query needs a tweak before it can run."
        );
      }
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to validate query";
      toast.error(message);
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      if (executableSql.length === 0) {
        throw new Error("Write a SQL query first");
      }
      return intelligenceService.runQuery({ query: executableSql });
    },
    onSuccess: (res) => {
      setQueryId(res.queryId);
      setHasRunQuery(true);
      setPage(1);
      setSelectedRows([]);
      trackSuggestionInteraction({
        executed: true,
        metadata: { source: "sql-run" },
      });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to run query";
      toast.error(message);
    },
  });

  const mcpMutation = useMutation<
    IntelligenceGoldrushMcpQueryResponse,
    Error,
    string
  >({
    mutationFn: async (prompt) => {
      const trimmedPrompt = prompt.trim();
      if (trimmedPrompt.length === 0) {
        throw new Error("Write a message first");
      }
      const request = buildMcpRequest(trimmedPrompt);
      setStreamActivity([]);
      setStreamFallbackUsed(false);

      const collectedSteps: IntelligenceGoldrushMcpStep[] = [];
      let streamFinalResponse: IntelligenceGoldrushMcpQueryResponse | undefined;
      let streamFailed = false;
      const streamAbortController = new AbortController();
      // Lets the user stop a long-running agent; also tears down the SSE stream.
      const runAbort = new AbortController();
      mcpAbortRef.current = runAbort;
      runAbort.signal.addEventListener("abort", () =>
        streamAbortController.abort()
      );

      const streamPromise = intelligenceService
        .streamGoldrushMcpQuery(request, {
          signal: streamAbortController.signal,
          onEvent: (event) => {
            const eventConversationId = extractConversationId(event.data);
            if (eventConversationId) {
              setActiveConversationId(eventConversationId);
            }
            const activityEntry = toStreamActivityEntry(event);
            setStreamActivity((prev) =>
              [
                ...prev.filter(
                  (entry) =>
                    !(
                      entry.label === activityEntry.label &&
                      entry.detail === activityEntry.detail &&
                      entry.tone === activityEntry.tone
                    )
                ),
                {
                  id: `${event.type ?? "event"}-${prev.length}-${Date.now()}`,
                  ...activityEntry,
                },
              ].slice(-4)
            );

            const nextStep = toStreamStep(event);
            if (
              nextStep &&
              !collectedSteps.some(
                (step) =>
                  step.toolName === nextStep.toolName &&
                  step.description === nextStep.description
              )
            ) {
              collectedSteps.push(nextStep);
            }

            const maybeResponse = toStreamFinalResponse(event, collectedSteps);
            if (maybeResponse) {
              streamFinalResponse = maybeResponse;
            }
          },
        })
        .catch((error) => {
          if (isAbortError(error)) return;
          streamFailed = true;
          setStreamFallbackUsed(true);
        });

      const [planResult, queryResult] = await Promise.allSettled([
        intelligenceService.planGoldrushMcp(request, undefined, {
          signal: runAbort.signal,
        }),
        intelligenceService.queryGoldrushMcp(request, undefined, {
          signal: runAbort.signal,
        }),
      ]);

      streamAbortController.abort();
      await streamPromise;

      const queryResponse =
        queryResult.status === "fulfilled" ? queryResult.value : null;
      if (queryResponse) {
        if (typeof queryResponse.conversationId === "string") {
          setActiveConversationId(queryResponse.conversationId);
        }
        if (
          planResult.status === "fulfilled" &&
          (queryResponse.plan === undefined || queryResponse.plan === null)
        ) {
          return {
            ...queryResponse,
            plan: planResult.value,
          };
        }
        return queryResponse;
      }

      if (streamFinalResponse) {
        setStreamFallbackUsed(true);
        if (typeof streamFinalResponse.conversationId === "string") {
          setActiveConversationId(streamFinalResponse.conversationId);
        }
        if (
          planResult.status === "fulfilled" &&
          (streamFinalResponse.plan === undefined ||
            streamFinalResponse.plan === null)
        ) {
          return {
            ...streamFinalResponse,
            plan: planResult.value,
          };
        }
        return streamFinalResponse;
      }

      if (streamFailed) {
        setStreamFallbackUsed(true);
      }

      if (queryResult.status === "rejected") {
        throw queryResult.reason;
      }

      throw new Error("Failed to generate an MCP response");
    },
    onSuccess: (res: IntelligenceGoldrushMcpQueryResponse) => {
      if (
        typeof res.conversationId === "string" &&
        res.conversationId.length > 0
      ) {
        setActiveConversationId(res.conversationId);
      }
      const assistantToolSteps = Array.isArray(res.steps)
        ? res.steps
            .map((step) => ({
              toolName:
                typeof step.toolName === "string" ? step.toolName : undefined,
              title: typeof step.title === "string" ? step.title : undefined,
              description:
                typeof step.description === "string"
                  ? step.description
                  : undefined,
            }))
            // Steps with no content render as bare "Step N" boxes — drop them.
            .filter(
              (step) => step.title ?? step.toolName ?? step.description ?? false
            )
            .slice(0, 4)
        : undefined;
      const structuredResult = isStructuredResult(res.structuredResult)
        ? {
            ...res.structuredResult,
            rows: normalizeStructuredRows(res.structuredResult.rows),
          }
        : null;
      const assistantMessage =
        res.status === "needs_clarification" &&
        typeof res.question === "string" &&
        res.question.trim().length > 0
          ? {
              id: `assistant-${Date.now()}`,
              role: "assistant" as const,
              content: res.question,
              kind: "question" as const,
              rationale:
                typeof res.rationale === "string" ? res.rationale : undefined,
              confidence:
                typeof res.confidence === "number" ? res.confidence : undefined,
              queryReady: false,
              toolSteps: assistantToolSteps,
              mode: res.mode,
              conversationId: res.conversationId,
              structuredResult: null,
            }
          : res.status === "answered" &&
              (structuredResult ||
                (typeof res.answer === "string" &&
                  res.answer.trim().length > 0))
            ? {
                id: `assistant-${Date.now()}`,
                role: "assistant" as const,
                content: typeof res.answer === "string" ? res.answer : "",
                kind: "answer" as const,
                rationale:
                  typeof res.rationale === "string" ? res.rationale : undefined,
                confidence:
                  typeof res.confidence === "number"
                    ? res.confidence
                    : undefined,
                queryReady:
                  typeof res.queryId === "string" && res.queryId.length > 0,
                queryId:
                  typeof res.queryId === "string" && res.queryId.length > 0
                    ? res.queryId
                    : undefined,
                toolSteps: assistantToolSteps,
                mode: res.mode,
                conversationId: res.conversationId,
                structuredResult,
              }
            : null;

      if (assistantMessage) {
        setChatMessages((prev) => [...prev, assistantMessage]);
      }

      if (typeof res.queryId === "string" && res.queryId.length > 0) {
        setQueryId(res.queryId);
        setHasRunQuery(true);
        setPage(1);
        setSelectedRows([]);
      } else {
        setQueryId(null);
        setHasRunQuery(false);
      }

      // MCP runs spend GoldRush credits — refresh the meter.
      queryClient
        .invalidateQueries({ queryKey: ["intelligence", "credits"] })
        .catch(() => undefined);
    },
    onError: (err) => {
      // User pressed Stop (or the run was aborted) — exit quietly.
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (
        isAbortError(err) ||
        msg.includes("canceled") ||
        msg.includes("cancelled") ||
        msg.includes("aborted")
      ) {
        setStreamActivity((prev) => [
          ...prev.slice(-3),
          {
            id: `stream-stopped-${Date.now()}`,
            label: "Stopped",
            detail: "Run cancelled.",
            tone: "warning",
          },
        ]);
        return;
      }
      const errorReport = toMcpFailureReport(err, {
        prompt: lastSubmittedChatPrompt,
        conversationId: activeConversationId,
      });
      const { message } = errorReport;
      console.error("[intelligence] MCP chat failure", errorReport, err);
      setStreamActivity((prev) => [
        ...prev.slice(-3),
        {
          id: `stream-error-${Date.now()}`,
          label: "Error",
          detail: message,
          tone: "error",
        },
      ]);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          kind: "error",
          content:
            "I couldn't complete that MCP request. Please try again or refine the prompt.",
          rationale: message,
          errorReport,
          queryReady: false,
        },
      ]);
      toast.error(message);
    },
    onSettled: () => {
      mcpAbortRef.current = null;
    },
  });

  const stopMcpRun = useCallback(() => {
    mcpAbortRef.current?.abort();
    mcpAbortRef.current = null;
  }, []);

  const submitChatPrompt = useCallback(
    (prompt: string) => {
      const trimmedPrompt = prompt.trim();
      if (trimmedPrompt.length === 0) return;

      setChatMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmedPrompt,
        },
      ]);
      setLastSubmittedChatPrompt(trimmedPrompt);
      setChatPrompt("");
      mcpMutation.mutate(trimmedPrompt);
    },
    [mcpMutation]
  );

  useEffect(() => {
    if (activeSurface !== "chat") return;
    const node = chatThreadEndRef.current;
    if (!node || typeof node.scrollIntoView !== "function") return;
    node.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeSurface, chatMessages.length, mcpMutation.isPending]);

  const suggestionsMutation = useMutation({
    mutationFn: async () => {
      if (trimmedAssistantPrompt.length === 0) {
        throw new Error("Write a prompt first");
      }
      return intelligenceService.getQuerySuggestions({
        prompt: trimmedAssistantPrompt,
        protocol: selectedProtocol?.name,
        sector: selectedSector,
        chain: selectedChains.length === 1 ? primaryChain : undefined,
        contractAddresses:
          Array.isArray(selectedProtocol?.contractAddresses) &&
          selectedProtocol.contractAddresses.length > 0
            ? selectedProtocol.contractAddresses
            : undefined,
        includeSql: true,
        limit: 3,
        mode: "best",
      });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to load query ideas";
      toast.error(message);
    },
  });

  const generateSqlMutation = useMutation({
    mutationFn: async () => {
      if (trimmedAssistantPrompt.length === 0) {
        throw new Error("Write a prompt first");
      }
      return intelligenceService.generateSql({
        prompt: trimmedAssistantPrompt,
        mode: "best",
      });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to generate SQL";
      toast.error(message);
    },
  });

  const statusQuery = useQuery({
    queryKey: ["intelligence", "query", queryId, "status"],
    queryFn: async () =>
      queryId ? intelligenceService.getQueryStatus(queryId) : null,
    enabled: !!queryId,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => {
      const s = (q.state.data as { status?: string } | null)?.status;
      if (s === "completed" || s === "failed") return false;
      const startedAt = sqlPollStartedAtRef.current;
      if (
        startedAt !== null &&
        Date.now() - startedAt >= SQL_STATUS_POLL_TIMEOUT_MS
      ) {
        // Bounded polling: give up and surface an explicit timeout state.
        setSqlPollTimedOut(true);
        return false;
      }
      return SQL_STATUS_POLL_INTERVAL_MS;
    },
  });

  // Every new run restarts the polling clock and clears a previous timeout.
  useEffect(() => {
    sqlPollStartedAtRef.current = queryId ? Date.now() : null;
    setSqlPollTimedOut(false);
  }, [queryId]);

  const resultsQuery = useQuery({
    queryKey: ["intelligence", "query", queryId, "results", { page, limit }],
    queryFn: async () =>
      queryId
        ? intelligenceService.getQueryResults(queryId, { page, limit })
        : null,
    // The SQL `run` returns rows + a "completed" status inline, so don't make
    // the results fetch depend solely on the separate status poll (the backend
    // surfaces results directly; status may resolve later or not at all).
    enabled:
      !!queryId &&
      (statusQuery.data?.status === "completed" ||
        runMutation.data?.status === "completed"),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const summaryQuery = useQuery({
    queryKey: ["intelligence", "query", queryId, "summary"],
    queryFn: async () =>
      queryId ? intelligenceService.getQuerySummary(queryId) : null,
    enabled: !!queryId && statusQuery.data?.status === "completed",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const saveReportMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!queryId) throw new Error("No query to save");
      return intelligenceService.saveQuery(queryId, { name });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "reports"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "reports", "metrics"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "reports", "summary"],
      });
      toast.success("Report saved");
      trackSuggestionInteraction({
        saved: true,
        metadata: { destination: "report" },
      });
      setActiveTab("reports");
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to save report";
      toast.error(message);
    },
  });

  const createSegmentMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!queryId) throw new Error("No query to use");
      return intelligenceService.createSegmentFromQuery({ queryId, name });
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "segments"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "segments", "metrics"],
      });
      trackSuggestionInteraction({
        convertedToSegment: true,
        metadata: { destination: "segment" },
      });
      // Confirmation dialog (profileCount + contactsCreated) instead of an
      // immediate redirect — the user chooses where to go next.
      setSegmentResult({
        segmentId: res.segmentId,
        profileCount:
          typeof res.profileCount === "number" ? res.profileCount : undefined,
        contactsCreated:
          typeof res.contactsCreated === "number"
            ? res.contactsCreated
            : undefined,
      });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to create segment";
      toast.error(message);
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (subject: string) => {
      if (!queryId) throw new Error("No query to use");
      return intelligenceService.createCampaignFromQuery({ queryId, subject });
    },
    onSuccess: (res) => {
      trackSuggestionInteraction({
        convertedToCampaign: true,
        metadata: { destination: "campaign" },
      });
      window.location.href = `/campaigns/editor?campaign=${encodeURIComponent(
        res.campaignId
      )}`;
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to create campaign";
      toast.error(message);
    },
  });

  const latestRunData = runMutation.data;
  const status = statusQuery.data?.status ?? latestRunData?.status ?? "";
  // A run is settled only at a terminal status (or once the bounded poll gave
  // up). Anything else — "running", "queued", a status endpoint that errors
  // between polls — keeps the loader up instead of a silent blank area.
  const sqlStatusSettled =
    status === "completed" || status === "failed" || sqlPollTimedOut;
  const isQueryRunning =
    runMutation.isPending ||
    mcpMutation.isPending ||
    (!!queryId && !sqlStatusSettled);

  const isSqlRunning =
    runMutation.isPending ||
    (!mcpMutation.isPending && !!queryId && !sqlStatusSettled);

  // Backend message for a rejected run (4xx/5xx, e.g. "Only SELECT queries
  // are allowed") — rendered as an explicit panel in the results area, not
  // just a toast. Scoped to the SQL surface; the chat surface reports MCP
  // failures inline in the thread.
  const sqlRunError =
    activeSurface === "sql" && runMutation.isError
      ? runMutation.error instanceof Error
        ? runMutation.error.message
        : "Failed to run query"
      : null;

  // The backend's `error` field from GET /intelligence/query/{id}/status when
  // the run reaches `failed` — shown verbatim.
  const statusFailureDetail =
    typeof statusQuery.data?.error === "string" &&
    statusQuery.data.error.trim().length > 0
      ? statusQuery.data.error
      : null;

  // Inline validation feedback for the SQL editor (invalid SQL or a rejected
  // validate call) — the toast alone disappears too quickly.
  const validationIssue = validateMutation.isError
    ? validateMutation.error instanceof Error
      ? validateMutation.error.message
      : "Failed to validate query"
    : validateMutation.data && validateMutation.data.valid !== true
      ? (Array.isArray(validateMutation.data.suggestions)
          ? validateMutation.data.suggestions
              .filter((s) => s.trim().length > 0)
              .join(" ")
          : "") || "Query needs a tweak before it can run."
      : null;

  const rows = useMemo(() => {
    const raw = resultsQuery.data?.rows ?? latestRunData?.rows ?? [];
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map(asRecord);
  }, [latestRunData?.rows, resultsQuery.data?.rows]);

  const columns = useMemo(() => {
    const cols = latestRunData?.columns;
    if (Array.isArray(cols) && cols.length > 0) {
      // Backend contract: { key, label?, type? } (older responses used `name`).
      const keys = cols
        .map((c) => {
          if (!isJsonObject(c)) return "";
          if (typeof c.key === "string" && c.key.length > 0) return c.key;
          if (typeof c.name === "string" && c.name.length > 0) return c.name;
          return "";
        })
        .filter((c) => c.length > 0);
      if (keys.length > 0) return keys;
    }
    return columnsFromRows(rows);
  }, [latestRunData?.columns, rows]);

  // Map column key → friendly header label from the backend column metadata.
  const columnLabels = useMemo(() => {
    const map = new Map<string, string>();
    const cols = latestRunData?.columns;
    if (Array.isArray(cols)) {
      for (const c of cols) {
        if (!isJsonObject(c)) continue;
        const key =
          typeof c.key === "string" && c.key.length > 0
            ? c.key
            : typeof c.name === "string"
              ? c.name
              : "";
        if (!key) continue;
        if (typeof c.label === "string" && c.label.length > 0) {
          map.set(key, c.label);
        }
      }
    }
    return map;
  }, [latestRunData?.columns]);

  const totalRows =
    typeof resultsQuery.data?.total === "number"
      ? resultsQuery.data.total
      : typeof latestRunData?.totalRows === "number"
        ? latestRunData.totalRows
        : 0;

  const pageCount = Math.max(1, Math.ceil(Math.max(0, totalRows) / limit));

  const starters = useMemo(
    () => startersQuery.data?.items ?? [],
    [startersQuery.data?.items]
  );
  const suggestionItems = useMemo(
    () => suggestionsMutation.data?.suggestions ?? [],
    [suggestionsMutation.data?.suggestions]
  );
  const reasoningTimeline = useMemo(
    () =>
      streamActivity.length > 0
        ? streamActivity.slice(-4)
        : getFallbackReasoningActivity(
            streamFallbackUsed,
            lastSubmittedChatPrompt
          ),
    [streamActivity, streamFallbackUsed, lastSubmittedChatPrompt]
  );
  const renderConversionActions = (forQueryId?: string) => {
    // Point the shared query-scoped mutations at this message's result before
    // the dialog confirms, so actions on older messages target the right run.
    const targetQuery = () => {
      if (forQueryId) setQueryId(forQueryId);
    };
    return (
      <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
        <div className="mb-3">
          <div className="text-sm font-medium text-foreground">
            Use this result
          </div>
          <div className="text-xs text-muted-foreground">
            Add these rows to your reports, or turn the wallets into a segment
            or campaign.
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              targetQuery();
              openNameDialog("report");
            }}
            disabled={saveReportMutation.isPending}
            className="justify-start rounded-xl"
          >
            Add to reports
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              targetQuery();
              openNameDialog("segment");
            }}
            disabled={createSegmentMutation.isPending}
            className="justify-start rounded-xl"
          >
            Create segment
          </Button>
          <Button
            type="button"
            onClick={() => {
              targetQuery();
              openNameDialog("campaign");
            }}
            disabled={createCampaignMutation.isPending}
            className="justify-start rounded-xl"
          >
            Launch campaign
          </Button>
        </div>
      </div>
    );
  };
  const renderStructuredRowsTable = (
    structuredRows: StructuredResultRow[],
    preferredColumns?: string[]
  ) => {
    const allColumns = columnsFromRows(structuredRows);
    const selectedColumns =
      preferredColumns && preferredColumns.length > 0
        ? preferredColumns.filter((column) => allColumns.includes(column))
        : allColumns;
    const visibleColumns = selectedColumns.slice(0, 5);

    return (
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/60">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/60 text-sm">
            <thead className="bg-muted/30">
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    {prettifyColumnLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {structuredRows.slice(0, 8).map((row) => {
                const rowKey = createStructuredRowKey(
                  row,
                  visibleColumns,
                  "structured-row"
                );
                return (
                  <tr key={rowKey} className="bg-background/30">
                    {visibleColumns.map((column) => (
                      <td
                        key={`${rowKey}-${column}`}
                        className="px-4 py-3 align-top text-foreground/92"
                      >
                        {column.toLowerCase().includes("hash") ||
                        column.toLowerCase().includes("address")
                          ? asIdentifierText(row[column])
                          : asDisplayText(preferFormattedCell(row, column))}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  const renderStructuredResult = (
    structuredResult: IntelligenceGoldrushMcpStructuredResult
  ) => {
    const structuredRows = normalizeStructuredRows(structuredResult.rows);
    const holderColumn = findPreferredColumn(structuredRows, [
      "holder",
      "wallet_address",
      "wallet",
      "address",
      "owner",
      "name",
      "label",
    ]);
    const amountColumn = findPreferredColumn(structuredRows, [
      "balance",
      "amount",
      "quantity",
      "tokens",
      "value",
    ]);
    const shareColumn = findPreferredColumn(structuredRows, [
      "share",
      "percent",
      "percentage",
      "ownership",
      "pct",
    ]);
    const assetColumn = findPreferredColumn(structuredRows, [
      "symbol",
      "asset",
      "token",
      "currency",
      "name",
    ]);
    const usdValueColumn = findPreferredColumn(structuredRows, [
      "value_usd",
      "usd_value",
      "quote",
      "value",
      "price_usd",
    ]);
    const chainColumn = findPreferredColumn(structuredRows, [
      "chain",
      "network",
    ]);
    const hashColumn = findPreferredColumn(structuredRows, [
      "tx_hash",
      "transaction_hash",
      "hash",
      "signature",
    ]);
    const fromColumn = findPreferredColumn(structuredRows, [
      "from_address",
      "from",
      "sender",
    ]);
    const toColumn = findPreferredColumn(structuredRows, [
      "to_address",
      "to",
      "recipient",
    ]);
    const timeColumn = findPreferredColumn(structuredRows, [
      "block_signed_at",
      "timestamp",
      "time",
      "date",
    ]);
    const transactionValueColumn = findPreferredColumn(structuredRows, [
      "value_usd",
      "usd_value",
      "amount",
      "value",
      "gas_spent",
    ]);
    const transactionTypeColumn = findPreferredColumn(structuredRows, [
      "method",
      "action",
      "type",
      "event",
    ]);
    const baseFeeColumn = findPreferredColumn(structuredRows, [
      "base_fee",
      "base_fee_gwei",
      "basefee",
      "basefee_gwei",
    ]);
    const standardFeeColumn = findPreferredColumn(structuredRows, [
      "standard",
      "average",
      "propose",
      "proposed",
    ]);
    const fastFeeColumn = findPreferredColumn(structuredRows, [
      "fast",
      "rapid",
      "instant",
      "priority",
    ]);
    const slowFeeColumn = findPreferredColumn(structuredRows, [
      "slow",
      "safe_low",
      "safelow",
      "low",
    ]);

    if (meaningfulStructuredRows(structuredRows).length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 px-4 py-8 text-sm text-muted-foreground">
          {emptyResultMessage(structuredResult.kind)}
        </div>
      );
    }

    switch (structuredResult.kind) {
      case "token_holders": {
        const shareValues = structuredRows
          .map((row) => (shareColumn ? asNumber(row[shareColumn]) : null))
          .filter((value): value is number => value !== null);
        const maxShare = Math.max(...shareValues, 0);

        return (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="overflow-hidden rounded-2xl border border-primary/15 bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Ranked holders
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Top holders ranked by balance
                  </div>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                  Top {structuredRows.length}
                </span>
              </div>
              <div className="divide-y divide-white/6">
                {structuredRows.slice(0, 8).map((row, index) => {
                  const shareValue =
                    shareColumn !== null ? asNumber(row[shareColumn]) : null;
                  const normalizedShare =
                    shareValue === null
                      ? 0
                      : shareValue > 0 && shareValue <= 1
                        ? shareValue * 100
                        : shareValue;
                  const width =
                    normalizedShare > 0 && maxShare > 0
                      ? Math.max(10, (normalizedShare / maxShare) * 100)
                      : 0;
                  const rowKey = createStructuredRowKey(
                    row,
                    [holderColumn, amountColumn, shareColumn, chainColumn],
                    "holder"
                  );

                  return (
                    <div
                      key={rowKey}
                      className="grid gap-3 px-5 py-4 md:grid-cols-[auto_minmax(0,1fr)_auto]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/8 text-xs font-semibold text-foreground">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {holderColumn
                            ? asIdentifierText(row[holderColumn])
                            : `Holder ${index + 1}`}
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(87,115,255,0.95),rgba(88,211,255,0.9))]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="text-sm font-medium text-foreground">
                          {amountColumn
                            ? formatCompactNumber(row[amountColumn])
                            : "—"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {shareColumn
                            ? formatPercentValue(row[shareColumn])
                            : "Share unavailable"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Result profile
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-xl border border-border/50 bg-card/70 p-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Rows
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                      {structuredRows.length.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card/70 p-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Coverage
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {chainColumn && structuredRows[0] ? (
                        <>
                          <ChainLogo
                            chain={asDisplayText(
                              structuredRows[0][chainColumn]
                            )}
                          />
                          {asDisplayText(structuredRows[0][chainColumn])}
                        </>
                      ) : (
                        chainCoverageLabel
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      case "wallet_balances":
      case "multichain_balances":
      case "historical_wallet_balances":
      case "native_token_balance":
      case "bitcoin_hd_wallet_balances":
      case "bitcoin_non_hd_wallet_balances":
      case "portfolio_value": {
        // Collapse dust: hide zero-balance rows behind a single summary line
        // instead of rendering empty cards and table rows.
        const isZeroBalanceRow = (row: StructuredResultRow) => {
          const amount = amountColumn ? asNumber(row[amountColumn]) : null;
          const usd = usdValueColumn ? asNumber(row[usdValueColumn]) : null;
          return (amount ?? 0) === 0 && (usd ?? 0) === 0;
        };
        const heldRows = structuredRows.filter((row) => !isZeroBalanceRow(row));
        const displayRows = heldRows.length > 0 ? heldRows : structuredRows;
        const hiddenCount = structuredRows.length - displayRows.length;
        return (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {displayRows.slice(0, 6).map((row, index) => {
                const rowKey = createStructuredRowKey(
                  row,
                  [assetColumn, chainColumn, amountColumn, usdValueColumn],
                  "balance"
                );
                return (
                  <div
                    key={rowKey}
                    className="rounded-2xl border border-border/60 bg-card p-4 shadow-[0_20px_60px_-40px_rgba(70,120,255,0.42)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {assetColumn
                            ? asDisplayText(row[assetColumn])
                            : `Asset ${index + 1}`}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {chainColumn ? (
                            <>
                              <ChainLogo
                                chain={asDisplayText(row[chainColumn])}
                                size={12}
                              />
                              {asDisplayText(row[chainColumn])}
                            </>
                          ) : (
                            chainCoverageLabel
                          )}
                        </div>
                      </div>
                      <span className="rounded-full border border-border bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Balance
                      </span>
                    </div>
                    <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                      {amountColumn ? asDisplayText(row[amountColumn]) : "—"}
                    </div>
                    <div className="mt-2 text-sm text-primary">
                      {usdValueColumn
                        ? formatUsdValue(row[usdValueColumn])
                        : "Value unavailable"}
                    </div>
                  </div>
                );
              })}
            </div>
            {renderStructuredRowsTable(displayRows, [
              assetColumn ?? "",
              amountColumn ?? "",
              usdValueColumn ?? "",
              chainColumn ?? "",
            ])}
            {hiddenCount > 0 ? (
              <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                {hiddenCount} zero-balance token{hiddenCount === 1 ? "" : "s"}{" "}
                hidden
              </div>
            ) : null}
          </div>
        );
      }
      case "transactions":
      case "transaction":
      case "transaction_summary":
      case "multichain_transactions":
      case "block_transactions":
      case "bitcoin_transactions":
      case "erc20_token_transfers":
      case "log_events_by_address":
      case "log_events_by_topic": {
        return (
          <div className="space-y-3">
            {structuredRows.slice(0, 6).map((row, index) => {
              const rowKey = createStructuredRowKey(
                row,
                [
                  hashColumn,
                  timeColumn,
                  fromColumn,
                  toColumn,
                  transactionTypeColumn,
                ],
                "transaction"
              );
              return (
                <div
                  key={rowKey}
                  className="rounded-2xl border border-border/60 bg-card p-4 shadow-[0_18px_60px_-42px_rgba(58,171,255,0.35)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                        {transactionTypeColumn
                          ? asDisplayText(row[transactionTypeColumn])
                          : "Transaction"}
                      </span>
                      {chainColumn ? (
                        <span className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                          <ChainLogo
                            chain={asDisplayText(row[chainColumn])}
                            size={12}
                          />
                          {asDisplayText(row[chainColumn])}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {timeColumn
                        ? formatTimestamp(row[timeColumn])
                        : `Event ${index + 1}`}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="font-mono text-sm text-foreground">
                      {hashColumn
                        ? asIdentifierText(row[hashColumn])
                        : `Tx ${index + 1}`}
                    </div>
                    <div className="text-sm text-primary">
                      {transactionValueColumn
                        ? formatUsdValue(row[transactionValueColumn])
                        : "Value unavailable"}
                    </div>
                  </div>
                  {(fromColumn ?? toColumn) && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          From
                        </div>
                        <div className="mt-2 text-sm text-foreground">
                          {fromColumn ? asIdentifierText(row[fromColumn]) : "—"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          To
                        </div>
                        <div className="mt-2 text-sm text-foreground">
                          {toColumn ? asIdentifierText(row[toColumn]) : "—"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      case "gas_prices": {
        return (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {structuredRows.slice(0, 6).map((row, index) => {
              const rowKey = createStructuredRowKey(
                row,
                [
                  chainColumn,
                  slowFeeColumn,
                  standardFeeColumn,
                  fastFeeColumn,
                  baseFeeColumn,
                ],
                "gas"
              );
              return (
                <div
                  key={rowKey}
                  className="rounded-2xl border border-border/60 bg-card p-4 shadow-[0_20px_60px_-42px_rgba(130,96,255,0.44)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">
                      {chainColumn
                        ? asDisplayText(row[chainColumn])
                        : `Network ${index + 1}`}
                    </div>
                    <span className="rounded-full border border-border bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Fees
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Slow
                      </div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {slowFeeColumn
                          ? asDisplayText(row[slowFeeColumn])
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Standard
                      </div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {standardFeeColumn
                          ? asDisplayText(row[standardFeeColumn])
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Fast
                      </div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {fastFeeColumn
                          ? asDisplayText(row[fastFeeColumn])
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Base fee
                      </div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {baseFeeColumn
                          ? asDisplayText(row[baseFeeColumn])
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
      default:
        return renderStructuredRowsTable(structuredRows);
    }
  };

  useEffect(() => {
    if (!queryId) return;
    setSelectedRows([]);
  }, [queryId]);

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }, []);

  const toggleAllRows = useCallback(() => {
    if (selectedRows.length === rows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(rows.map((_r, i) => String(i)));
    }
  }, [rows, selectedRows.length]);

  const openNameDialog = useCallback(
    (kind: "report" | "segment" | "campaign") => {
      setNameDialogKind(kind);
      setNameDialogValue("");
      setNameDialogOpen(true);
    },
    []
  );

  // Stable handlers for the (memoized) results table so editor keystrokes
  // don't re-render it.
  const clearSelection = useCallback(() => setSelectedRows([]), []);
  const goPrevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const goNextPage = useCallback(
    () => setPage((p) => Math.min(pageCount, p + 1)),
    [pageCount]
  );
  const handleSaveReport = useCallback(
    () => openNameDialog("report"),
    [openNameDialog]
  );
  const handleCreateSegment = useCallback(
    () => openNameDialog("segment"),
    [openNameDialog]
  );
  const handleCreateCampaign = useCallback(
    () => openNameDialog("campaign"),
    [openNameDialog]
  );
  const handleEmailRow = useCallback(
    (email: string) => openEmailComposer({ email }),
    [openEmailComposer]
  );

  const submitNameDialog = useCallback(() => {
    if (nameDialogKind === "campaign") {
      setNameDialogOpen(false);
      createCampaignMutation.mutate(nameDialogValue.trim());
      return;
    }
    const trimmed = nameDialogValue.trim();
    if (trimmed.length === 0) {
      toast.error("Name is required");
      return;
    }
    setNameDialogOpen(false);
    if (nameDialogKind === "report") {
      saveReportMutation.mutate(trimmed);
      return;
    }
    createSegmentMutation.mutate(trimmed);
  }, [
    createCampaignMutation,
    createSegmentMutation,
    nameDialogKind,
    nameDialogValue,
    saveReportMutation,
  ]);

  const loadSqlIntoEditor = useCallback(
    (nextQuery: string, suggestionId?: string) => {
      if (suggestionId) {
        setActiveSuggestionId(suggestionId);
        intelligenceService.trackQuerySuggestion(suggestionId, {
          selected: true,
          metadata: { source: "query-helper" },
        });
      }
      setSqlQuery(nextQuery);
      setQueryId(null);
      setHasRunQuery(false);
      setPage(1);
      setSelectedRows([]);
      validateMutation.reset();
      runMutation.reset();
      mcpMutation.reset();
      setStreamActivity([]);
      setStreamFallbackUsed(false);
    },
    [mcpMutation, runMutation, validateMutation]
  );

  return (
    <div className="space-y-4">
      {activeSurface === "chat" ? (
        <div className="relative overflow-hidden rounded-[32px] border border-primary/15 bg-card shadow-[0_44px_140px_-72px_rgba(55,98,255,0.78)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(88,123,255,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(46,164,255,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%,transparent_76%,rgba(255,255,255,0.02))]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(119,137,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(119,137,255,0.12)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative grid min-h-[560px] grid-rows-[auto_1fr_auto] md:min-h-[760px]">
            <div className="flex items-start justify-between border-b border-border/70 px-5 py-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <ChatBubbleLeftRightIcon
                      className="h-4.5 w-4.5"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      Intelligence Chat
                    </div>
                  </div>
                </div>
                {activeConversationId ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Thread {truncateMiddle(activeConversationId, 6, 4)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-6">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
                {chatMessages.length > 0 ? (
                  <>
                    {chatMessages.map((message) =>
                      message.role === "user" ? (
                        <div key={message.id} className="flex justify-end">
                          <div className="max-w-[78%] rounded-[28px_28px_12px_28px] border border-primary/30 bg-primary px-4 py-3 text-sm text-primary-foreground shadow-[0_22px_60px_-28px_rgba(86,112,255,0.7)]">
                            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary-foreground/75">
                              You
                            </div>
                            <div className="mt-1 leading-6">
                              {message.content}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div key={message.id} className="flex justify-start">
                          <div className="flex max-w-[92%] items-end gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border text-xs font-semibold ${
                                message.kind === "error"
                                  ? "border-red-400/25 bg-red-400/10 text-red-300"
                                  : "border-primary/20 bg-primary/10 text-primary"
                              }`}
                            >
                              {message.kind === "error" ? "!" : "AI"}
                            </div>
                            <div className="overflow-hidden rounded-[28px_28px_28px_12px] border border-border bg-card shadow-[0_28px_90px_-46px_rgba(45,102,255,0.5)]">
                              <div className="space-y-5 px-5 py-5">
                                {message.structuredResult ? (
                                  <div className="space-y-4">
                                    <div className="rounded-[24px] border border-primary/15 bg-card p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                      {(() => {
                                        const structured =
                                          message.structuredResult;
                                        const rowCount =
                                          meaningfulStructuredRows(
                                            normalizeStructuredRows(
                                              structured.rows
                                            )
                                          ).length;
                                        const title =
                                          structured.title &&
                                          !structured.title.includes("_")
                                            ? structured.title
                                            : prettifyColumnLabel(
                                                structured.kind
                                              );
                                        // Prefer human prose; never render raw
                                        // tool-envelope dumps as the answer.
                                        const prose = !isRawToolDump(
                                          message.content
                                        )
                                          ? message.content.trim()
                                          : (structured.summary?.trim() ?? "");
                                        return (
                                          <>
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                              <div className="text-sm font-medium text-foreground">
                                                {title}
                                              </div>
                                              {rowCount > 0 ? (
                                                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                                                  {rowCount.toLocaleString()}{" "}
                                                  {rowCount === 1
                                                    ? "result"
                                                    : "results"}
                                                </span>
                                              ) : null}
                                            </div>
                                            {prose.length > 0 ? (
                                              <p className="mt-3 text-sm leading-6 text-foreground/90">
                                                {prose}
                                              </p>
                                            ) : null}
                                          </>
                                        );
                                      })()}
                                    </div>

                                    {renderStructuredResult(
                                      message.structuredResult
                                    )}

                                    {message.queryReady
                                      ? renderConversionActions(message.queryId)
                                      : null}
                                  </div>
                                ) : message.content.trim().length > 0 ? (
                                  <div className="text-[15px] leading-7 text-foreground/95">
                                    {message.content}
                                  </div>
                                ) : null}

                                {message.kind === "error" &&
                                message.errorReport ? (
                                  <div className="rounded-[24px] border border-red-400/20 bg-red-400/5 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="text-[11px] uppercase tracking-[0.16em] text-red-200/90">
                                        Bug report
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const report = message.errorReport;
                                          if (!report) return;
                                          navigator.clipboard
                                            .writeText(
                                              formatMcpFailureReport(report)
                                            )
                                            .catch(() => {
                                              // Copy failure should not block the visible bug report.
                                            });
                                          toast.success("Bug details copied");
                                        }}
                                        className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[11px] font-medium text-red-100 transition-colors hover:bg-red-400/15"
                                      >
                                        <ClipboardDocumentIcon
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                        Copy
                                      </button>
                                    </div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <div className="text-[11px] uppercase tracking-[0.14em] text-red-200/70">
                                          Status
                                        </div>
                                        <div className="mt-1 text-sm text-red-50">
                                          {message.errorReport.statusCode ??
                                            "Unknown"}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] uppercase tracking-[0.14em] text-red-200/70">
                                          Time
                                        </div>
                                        <div className="mt-1 text-sm text-red-50">
                                          {message.errorReport.at}
                                        </div>
                                      </div>
                                      {message.errorReport.requestId ? (
                                        <div>
                                          <div className="text-[11px] uppercase tracking-[0.14em] text-red-200/70">
                                            Request ID
                                          </div>
                                          <div className="mt-1 break-all font-mono text-xs text-red-50">
                                            {message.errorReport.requestId}
                                          </div>
                                        </div>
                                      ) : null}
                                      {message.errorReport.conversationId ? (
                                        <div>
                                          <div className="text-[11px] uppercase tracking-[0.14em] text-red-200/70">
                                            Conversation ID
                                          </div>
                                          <div className="mt-1 break-all font-mono text-xs text-red-50">
                                            {message.errorReport.conversationId}
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="mt-3">
                                      <div className="text-[11px] uppercase tracking-[0.14em] text-red-200/70">
                                        Failure
                                      </div>
                                      <div className="mt-1 text-sm leading-6 text-red-50">
                                        {message.errorReport.message}
                                      </div>
                                    </div>
                                  </div>
                                ) : null}

                                {Array.isArray(message.toolSteps) &&
                                message.toolSteps.length > 0 ? (
                                  <div className="grid gap-3 md:grid-cols-2">
                                    {message.toolSteps.map((step, index) => (
                                      <div
                                        key={
                                          step.title ??
                                          step.toolName ??
                                          step.description ??
                                          "tool-step"
                                        }
                                        className="rounded-[22px] border border-border bg-muted/30 p-4"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                            {index + 1}
                                          </div>
                                          <div className="text-sm font-medium text-foreground">
                                            {step.title ??
                                              (step.toolName
                                                ? prettifyColumnLabel(
                                                    step.toolName
                                                  )
                                                : `Step ${index + 1}`)}
                                          </div>
                                        </div>
                                        {step.description ? (
                                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                            {step.description}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}

                                <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1">
                                    <BoltIcon
                                      className="h-3 w-3 text-primary"
                                      aria-hidden="true"
                                    />
                                    {message.mode === "deterministic_fallback"
                                      ? "Standard lookup"
                                      : "Live onchain lookup"}
                                  </span>
                                  {message.queryReady ? (
                                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
                                      Turn into report, campaign, or segment
                                      below
                                    </span>
                                  ) : message.kind === "question" ? (
                                    <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1">
                                      Reply below to continue this thread
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                    {mcpMutation.isPending ? (
                      <McpTypingIndicator
                        activity={reasoningTimeline}
                        recovering={streamFallbackUsed}
                      />
                    ) : null}
                  </>
                ) : (
                  <div className="flex flex-col items-center px-4 py-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-primary shadow-[0_20px_50px_-28px_rgba(86,112,255,0.8)]">
                      <SparklesIcon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h2 className="mt-5 max-w-md text-xl font-medium tracking-[-0.02em] text-foreground">
                      Ask anything about onchain activity
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                      Trace token holders, compare wallets, analyze gas, or
                      explain protocol activity.
                    </p>

                    <div className="mt-6 grid w-full max-w-xl gap-2.5 sm:grid-cols-2">
                      {[
                        {
                          title: "Top holders by token",
                          prompt:
                            "Show me the top 10 holders for this token contract.",
                        },
                        {
                          title: "Wallet balances across chains",
                          prompt:
                            "Compare this wallet's balances across EVM and Solana.",
                        },
                        {
                          title: "Recent transactions by wallet",
                          prompt:
                            "List the most recent transactions for this wallet.",
                        },
                        {
                          title: "Current gas snapshots",
                          prompt:
                            "What are the current gas prices across major chains?",
                        },
                      ].map((chip) => (
                        <button
                          key={chip.title}
                          type="button"
                          onClick={() => submitChatPrompt(chip.prompt)}
                          className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.06]"
                        >
                          <span>{chip.title}</span>
                          <ChevronUpIcon
                            className="h-4 w-4 rotate-45 text-muted-foreground transition-colors group-hover:text-primary"
                            aria-hidden="true"
                          />
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card px-3 py-2">
                      <div className="ocs-anim-hash-flicker truncate font-mono text-[10px] leading-5 tracking-[0.12em] text-primary/60">
                        {createStableLineKeys(
                          buildMatrixFrame(1, 60),
                          "empty-matrix"
                        )
                          .map(({ line }) => line)
                          .join("")}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatThreadEndRef} />
              </div>
            </div>

            <div className="border-t border-border/70 px-5 py-4 backdrop-blur">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
                <div className="flex items-end gap-2 rounded-[24px] border border-border bg-muted/40 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/25">
                  <textarea
                    id="mcp-chat-input"
                    aria-label="MCP chat input"
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (mcpMutation.isPending) return;
                        submitChatPrompt(chatPrompt);
                      }
                    }}
                    rows={1}
                    className="max-h-44 min-h-[44px] w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                    placeholder="Ask anything about onchain activity…"
                  />
                  <Button
                    type="button"
                    aria-label={mcpMutation.isPending ? "Stop" : "Send"}
                    title={mcpMutation.isPending ? "Stop" : "Send"}
                    onClick={() =>
                      mcpMutation.isPending
                        ? stopMcpRun()
                        : submitChatPrompt(chatPrompt)
                    }
                    disabled={
                      !mcpMutation.isPending && chatPrompt.trim().length === 0
                    }
                    className={
                      mcpMutation.isPending
                        ? "h-11 w-11 shrink-0 rounded-full bg-white/10 p-0 text-foreground transition-all hover:bg-white/20"
                        : "h-11 w-11 shrink-0 rounded-full bg-[linear-gradient(135deg,#5c70ff,#4258e0)] p-0 shadow-[0_14px_34px_-16px_rgba(86,112,255,0.9)] transition-all hover:shadow-[0_18px_40px_-14px_rgba(86,112,255,1)]"
                    }
                  >
                    {mcpMutation.isPending ? (
                      <StopIcon className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_28px_80px_-48px_rgba(66,118,255,0.75)] transition-shadow focus-within:shadow-[0_28px_90px_-40px_rgba(66,118,255,0.9)]">
            {/* ambient glow */}
            <div className="ocs-anim-float-glow pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/25 blur-3xl" />
            {/* editor window header */}
            <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </span>
                <div className="flex items-center gap-2">
                  <CodeBracketIcon
                    className="h-4 w-4 text-primary"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-xs text-primary/90">
                    query.sql
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopySql}
                  className="rounded-md p-1.5 text-primary transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={sqlCopied ? "Copied" : "Copy SQL"}
                >
                  {sqlCopied ? (
                    <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ClipboardDocumentIcon
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  )}
                </button>

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="AI SQL assistant"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
                    >
                      <SparklesIcon
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      AI assist
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="w-[min(420px,calc(100vw-2rem))] rounded-2xl border-border/70 bg-card/95 p-4 backdrop-blur"
                  >
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <SparklesIcon
                            className="h-4 w-4 text-primary"
                            aria-hidden="true"
                          />
                          AI SQL assistant
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Describe what you want — generate SQL, get ideas, or
                          start from a template.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <textarea
                          value={assistantPrompt}
                          onChange={(e) => setAssistantPrompt(e.target.value)}
                          placeholder="e.g. Find dormant high-value wallets that have an email on file"
                          className="min-h-[70px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => generateSqlMutation.mutate()}
                            disabled={
                              generateSqlMutation.isPending ||
                              trimmedAssistantPrompt.length === 0
                            }
                            className="flex-1"
                          >
                            {generateSqlMutation.isPending ? (
                              <ArrowPathIcon
                                className="mr-2 h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <SparklesIcon
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                            Generate SQL
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => suggestionsMutation.mutate()}
                            disabled={
                              suggestionsMutation.isPending ||
                              trimmedAssistantPrompt.length === 0
                            }
                          >
                            {suggestionsMutation.isPending ? (
                              <ArrowPathIcon
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              "Ideas"
                            )}
                          </Button>
                        </div>
                      </div>

                      {generateSqlMutation.data?.sql ? (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                          {generateSqlMutation.data.explanation ? (
                            <p className="text-xs leading-5 text-muted-foreground">
                              {generateSqlMutation.data.explanation}
                            </p>
                          ) : null}
                          <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-background p-2 font-mono text-[11px] leading-5 text-foreground">
                            {generateSqlMutation.data.sql}
                          </pre>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2"
                            onClick={() =>
                              loadSqlIntoEditor(
                                generateSqlMutation.data?.sql ?? ""
                              )
                            }
                          >
                            Use this SQL
                          </Button>
                        </div>
                      ) : null}

                      {suggestionItems.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Suggestions
                          </div>
                          {suggestionItems.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() =>
                                s.sqlDraft
                                  ? loadSqlIntoEditor(s.sqlDraft, s.id)
                                  : setAssistantPrompt(s.prompt ?? s.title)
                              }
                              className="w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
                            >
                              <div className="text-sm font-medium text-foreground">
                                {s.title}
                              </div>
                              {s.reason ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {s.reason}
                                </p>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {starters.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Starter queries
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {starters.slice(0, 6).map((starter) => (
                              <button
                                key={starter.id}
                                type="button"
                                onClick={() => loadSqlIntoEditor(starter.query)}
                                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                              >
                                {starter.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </PopoverContent>
                </Popover>
                {(() => {
                  const isValidated =
                    !validateMutation.isPending &&
                    validateMutation.data?.valid === true;
                  return (
                    <button
                      onClick={() => validateMutation.mutate()}
                      disabled={validateMutation.isPending}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                        isValidated
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                          : "border-border bg-muted/50 text-primary hover:bg-muted"
                      }`}
                    >
                      {validateMutation.isPending ? (
                        <ArrowPathIcon
                          className="h-3.5 w-3.5 animate-spin text-primary"
                          aria-hidden="true"
                        />
                      ) : isValidated ? (
                        <CheckCircleIcon
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <BoltIcon
                          className="h-3.5 w-3.5 text-primary"
                          aria-hidden="true"
                        />
                      )}
                      {isValidated ? "Valid" : "Validate"}
                    </button>
                  );
                })()}
                <button
                  onClick={() => runMutation.mutate()}
                  disabled={isQueryRunning}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-[0_12px_30px_-12px_rgba(86,112,255,0.9)] transition-all hover:bg-primary/90 hover:shadow-[0_16px_36px_-12px_rgba(86,112,255,1)] disabled:opacity-50"
                >
                  {isQueryRunning ? (
                    <ArrowPathIcon
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <PlayIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Run
                </button>
              </div>
            </div>
            {/* editor body */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(122,140,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(122,140,255,0.18)_1px,transparent_1px)] [background-size:22px_22px]" />
              {/* blockchain chain accent gutter */}
              <div className="pointer-events-none absolute inset-y-0 left-0 flex w-9 flex-col items-center justify-start gap-3 border-r border-border/60 bg-muted/20 py-4">
                {["g0", "g1", "g2", "g3", "g4", "g5"].map((k) => (
                  <span
                    key={k}
                    className="h-1.5 w-1.5 rounded-full bg-primary/40"
                  />
                ))}
              </div>
              <textarea
                aria-label="SQL query editor"
                value={sqlQuery}
                onChange={(e) => {
                  setSqlQuery(e.target.value);
                  // Editing invalidates the last validation → clear the check.
                  if (validateMutation.data) validateMutation.reset();
                }}
                className="relative z-10 h-[260px] w-full resize-none bg-transparent py-4 pl-12 pr-4 font-mono text-sm leading-6 text-foreground caret-primary placeholder:text-muted-foreground/60 focus:outline-none"
                placeholder={`SELECT\n  wallet,\n  email\nFROM users\nLIMIT 50;`}
                spellCheck={false}
              />
            </div>
            {/* footer */}
            <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              <span>Read-only SELECT against your organization data.</span>
              <span className="font-mono">
                {sqlQuery.length === 0
                  ? "0 lines"
                  : `${sqlQuery.split("\n").length} lines`}{" "}
                · {sqlQuery.length} chars
              </span>
            </div>
            {validationIssue ? (
              <div
                role="alert"
                className="relative border-t border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-destructive"
              >
                {validationIssue}
              </div>
            ) : null}
          </div>
        </>
      )}

      {isSqlRunning ? <SqlBlockchainLoader query={sqlQuery} /> : null}

      {/*
        Running SQL must always end in exactly one visible outcome: results,
        or an explicit human-readable error/empty state in this region.
      */}
      {!isSqlRunning && sqlRunError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-6"
        >
          <div className="text-sm font-medium text-destructive">
            Query failed to run
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground/90">
            {sqlRunError}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Fix the SQL above and run it again.
          </p>
        </div>
      ) : null}

      {hasRunQuery && !isSqlRunning && !sqlRunError ? (
        status === "failed" ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-6"
          >
            <div className="text-sm font-medium text-destructive">
              Query failed
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words font-mono text-sm text-foreground/90">
              {statusFailureDetail ??
                "The query failed to execute, and the backend returned no further detail."}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Fix the SQL above and run it again.
            </p>
          </div>
        ) : sqlPollTimedOut && status !== "completed" ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-6"
          >
            <div className="text-sm font-medium text-destructive">
              Query timed out
            </div>
            <p className="mt-2 text-sm text-foreground/90">
              The query was still running after{" "}
              {Math.round(SQL_STATUS_POLL_TIMEOUT_MS / 1000)} seconds, so we
              stopped waiting.
              {statusQuery.error instanceof Error
                ? ` Last status check failed: ${statusQuery.error.message}`
                : ""}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sqlPollStartedAtRef.current = Date.now();
                  setSqlPollTimedOut(false);
                  statusQuery.refetch().catch(() => undefined);
                }}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40"
              >
                Check again
              </button>
              <span className="text-xs text-muted-foreground">
                or simplify the query and run it again.
              </span>
            </div>
          </div>
        ) : resultsQuery.isError ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-6"
          >
            <div className="text-sm font-medium text-destructive">
              Couldn&apos;t load results
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground/90">
              {resultsQuery.error instanceof Error
                ? resultsQuery.error.message
                : "Failed to load query results"}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  resultsQuery.refetch().catch(() => undefined);
                }}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40"
              >
                Try again
              </button>
            </div>
          </div>
        ) : rows.length === 0 && !resultsQuery.isSuccess ? (
          // Terminal status reached but the paginated results are still on
          // their way — keep the loader up rather than flashing an empty table.
          <SqlBlockchainLoader query={sqlQuery} />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-8 text-center">
            <div className="text-sm font-medium text-foreground">
              Query ran successfully — 0 rows returned
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The SQL executed without errors but matched no rows. Adjust the
              filters and run it again.
            </p>
          </div>
        ) : (
          <SqlResultsTable
            rows={rows}
            columns={columns}
            columnLabels={columnLabels}
            selectedRows={selectedRows}
            onToggleAll={toggleAllRows}
            onToggleRow={toggleRowSelection}
            onClearSelection={clearSelection}
            totalRows={typeof totalRows === "number" ? totalRows : 0}
            winbackPotential={summaryQuery.data?.winbackPotential}
            queryId={queryId}
            status={status}
            page={page}
            pageCount={pageCount}
            onPrevPage={goPrevPage}
            onNextPage={goNextPage}
            onSaveReport={handleSaveReport}
            onCreateSegment={handleCreateSegment}
            onCreateCampaign={handleCreateCampaign}
            savePending={saveReportMutation.isPending}
            segmentPending={createSegmentMutation.isPending}
            campaignPending={createCampaignMutation.isPending}
            onEmail={handleEmailRow}
          />
        )
      ) : null}

      {(() => {
        const items = (historyQuery.data ?? [])
          .map((h) => (isJsonObject(h) ? (h as Record<string, unknown>) : {}))
          .map((item) => {
            const provider =
              typeof item.provider === "string"
                ? item.provider.toLowerCase()
                : "";
            return {
              qid:
                typeof item.queryId === "string"
                  ? item.queryId
                  : typeof item.id === "string"
                    ? item.id
                    : "",
              q:
                typeof item.query === "string" && item.query.length > 0
                  ? item.query
                  : typeof item.name === "string" && item.name.length > 0
                    ? item.name
                    : typeof item.summary === "string"
                      ? item.summary
                      : "",
              isMcp: provider.includes("goldrush") || provider.includes("mcp"),
              status: typeof item.status === "string" ? item.status : "",
              createdAt:
                typeof item.createdAt === "string"
                  ? item.createdAt
                  : typeof item.timestamp === "string"
                    ? item.timestamp
                    : "",
            };
          })
          .filter((x) => x.qid && x.q.length > 0)
          .slice(0, 12);
        if (items.length === 0) return null;
        return (
          <div className="overflow-hidden rounded-xl border border-border bg-card/40">
            <button
              type="button"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            >
              <ClockIcon
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-foreground">
                History
              </span>
              <span className="text-xs text-muted-foreground">
                MCP &amp; SQL runs
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {items.length}
              </span>
              <ChevronUpIcon
                className={`ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300 ${
                  historyOpen ? "" : "rotate-180"
                }`}
                aria-hidden="true"
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                historyOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <ul className="max-h-80 space-y-1.5 overflow-y-auto px-3 pb-3">
                  {items.map((it) => {
                    const ok = it.status === "completed";
                    const failed = it.status === "failed";
                    return (
                      <li key={it.qid}>
                        <button
                          type="button"
                          className="group flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-background"
                          onClick={() => {
                            if (it.isMcp) {
                              // Replay an MCP run: reload the prompt into
                              // the chat composer for the user to resend.
                              setChatPrompt(it.q);
                              return;
                            }
                            setSqlQuery(it.q);
                            setQueryId(it.qid);
                            setHasRunQuery(true);
                          }}
                        >
                          <span
                            className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                              ok
                                ? "bg-emerald-500"
                                : failed
                                  ? "bg-rose-500"
                                  : "bg-amber-500"
                            }`}
                          />
                          <span className="mt-0.5 shrink-0 rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {it.isMcp ? "MCP" : "SQL"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-xs text-foreground">
                              {it.q.replace(/\s+/g, " ").trim()}
                            </span>
                            {it.createdAt ? (
                              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                {new Date(it.createdAt).toLocaleString()}
                              </span>
                            ) : null}
                          </span>
                          <ArrowUturnLeftIcon
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {nameDialogKind === "report"
                ? "Save report"
                : nameDialogKind === "segment"
                  ? "Create segment"
                  : "Create campaign"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={nameDialogValue}
              onChange={(e) => setNameDialogValue(e.target.value)}
              placeholder={
                nameDialogKind === "campaign"
                  ? "Campaign subject (optional)"
                  : "Name"
              }
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNameDialog();
              }}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNameDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitNameDialog}
                disabled={
                  nameDialogKind !== "campaign" &&
                  nameDialogValue.trim().length === 0
                }
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={segmentResult !== null}
        onOpenChange={(open) => {
          if (!open) setSegmentResult(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Segment created</DialogTitle>
          </DialogHeader>
          {segmentResult ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                <CheckCircleIcon
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-foreground">
                  The wallets from this result are now a reusable segment, ready
                  for campaigns and automations.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Profiles
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {typeof segmentResult.profileCount === "number"
                      ? segmentResult.profileCount.toLocaleString()
                      : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    New contacts
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {typeof segmentResult.contactsCreated === "number"
                      ? segmentResult.contactsCreated.toLocaleString()
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSegmentResult(null);
                    // Segments list lives on the audience surface.
                    router.push("/audience");
                  }}
                >
                  Audience segments
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const { segmentId } = segmentResult;
                    setSegmentResult(null);
                    setActiveTab("segments");
                    // Client-side navigation keeps the persistent dashboard
                    // layout and the just-invalidated segments cache.
                    router.push(`/intelligence/segments/detail/${segmentId}`);
                  }}
                >
                  View segment
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
