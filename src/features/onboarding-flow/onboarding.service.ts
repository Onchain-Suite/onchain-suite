import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

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

/** Standard reported by `POST /onboarding/resolve-contract` (real chain read). */
export type ResolvedContractStandard =
  "erc20" | "erc721" | "erc1155" | "unknown";
export type ResolvedContractKind = "token" | "nft" | "other";
export type ResolveMissReason = "not-evm" | "no-chain" | "no-code" | "error";

/** A real contract read off-chain: what the pasted address actually is. */
export interface ResolvedContractFound {
  found: true;
  address: string;
  /** Canonical chain slug the code was found on. */
  chain: string;
  /** Human label for that chain (e.g. "Base"). */
  chainLabel: string;
  standard: ResolvedContractStandard;
  kind: ResolvedContractKind;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
  verifiedOnChain: true;
}

/** No contract resolved: the UI asks the user to check the address. */
export interface ResolvedContractMiss {
  found: false;
  address: string;
  reason: ResolveMissReason;
  /** Chains that were checked for code, for the "not found on X" message. */
  chainsTried?: string[];
}

export type ResolvedContract = ResolvedContractFound | ResolvedContractMiss;

export interface ResolveContractBody {
  address: string;
  chain?: string;
  chains?: string[];
}

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
    };
  }

  const reason = pickString(o.reason) as ResolveMissReason | undefined;
  return {
    found: false,
    address,
    reason: reason && RESOLVE_MISS_REASONS.has(reason) ? reason : "error",
    chainsTried: Array.isArray(o.chainsTried)
      ? o.chainsTried.filter((c): c is string => typeof c === "string")
      : undefined,
  };
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
   * chain data, not an LLM guess. Bounded (15s + abort) and silent on failure:
   * a resolve that errors is treated as "not found", never a blocker.
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
        timeout: 15_000,
        signal: opts?.signal,
      },
      orgId
    );
    return normalizeResolvedContract(payload, body.address);
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
