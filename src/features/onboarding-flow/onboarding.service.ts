import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type {
  ChainRef,
  ChainRequestBody,
  ChainRequestResult,
  ResolveContractBody,
  ResolvedContract,
  ResolvedContractKind,
  ResolvedContractStandard,
  ResolveMissReason,
} from "./contracts/resolve-contract";

export type {
  ChainRef,
  ChainRequestBody,
  ChainRequestResult,
  ResolveContractBody,
  ResolvedContract,
  ResolvedContractFound,
  ResolvedContractKind,
  ResolvedContractMiss,
  ResolvedContractStandard,
  ResolveMissReason,
} from "./contracts/resolve-contract";

/**
 * Typed service for the onboarding API family (docs/backend.md 2026-07-16 -
 * `POST /onboarding/suggest-contracts`). Owns URLs, the optional `x-org-id`
 * header (onboarding usually runs before an org exists), `{ success, data }`
 * envelope unwrapping, and the normalized suggestion shapes consumed by the
 * routed onboarding flow.
 *
 * Backend notes: LLM-assisted with deterministic sector defaults as the
 * no-LLM floor; contract addresses are only present for canonical
 * deployments (never invented); responses are cached server-side for 7 days;
 * `requiresReview: true` means nothing is auto-committed - the UI must render
 * these as confirmable suggestions.
 */

/** One suggested contract from `POST /onboarding/suggest-contracts`. */
export interface SuggestedContract {
  name: string;
  /** e.g. "core", "token", "staking" - free-form backend classification. */
  kind: string;
  /** Canonical deployment address, or null when unknown. */
  address: string | null;
  /** Chain the suggestion most likely lives on (e.g. "eth-mainnet"). */
  chainHint: string;
  /** Why this contract matters - rendered as muted helper text. */
  reason: string;
}

/** One suggested event from `POST /onboarding/suggest-contracts`. */
export interface SuggestedEvent {
  name: string;
  signature: string | null;
  purpose: string;
}

export interface ContractSuggestions {
  contracts: SuggestedContract[];
  events: SuggestedEvent[];
  /** Always true from the backend - suggestions require user confirmation. */
  requiresReview: boolean;
}

export interface SuggestContractsBody {
  protocolName: string;
  sector: string;
  chains?: string[];
}

const toStrings = (raw: unknown): string[] | undefined =>
  Array.isArray(raw)
    ? raw.filter((c): c is string => typeof c === "string")
    : undefined;

const toChainRefs = (raw: unknown): ChainRef[] =>
  (Array.isArray(raw) ? raw : []).flatMap((entry): ChainRef[] => {
    if (!isJsonObject(entry)) return [];
    const chain = typeof entry.chain === "string" ? entry.chain : "";
    if (!chain) return [];
    const label =
      typeof entry.chainLabel === "string" && entry.chainLabel
        ? entry.chainLabel
        : chain;
    return [{ chain, chainLabel: label }];
  });

const RESOLVED_STANDARDS = new Set<ResolvedContractStandard>([
  "erc20",
  "erc721",
  "erc1155",
  "unknown",
]);
const RESOLVED_KINDS = new Set<ResolvedContractKind>(["token", "nft", "other"]);
const RESOLVE_MISS_REASONS = new Set<ResolveMissReason>([
  "not-evm",
  "no-chain",
  "no-code",
  "error",
]);

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
    const status = err.response?.status;
    const data = err.response?.data;
    const nestedError =
      isJsonObject(data) && isJsonObject(data.error) ? data.error : undefined;
    const message = isJsonObject(nestedError)
      ? nestedError.message
      : isJsonObject(data)
        ? data.message
        : (err.message ?? "Onboarding request failed");
    throw new Error(
      status ? `[HTTP ${status}] ${String(message)}` : String(message),
      { cause: e }
    );
  }
};

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

/**
 * Normalize the raw suggest-contracts payload. Rows without a name are
 * dropped; missing optional fields degrade to null / "" so the UI never
 * renders `undefined`.
 */
export const normalizeContractSuggestions = (
  payload: unknown
): ContractSuggestions => {
  const root = extractData<unknown>(payload);
  const rootObj = isJsonObject(root) ? root : {};

  const contracts: SuggestedContract[] = (
    Array.isArray(rootObj.contracts) ? rootObj.contracts : []
  )
    .map((entry): SuggestedContract | null => {
      if (!isJsonObject(entry)) return null;
      const name = pickString(entry.name);
      if (!name) return null;
      return {
        name,
        kind: pickString(entry.kind) ?? "contract",
        address: pickString(entry.address) ?? null,
        chainHint: pickString(entry.chainHint, entry.chain) ?? "",
        reason: pickString(entry.reason) ?? "",
      };
    })
    .filter((row): row is SuggestedContract => row !== null);

  const events: SuggestedEvent[] = (
    Array.isArray(rootObj.events) ? rootObj.events : []
  )
    .map((entry): SuggestedEvent | null => {
      if (!isJsonObject(entry)) return null;
      const name = pickString(entry.name);
      if (!name) return null;
      return {
        name,
        signature: pickString(entry.signature) ?? null,
        purpose: pickString(entry.purpose) ?? "",
      };
    })
    .filter((row): row is SuggestedEvent => row !== null);

  return {
    contracts,
    events,
    requiresReview:
      typeof rootObj.requiresReview === "boolean"
        ? rootObj.requiresReview
        : true,
  };
};

/**
 * Normalize the raw resolve-contract payload into the discriminated result.
 * Anything that is not a well-formed `found: true` row degrades to a miss, so
 * the UI only ever shows a verified card when the backend truly resolved one.
 */
export const normalizeResolvedContract = (
  payload: unknown,
  fallbackAddress: string
): ResolvedContract => {
  const root = extractData<unknown>(payload);
  const o = isJsonObject(root) ? root : {};
  const address = pickString(o.address) ?? fallbackAddress;

  if (o.found === true) {
    const standard = pickString(o.standard) as
      ResolvedContractStandard | undefined;
    const kind = pickString(o.kind) as ResolvedContractKind | undefined;
    return {
      found: true,
      address,
      chain: pickString(o.chain) ?? "",
      chainLabel: pickString(o.chainLabel) ?? "",
      standard:
        standard && RESOLVED_STANDARDS.has(standard) ? standard : "unknown",
      kind: kind && RESOLVED_KINDS.has(kind) ? kind : "other",
      name: pickString(o.name) ?? null,
      symbol: pickString(o.symbol) ?? null,
      decimals: typeof o.decimals === "number" ? o.decimals : null,
      logo: pickString(o.logo) ?? null,
      verifiedOnChain: true,
      alsoOn: toChainRefs(o.alsoOn),
    };
  }

  const reason = pickString(o.reason) as ResolveMissReason | undefined;
  return {
    found: false,
    address,
    reason: reason && RESOLVE_MISS_REASONS.has(reason) ? reason : "error",
    chainsTried: toStrings(o.chainsTried),
    chainsUnreachable: toStrings(o.chainsUnreachable),
  };
};

/**
 * Normalize `POST /onboarding/chain-request`. Anything that is not a
 * well-formed "we already index it" answer reads as recorded, which is the
 * only other thing a 200 can mean.
 */
export const normalizeChainRequest = (
  payload: unknown,
  asked: string
): ChainRequestResult => {
  const root = extractData<unknown>(payload);
  const o = isJsonObject(root) ? root : {};
  const [supported] = toChainRefs([o.supported]);
  if (o.recorded === false && supported) return { recorded: false, supported };
  const request = isJsonObject(o.request) ? o.request : {};
  return { recorded: true, chain: pickString(request.chain) ?? asked };
};

/** One contract handed to the indexer when the connect-chain task completes. */
export interface IndexContractInput {
  address: string;
  /** Backend chain hint (e.g. "eth-mainnet", "base"); from the suggestion's chainHint. */
  chain?: string;
  name?: string;
}

/** Body for `PUT /onboarding/tasks/connect-chain/complete`. */
export interface CompleteOnboardingTaskBody {
  contracts?: IndexContractInput[];
  lookbackDays?: number;
}

export const onboardingService = {
  /**
   * `POST /onboarding/suggest-contracts` - LLM-assisted contract/event
   * suggestions for a protocol. Bounded (30s timeout + abort signal) because
   * the backend may consult a chat model; callers treat failures as a
   * silently skipped enhancement, never a blocker.
   */
  async suggestContracts(
    body: SuggestContractsBody,
    opts?: { signal?: AbortSignal },
    orgId?: string
  ): Promise<ContractSuggestions> {
    const payload = await request<unknown>(
      {
        method: "POST",
        url: "/onboarding/suggest-contracts",
        data: body,
        timeout: 30_000,
        signal: opts?.signal,
      },
      orgId
    );
    return normalizeContractSuggestions(payload);
  },

  /**
   * `POST /onboarding/resolve-contract` - reads a pasted address off-chain
   * (Alchemy) and returns what it actually is: the chain holding its code, the
   * token standard, and its name/symbol. Unlike `suggestContracts` this is real
   * chain data, not an LLM guess. With no `chain` the backend looks on every
   * chain it indexes, so this is bounded at 30s (and abortable); callers show
   * a failure as "could not check", never as "not found".
   */
  async resolveContract(
    body: ResolveContractBody,
    opts?: { signal?: AbortSignal },
    orgId?: string
  ): Promise<ResolvedContract> {
    const payload = await request<unknown>(
      {
        method: "POST",
        url: "/onboarding/resolve-contract",
        data: body,
        timeout: 30_000,
        signal: opts?.signal,
      },
      orgId
    );
    return normalizeResolvedContract(payload, body.address);
  },

  /**
   * `POST /onboarding/chain-request` - the contract is on a chain we do not
   * index, and the person says which. Recorded on the workspace as the demand
   * signal for what to add next. When the name is a chain we do index, nothing
   * is recorded and that chain comes back instead.
   */
  async requestChain(
    body: ChainRequestBody,
    orgId?: string
  ): Promise<ChainRequestResult> {
    const payload = await request<unknown>(
      {
        method: "POST",
        url: "/onboarding/chain-request",
        data: body,
        timeout: 15_000,
      },
      orgId
    );
    return normalizeChainRequest(payload, body.chain);
  },

  /**
   * `PUT /onboarding/tasks/{taskId}/complete` - marks an onboarding task done.
   * For `connect-chain` the backend also enqueues the initial historical
   * indexing job for the supplied contracts, which is how index-after-plan
   * kicks off. Requires an active org (x-org-id). Best-effort for callers:
   * indexing starting is not allowed to block finishing onboarding.
   */
  async completeTask(
    taskId: string,
    body: CompleteOnboardingTaskBody,
    orgId?: string
  ): Promise<void> {
    await request<unknown>(
      {
        method: "PUT",
        url: `/onboarding/tasks/${taskId}/complete`,
        data: body,
        timeout: 20_000,
      },
      orgId
    );
  },
};
