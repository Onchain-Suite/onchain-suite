import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

export interface AudienceOverview {
  total?: number;
  withWallet?: number;
  avgHealth?: number;
  activeCount?: number;
  coolingCount?: number;
  coldCount?: number;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AudienceProfile {
  id: string;
  name?: string;
  email?: string;
  wallet?: string;
  walletAddress?: string;
  wallets?: Array<{
    address: string;
    chain?: string;
    isPrimary?: boolean;
  }>;
  status?: string;
  healthScore?: number;
  engagement?: string;
  tags?: string[] | Array<Record<string, unknown>>;
  attributes?: Record<string, unknown>;
  lastAction?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AudienceTag {
  name: string;
  [key: string]: unknown;
}

export interface ListProfilesParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: "verified" | "pending" | "unverified" | string;
  tag?: string;
  engagement?: "active" | "cooling" | "cold" | string;
  hasWallet?: boolean;
  sort?: "name" | "healthScore" | "lastActionAt" | string;
  direction?: "asc" | "desc" | string;
  include?: string;
}

export type AudienceImportExportFormat = "csv" | "json";

/**
 * Platforms whose CSV export headers the backend auto-maps when passed as
 * `?platform=` on `POST /audience/imports` (docs/backend.md 2026-07-16).
 * Explicit `mapping` entries still override the preset.
 */
export type AudienceImportPlatform =
  | "mailchimp"
  | "constant_contact"
  | "sendgrid"
  | "sparkpost"
  | "postmark"
  | "hubspot";

/** One platform preset from `GET /audience/imports/presets`. */
export interface AudienceImportPreset {
  platform: AudienceImportPlatform | string;
  label: string;
  /** CSV header → audience field map, when the backend exposes it. */
  mapping?: Record<string, string>;
}

export type AudienceJobState =
  "queued" | "processing" | "completed" | "failed" | "cancelled";

export interface AudienceImportJobStatus {
  jobId: string;
  state: AudienceJobState | string;
  format?: AudienceImportExportFormat | string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  progress?: number;
  totalRows?: number;
  processedRows?: number;
  createdCount?: number;
  updatedCount?: number;
  skippedCount?: number;
  errorCount?: number;
  errorSample?: Array<{
    rowNumber?: number;
    key?: string;
    message?: string;
    code?: string;
  }>;
}

export interface AudienceExportJobStatus {
  jobId: string;
  state: AudienceJobState | string;
  format?: AudienceImportExportFormat | string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  progress?: number;
  totalRows?: number;
  processedRows?: number;
  downloadUrl?: string;
  expiresAt?: string;
  fileSizeBytes?: number;
}

export interface AudienceAttributeKey {
  key: string;
  type: "string" | "number" | "boolean" | "date" | string;
  label?: string;
  exampleValues?: string[];
  countProfiles?: number;
}

export interface AudienceAttributeValuesResponse {
  key: string;
  values: Array<{ value: string; count: number }>;
}

export interface AudienceProfileHealth {
  score: number;
  trend: "up" | "down" | "stable" | string;
  updatedAt: string;
  factors?: Array<{ key: string; value: number | string; weight: number }>;
}

export interface AudienceProfileChurn {
  risk: "low" | "medium" | "high" | string;
  score: number;
  predictedLtvUsd?: number;
  updatedAt: string;
  explanation?: string[];
}

export interface AudienceProfileActivityEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  at: string;
  metadata?: Record<string, unknown>;
}

export interface AudienceProfileEmailEvent {
  id: string;
  campaignId: string;
  subject: string;
  status: "sent" | "opened" | "clicked" | "bounced" | string;
  sentAt: string;
  openedAt?: string | null;
  clickedAt?: string | null;
}

export interface AudienceProfileTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueUsd?: number;
  asset?: string;
  blockNumber: number;
  blockTimestamp: string;
  status?: string;
  method?: string;
  contractAddress?: string;
  /** Chain identifier (e.g. `eth-mainnet`) when the backend includes it. */
  chain?: string;
}

export interface AudienceProfileContractActivity {
  contractAddress: string;
  contractName?: string;
  label?: string;
  volumeUsd?: number;
  txCount: number;
  /** Chain identifier (e.g. `eth-mainnet`) when the backend includes it. */
  chain?: string;
  /** ISO timestamp of the most recent interaction, when provided. */
  lastInteractionAt?: string;
}

export interface AudienceProfileDappStats {
  total_volume_usd: number;
  transactions_count: number;
  active_days: number;
}

export interface AudienceSegment {
  id: string;
  name: string;
  count?: number;
  starred?: boolean;
  criteria?: unknown;
  updatedAt?: string;
  [key: string]: unknown;
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
    const data = err.response?.data;
    const nestedError =
      isJsonObject(data) && isJsonObject(data.error) ? data.error : undefined;
    const message = isJsonObject(nestedError)
      ? nestedError.message
      : isJsonObject(data)
        ? data.message
        : typeof data === "string"
          ? data
          : (err.message ?? "Audience request failed");
    throw new Error(String(message), { cause: e });
  }
};

const extractItems = <T>(payload: unknown): T[] => {
  const root = extractData<unknown>(payload);
  if (Array.isArray(root)) return root as T[];
  if (isJsonObject(root) && Array.isArray(root.items)) return root.items as T[];
  if (isJsonObject(root) && Array.isArray(root.data)) return root.data as T[];
  return [];
};

/** "constant_contact" → "Constant Contact". */
const prettifyPlatformId = (platform: string) =>
  platform
    .split(/[_-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const toStringMap = (value: unknown): Record<string, string> | undefined => {
  if (!isJsonObject(value)) return undefined;
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

/**
 * Normalize `GET /audience/imports/presets` into {@link AudienceImportPreset}
 * rows. Accepts an array of preset objects, an array of platform ids, a
 * `{ presets | platforms: [...] }` wrapper, or a platform-keyed object.
 */
export const normalizeImportPresets = (
  payload: unknown
): AudienceImportPreset[] => {
  const root = extractData<unknown>(payload);
  const rootObj = isJsonObject(root) ? root : undefined;
  const list = Array.isArray(root)
    ? root
    : Array.isArray(rootObj?.presets)
      ? rootObj.presets
      : Array.isArray(rootObj?.platforms)
        ? rootObj.platforms
        : rootObj
          ? Object.entries(rootObj).map(([platform, value]) => ({
              platform,
              ...(isJsonObject(value) ? value : {}),
            }))
          : [];

  return list
    .map((entry): AudienceImportPreset | null => {
      if (typeof entry === "string" && entry.trim().length > 0) {
        const platform = entry.trim();
        return { platform, label: prettifyPlatformId(platform) };
      }
      if (!isJsonObject(entry)) return null;
      const platform =
        typeof entry.platform === "string" && entry.platform.trim().length > 0
          ? entry.platform.trim()
          : typeof entry.id === "string" && entry.id.trim().length > 0
            ? entry.id.trim()
            : null;
      if (!platform) return null;
      return {
        platform,
        label:
          typeof entry.label === "string" && entry.label.trim().length > 0
            ? entry.label.trim()
            : typeof entry.name === "string" && entry.name.trim().length > 0
              ? entry.name.trim()
              : prettifyPlatformId(platform),
        mapping: toStringMap(entry.mapping ?? entry.headers),
      };
    })
    .filter((row): row is AudienceImportPreset => row !== null);
};

export const audienceService = {
  getOverview(orgId?: string) {
    return request<AudienceOverview>(
      { method: "GET", url: "/audience/overview" },
      orgId
    );
  },

  listProfiles(params?: ListProfilesParams, orgId?: string) {
    return request<
      | { items?: AudienceProfile[]; data?: AudienceProfile[]; meta?: unknown }
      | { data?: AudienceProfile[]; meta?: unknown }
      | AudienceProfile[]
    >({ method: "GET", url: "/audience/profiles", params }, orgId);
  },

  listSegments(params?: { q?: string; limit?: number }, orgId?: string) {
    return request<
      | { items?: AudienceSegment[]; data?: AudienceSegment[] }
      | AudienceSegment[]
    >({ method: "GET", url: "/audience/segments", params }, orgId).then((res) =>
      extractItems<AudienceSegment>(res)
    );
  },

  createSegment(body: { name: string; criteria?: unknown }, orgId?: string) {
    return request<AudienceSegment>(
      { method: "POST", url: "/audience/segments", data: body },
      orgId
    );
  },

  createProfile(body: Record<string, unknown>, orgId?: string) {
    return request<AudienceProfile>(
      { method: "POST", url: "/audience/profiles", data: body },
      orgId
    );
  },

  getProfile(id: string, params?: { include?: string }, orgId?: string) {
    return request<AudienceProfile>(
      { method: "GET", url: `/audience/profiles/${id}`, params },
      orgId
    );
  },

  updateProfile(id: string, body: Record<string, unknown>, orgId?: string) {
    return request<AudienceProfile>(
      { method: "PUT", url: `/audience/profiles/${id}`, data: body },
      orgId
    );
  },

  deleteProfile(id: string, orgId?: string) {
    return request<{ success?: boolean }>(
      { method: "DELETE", url: `/audience/profiles/${id}` },
      orgId
    );
  },

  listTags(orgId?: string) {
    return request<
      { items?: AudienceTag[]; data?: AudienceTag[] } | AudienceTag[]
    >({ method: "GET", url: "/audience/tags" }, orgId);
  },

  createTag(body: { name: string }, orgId?: string) {
    return request<AudienceTag>(
      { method: "POST", url: "/audience/tags", data: body },
      orgId
    );
  },

  addTagsToProfile(id: string, body: { tags: string[] }, orgId?: string) {
    return request<{ success?: boolean }>(
      { method: "PUT", url: `/audience/profiles/${id}/tags`, data: body },
      orgId
    );
  },

  removeTagFromProfile(id: string, tagName: string, orgId?: string) {
    return request<{ success?: boolean }>(
      {
        method: "DELETE",
        url: `/audience/profiles/${id}/tags/${encodeURIComponent(tagName)}`,
      },
      orgId
    );
  },

  listAttributes(params?: { q?: string; limit?: number }, orgId?: string) {
    return request<{ keys: AudienceAttributeKey[] }>(
      { method: "GET", url: "/audience/attributes", params },
      orgId
    );
  },

  listAttributeKeys(params?: { q?: string; limit?: number }, orgId?: string) {
    return request<{ keys: AudienceAttributeKey[] }>(
      { method: "GET", url: "/audience/attributes/keys", params },
      orgId
    );
  },

  listAttributeValues(
    key: string,
    params?: { q?: string; limit?: number },
    orgId?: string
  ) {
    return request<AudienceAttributeValuesResponse>(
      {
        method: "GET",
        url: `/audience/attributes/${encodeURIComponent(key)}/values`,
        params,
      },
      orgId
    );
  },

  getProfileActivity(
    id: string,
    params?: {
      cursor?: string;
      limit?: number;
      types?: string;
      from?: string;
      to?: string;
    },
    orgId?: string
  ) {
    return request<{
      items: AudienceProfileActivityEvent[];
      nextCursor?: string;
    }>(
      { method: "GET", url: `/audience/profiles/${id}/activity`, params },
      orgId
    );
  },

  getProfileEmails(
    id: string,
    params?: {
      cursor?: string;
      limit?: number;
      from?: string;
      to?: string;
      campaignId?: string;
    },
    orgId?: string
  ) {
    return request<{ items: AudienceProfileEmailEvent[]; nextCursor?: string }>(
      { method: "GET", url: `/audience/profiles/${id}/emails`, params },
      orgId
    );
  },

  getProfileTransactions(
    id: string,
    params?: {
      chain?: string;
      cursor?: string;
      limit?: number;
      fromBlock?: number;
      toBlock?: number;
    },
    orgId?: string
  ) {
    return request<
      {
        items: AudienceProfileTransaction[];
        nextCursor?: string;
      } & { meta?: Record<string, unknown> }
    >(
      { method: "GET", url: `/audience/profiles/${id}/transactions`, params },
      orgId
    );
  },

  getProfileContractActivity(
    id: string,
    params?: { chain?: string; from?: string; to?: string; limit?: number },
    orgId?: string
  ) {
    return request<{
      items: AudienceProfileContractActivity[];
      refreshedAt?: string;
    }>(
      {
        method: "GET",
        url: `/audience/profiles/${id}/contract-activity`,
        params,
      },
      orgId
    );
  },

  getProfileDappStats(id: string, params?: { chain?: string }, orgId?: string) {
    return request<AudienceProfileDappStats>(
      {
        method: "GET",
        url: `/audience/profiles/${encodeURIComponent(id)}/dapp-stats`,
        params,
      },
      orgId
    );
  },

  getProfileHealth(id: string, orgId?: string) {
    return request<AudienceProfileHealth>(
      { method: "GET", url: `/audience/profiles/${id}/health` },
      orgId
    );
  },

  getProfileChurn(id: string, orgId?: string) {
    return request<AudienceProfileChurn>(
      { method: "GET", url: `/audience/profiles/${id}/churn` },
      orgId
    );
  },

  enrichProfile(
    id: string,
    body?: { chains?: string[]; force?: boolean },
    orgId?: string
  ) {
    return request<{ jobId: string }>(
      {
        method: "POST",
        url: `/audience/profiles/${id}/enrich`,
        data: body ?? {},
      },
      orgId
    );
  },

  /**
   * `GET /audience/imports/presets` — platform CSV-header presets for
   * `createImportJob`'s `platform` option. Callers cache this aggressively
   * (long `staleTime`) and degrade to the manual-only flow when it fails.
   */
  async listImportPresets(orgId?: string): Promise<AudienceImportPreset[]> {
    const payload = await request<unknown>(
      { method: "GET", url: "/audience/imports/presets" },
      orgId
    );
    return normalizeImportPresets(payload);
  },

  createImportJob(
    input: {
      file: File;
      format?: AudienceImportExportFormat;
      mapping?: Record<string, string>;
      options?: Record<string, unknown>;
      /**
       * Platform preset (`?platform=mailchimp|…`): the backend auto-maps that
       * platform's CSV export headers; explicit `mapping` entries override.
       */
      platform?: AudienceImportPlatform | string;
      query?: Record<string, string | number | boolean | undefined>;
    },
    orgId?: string
  ) {
    const fd = new FormData();
    fd.append("file", input.file);
    if (input.mapping && Object.keys(input.mapping).length > 0) {
      fd.append("mapping", JSON.stringify(input.mapping));
    }
    if (input.options && Object.keys(input.options).length > 0) {
      fd.append("options", JSON.stringify(input.options));
    }

    const params: Record<string, unknown> = { ...(input.query ?? {}) };
    if (input.format) params.format = input.format;
    if (input.platform && input.platform.trim().length > 0) {
      params.platform = input.platform.trim();
    }

    return request<{ jobId?: string; id?: string } & AudienceImportJobStatus>(
      {
        method: "POST",
        url: "/audience/imports",
        data: fd,
        params,
        headers: { "Content-Type": "multipart/form-data" },
      },
      orgId
    );
  },

  getImportJob(jobId: string, orgId?: string) {
    return request<AudienceImportJobStatus>(
      { method: "GET", url: `/audience/imports/${encodeURIComponent(jobId)}` },
      orgId
    );
  },

  cancelImportJob(jobId: string, orgId?: string) {
    return request<{ success?: boolean } & { jobId?: string; state?: string }>(
      {
        method: "POST",
        url: `/audience/imports/${encodeURIComponent(jobId)}/cancel`,
      },
      orgId
    );
  },

  async downloadImportErrors(jobId: string, orgId?: string) {
    const resolvedOrgId = pickOrgId(orgId);
    const headers = {
      ...(resolvedOrgId ? { "x-org-id": resolvedOrgId } : {}),
      "x-onchain-silent-error": "1",
    };
    const res = await apiClient.request<Blob>({
      method: "GET",
      url: `/audience/imports/${encodeURIComponent(jobId)}/errors`,
      responseType: "blob",
      headers,
    });
    return res.data;
  },

  createExportJob(
    body: {
      format: AudienceImportExportFormat;
      filters?: Record<string, unknown>;
      fields?: string[];
      includeAttributes?: boolean;
      includeTags?: boolean;
      sort?: { by: string; direction: "asc" | "desc" };
    },
    orgId?: string
  ) {
    return request<{ jobId?: string; id?: string } & AudienceExportJobStatus>(
      { method: "POST", url: "/audience/exports", data: body },
      orgId
    );
  },

  getExportJob(jobId: string, orgId?: string) {
    return request<AudienceExportJobStatus>(
      { method: "GET", url: `/audience/exports/${encodeURIComponent(jobId)}` },
      orgId
    );
  },

  cancelExportJob(jobId: string, orgId?: string) {
    return request<{ success?: boolean } & { jobId?: string; state?: string }>(
      {
        method: "POST",
        url: `/audience/exports/${encodeURIComponent(jobId)}/cancel`,
      },
      orgId
    );
  },

  async downloadExport(jobId: string, orgId?: string) {
    const resolvedOrgId = pickOrgId(orgId);
    const headers = {
      ...(resolvedOrgId ? { "x-org-id": resolvedOrgId } : {}),
      "x-onchain-silent-error": "1",
    };
    const res = await apiClient.request<Blob>({
      method: "GET",
      url: `/audience/exports/${encodeURIComponent(jobId)}/download`,
      responseType: "blob",
      headers,
    });
    return res.data;
  },
};
