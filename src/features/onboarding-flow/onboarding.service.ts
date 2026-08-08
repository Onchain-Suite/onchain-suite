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
};
