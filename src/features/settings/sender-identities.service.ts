"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Typed service for the sender domains & identities API family
 * (docs/backend.md - "Sender domains & identities - frontend integration
 * guide"). Owns the URLs, the `x-org-id` header, `{ success, data }` envelope
 * unwrapping, and the normalized {@link SenderIdentity} shape shared by
 * settings, the campaign form, and the automation builder's send_email node.
 *
 * Send-time resolution (backend): explicit campaign/node sender → org default
 * identity → most-recently-verified identity → platform fallback
 * (DoNotReply@…azurecomm.net).
 */

export type SenderIdentityStatus = "verified" | "pending" | "failed";

/** Normalized org sender identity - the only shape components consume. */
export interface SenderIdentity {
  id: string;
  email: string;
  name: string;
  domain: string;
  dkim: boolean;
  spf: boolean;
  status: SenderIdentityStatus;
  isDefault: boolean;
}

export interface DomainAuthState {
  dkim?: boolean;
  spf?: boolean;
  status?: SenderIdentityStatus;
}

/** Per-domain authentication rollup keyed by domain name. */
export type DomainAuthMap = Map<string, DomainAuthState>;

/** Raw-ish domain row from `GET /domain` / `POST /domain`. */
export interface SenderDomainRecord {
  id?: string;
  domain?: string;
  status?: string;
  verificationRecords?: unknown;
  [key: string]: unknown;
}

/** Registrar-ready record from `GET /domain/{id}/dns`. */
export interface DomainDnsRecord {
  id?: string;
  host?: string;
  type?: string;
  value?: string;
  ttl?: string | number;
  priority?: string | number;
  [key: string]: unknown;
}

/** One provider's records from `POST /domain/{id}/provision`. */
export interface DomainProvisionProvider {
  provider: "sendgrid" | "ses" | "acs" | string;
  status: "authenticating" | "skipped" | "error" | string;
  records: Array<{
    host: string;
    type: string;
    value: string;
    valid?: boolean;
  }>;
  reason?: string;
}

/** `POST /domain/{id}/provision` - every configured provider's DNS together. */
export interface DomainProvisionResult {
  domain: string;
  providers: DomainProvisionProvider[];
}

export interface DomainStatusResponse {
  status?: string;
  dkim?: unknown;
  spf?: unknown;
  [key: string]: unknown;
}

export interface CreateSenderIdentityBody {
  email: string;
  name?: string;
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
        : (err.message ?? "Sender identities request failed");
    throw new Error(
      status ? `[HTTP ${status}] ${String(message)}` : String(message),
      { cause: e }
    );
  }
};

const toArray = (payload: unknown): unknown[] => {
  const root = extractData<unknown>(payload);
  if (Array.isArray(root)) return root;
  if (isJsonObject(root) && Array.isArray(root.items)) return root.items;
  if (isJsonObject(root) && Array.isArray(root.data)) return root.data;
  return [];
};

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const pickBoolean = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (
        ["pass", "passed", "verified", "true", "valid", "ok"].includes(
          normalized
        )
      ) {
        return true;
      }
      if (
        ["fail", "failed", "false", "invalid", "pending"].includes(normalized)
      ) {
        return false;
      }
    }
  }
  return undefined;
};

const pickBooleanLike = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "default", "verified"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no"].includes(normalized)) {
        return false;
      }
    }
  }
  return undefined;
};

const resolveExplicitStatus = (
  ...values: unknown[]
): SenderIdentityStatus | undefined => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    // Check pending/failed BEFORE verified: "pending_verification" contains
    // "ver" and would otherwise be misread as verified.
    if (normalized.includes("pend")) return "pending";
    if (normalized.includes("fail")) return "failed";
    if (normalized.includes("ver")) return "verified";
  }
  return undefined;
};

/**
 * Build the per-domain authentication map from
 * `GET /sender-identities/domains/authentication` (array or keyed-object
 * payloads are both accepted).
 */
export const extractDomainAuthMap = (payload: unknown): DomainAuthMap => {
  const map: DomainAuthMap = new Map();
  const root = extractData<unknown>(payload);

  const addEntry = (domain: string | undefined, value: unknown) => {
    if (!domain || !isJsonObject(value)) return;
    const dkim = pickBoolean(
      value.dkim,
      value.dkimValid,
      value.dkimVerified,
      value.dkimStatus
    );
    const spf = pickBoolean(
      value.spf,
      value.spfValid,
      value.spfVerified,
      value.spfStatus
    );
    // Only record what the rollup explicitly states - fabricated statuses
    // would be mistaken for backend truth downstream.
    map.set(domain, {
      dkim,
      spf,
      status: resolveExplicitStatus(
        value.status,
        value.verificationStatus,
        value.state
      ),
    });
  };

  if (Array.isArray(root)) {
    for (const entry of root) {
      if (!isJsonObject(entry)) continue;
      addEntry(
        pickString(entry.domain, entry.name, entry.hostname, entry.host),
        entry
      );
    }
    return map;
  }

  if (!isJsonObject(root)) return map;
  for (const [domain, value] of Object.entries(root)) {
    addEntry(domain, value);
  }
  return map;
};

/**
 * Normalize `GET /sender-identities` rows into {@link SenderIdentity},
 * merging per-domain DKIM/SPF state when the authentication rollup is
 * available. Default identity sorts first, then by email.
 */
export const normalizeSenderIdentities = (
  payload: unknown,
  domainMap: DomainAuthMap = new Map()
): SenderIdentity[] => {
  return toArray(payload)
    .map((entry, index) => {
      if (!isJsonObject(entry)) return null;
      const email = pickString(
        entry.email,
        entry.senderEmail,
        entry.address,
        entry.fromEmail
      );
      if (!email) return null;
      const domain = email.includes("@") ? (email.split("@").pop() ?? "") : "";
      const domainState = domainMap.get(domain);
      // Keep dkim/spf unknown (undefined) until the status is resolved - a
      // VERIFIED identity with no per-record rollup data should render its
      // checks as passed, not failed.
      const dkim =
        pickBoolean(
          entry.dkim,
          entry.dkimValid,
          entry.dkimVerified,
          entry.dkimStatus
        ) ?? domainState?.dkim;
      const spf =
        pickBoolean(
          entry.spf,
          entry.spfValid,
          entry.spfVerified,
          entry.spfStatus
        ) ?? domainState?.spf;
      const status =
        resolveExplicitStatus(
          entry.status,
          entry.verificationStatus,
          entry.state,
          domainState?.status
        ) ?? (dkim && spf ? "verified" : "pending");
      return {
        id:
          pickString(entry.id, entry.senderId, entry.identityId) ??
          `${email}-${index}`,
        email,
        name:
          pickString(entry.name, entry.senderName, entry.displayName) ??
          email.split("@")[0] ??
          "Sender",
        domain,
        dkim: dkim ?? status === "verified",
        spf: spf ?? status === "verified",
        status,
        isDefault:
          pickBooleanLike(entry.isDefault, entry.default, entry.isPrimary) ??
          false,
      } satisfies SenderIdentity;
    })
    .filter((row): row is SenderIdentity => Boolean(row))
    .sort((left, right) => {
      if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
      return left.email.localeCompare(right.email);
    });
};

const toDomainRecords = (payload: unknown): SenderDomainRecord[] =>
  toArray(payload).filter(isJsonObject) as SenderDomainRecord[];

export const senderIdentitiesService = {
  /**
   * Normalized org sender identities. Fetches the identity list and the
   * per-domain authentication rollup in parallel (the rollup is best-effort)
   * and merges them, so `status === "verified"` is reliable for gating.
   */
  async listSenderIdentities(orgId?: string): Promise<SenderIdentity[]> {
    const [identities, domainAuth] = await Promise.all([
      request<unknown>({ method: "GET", url: "/sender-identities" }, orgId),
      request<unknown>(
        { method: "GET", url: "/sender-identities/domains/authentication" },
        orgId
      ).catch(() => null),
    ]);
    return normalizeSenderIdentities(
      identities,
      extractDomainAuthMap(domainAuth)
    );
  },

  /** `POST /sender-identities` - create a From-address on a verified domain. */
  createSenderIdentity(body: CreateSenderIdentityBody, orgId?: string) {
    return request<unknown>(
      { method: "POST", url: "/sender-identities", data: body },
      orgId
    );
  },

  /** `DELETE /sender-identities/{id}`. */
  deleteSenderIdentity(senderIdentityId: string, orgId?: string) {
    return request<unknown>(
      { method: "DELETE", url: `/sender-identities/${senderIdentityId}` },
      orgId
    );
  },

  /** `POST /sender-identities/{id}/recheck`. */
  recheckSenderIdentity(senderIdentityId: string, orgId?: string) {
    return request<unknown>(
      {
        method: "POST",
        url: `/sender-identities/${senderIdentityId}/recheck`,
      },
      orgId
    );
  },

  /** `PUT /sender-identities/default` - the org's default From identity. */
  setDefaultSenderIdentity(senderIdentityId: string, orgId?: string) {
    return request<unknown>(
      {
        method: "PUT",
        url: "/sender-identities/default",
        data: { senderIdentityId },
      },
      orgId
    );
  },

  /** `GET /sender-identities/domains/authentication` as a domain-keyed map. */
  async getDomainAuthentication(orgId?: string): Promise<DomainAuthMap> {
    const payload = await request<unknown>(
      { method: "GET", url: "/sender-identities/domains/authentication" },
      orgId
    );
    return extractDomainAuthMap(payload);
  },

  /** `GET /domain` - the org's sender domains. */
  async listDomains(orgId?: string): Promise<SenderDomainRecord[]> {
    const payload = await request<unknown>(
      { method: "GET", url: "/domain" },
      orgId
    );
    return toDomainRecords(payload);
  },

  /**
   * `POST /domain` - registers the domain and provisions it in Azure ACS.
   * Check `status` on the response: `VERIFIED` → done (skip the DNS screen),
   * `PENDING_VERIFICATION` → show `getDomainDns` records then `verifyDomain`.
   */
  createDomain(domain: string, orgId?: string) {
    return request<SenderDomainRecord>(
      { method: "POST", url: "/domain", data: { domain } },
      orgId
    );
  },

  /** `DELETE /domain/{id}` - removes a sender domain (e.g. a stuck pending one). */
  deleteDomain(domainId: string, orgId?: string) {
    return request<unknown>(
      { method: "DELETE", url: `/domain/${domainId}` },
      orgId
    );
  },

  /** `GET /domain/{id}/dns` - registrar-ready TXT/DKIM/SPF records. */
  async getDomainDns(domainId: string, orgId?: string) {
    const payload = await request<unknown>(
      { method: "GET", url: `/domain/${domainId}/dns` },
      orgId
    );
    return toArray(payload).filter(isJsonObject) as DomainDnsRecord[];
  },

  /**
   * `POST /domain/{id}/provision` - authenticate the domain in EVERY configured
   * send provider (transactional `EMAIL_PROVIDER` + marketing `MARKETING_PROVIDER`)
   * and return all their DNS records together, so the customer can publish both
   * sets at once. A provider that isn't configured comes back `status:"skipped"`
   * (with `reason`); one that errors is `status:"error"`; neither fails the call.
   */
  async provisionDomain(
    domainId: string,
    orgId?: string
  ): Promise<DomainProvisionResult> {
    const payload = await request<unknown>(
      { method: "POST", url: `/domain/${domainId}/provision` },
      orgId
    );
    const obj = isJsonObject(payload) ? payload : {};
    const providers = Array.isArray(obj.providers)
      ? obj.providers
          .filter(isJsonObject)
          .map((p): DomainProvisionProvider => ({
            provider: typeof p.provider === "string" ? p.provider : "",
            status: typeof p.status === "string" ? p.status : "",
            records: Array.isArray(p.records)
              ? p.records.filter(isJsonObject).map((r) => ({
                  host: typeof r.host === "string" ? r.host : "",
                  type: typeof r.type === "string" ? r.type : "",
                  value: typeof r.value === "string" ? r.value : "",
                  valid: typeof r.valid === "boolean" ? r.valid : undefined,
                }))
              : [],
            reason: typeof p.reason === "string" ? p.reason : undefined,
          }))
      : [];
    return {
      domain: typeof obj.domain === "string" ? obj.domain : "",
      providers,
    };
  },

  /**
   * `POST /domain/{id}/verify` - long-polls Azure until VERIFIED/FAILED, so
   * it is explicitly bounded rather than left to hang.
   */
  verifyDomain(domainId: string, orgId?: string) {
    return request<DomainStatusResponse>(
      {
        method: "POST",
        url: `/domain/${domainId}/verify`,
        timeout: 120_000,
      },
      orgId
    );
  },

  /** `GET /domain/{id}/status`. */
  getDomainStatus(domainId: string, orgId?: string) {
    return request<DomainStatusResponse>(
      { method: "GET", url: `/domain/${domainId}/status` },
      orgId
    );
  },

  /** `POST /domain/{id}/recheck`. */
  recheckDomain(domainId: string, orgId?: string) {
    return request<DomainStatusResponse>(
      { method: "POST", url: `/domain/${domainId}/recheck` },
      orgId
    );
  },
};
