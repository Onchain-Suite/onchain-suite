"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Typed service for the sender domains & identities API family
 * (docs/backend.md — "Sender domains & identities — frontend integration
 * guide"). Owns the URLs, the `x-org-id` header, `{ success, data }` envelope
 * unwrapping, and the normalized {@link SenderIdentity} shape shared by
 * settings, the campaign form, and the automation builder's send_email node.
 *
 * Send-time resolution (backend): explicit campaign/node sender → org default
 * identity → most-recently-verified identity → platform fallback address.
 */

export type SenderIdentityStatus = "verified" | "pending" | "failed";

/** Normalized org sender identity — the only shape components consume. */
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

export interface DomainStatusResponse {
  status?: string;
  dkim?: unknown;
  spf?: unknown;
  [key: string]: unknown;
}

/* ── Provider-agnostic domain authentication ────────────────────────────────
 * The email/DNS provider is a backend concern. Provisioning returns one entry
 * per configured provider so swapping or adding one never touches the UI. */

// The only place the concrete provider is named: the backend's route segment
// for domain validation (mirrors how GoldRush URLs carry the vendor name).
// Change this one line if the backend renames or genericizes the route.
const DOMAIN_PROVIDER_SEGMENT = "sendgrid";

/** A DNS record to publish — copy-paste `host` → `value` (CNAME by default). */
export interface ProviderDnsRecord {
  host: string;
  value: string;
  type?: string;
}

/** `authenticating` → publish `records`; `skipped` → not in use, hide it;
 * `error` → surface `reason`. */
export type ProviderStatus = "authenticating" | "skipped" | "error";

/** One provider's DNS-authentication result for a domain. */
export interface DomainProvider {
  provider: string;
  status: ProviderStatus;
  records?: ProviderDnsRecord[];
  reason?: string;
  [key: string]: unknown;
}

/** `POST /domain/{id}/provision` response. */
export interface ProvisionDomainResponse {
  id?: string;
  domain?: string;
  providers?: DomainProvider[];
  [key: string]: unknown;
}

/** Domain-validation response — poll until `valid`. */
export interface ValidateDomainResponse {
  valid?: boolean;
  records?: ProviderDnsRecord[];
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
    // Only record what the rollup explicitly states — fabricated statuses
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
      // Keep dkim/spf unknown (undefined) until the status is resolved — a
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

  /** `POST /sender-identities` — create a From-address on a verified domain. */
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

  /** `PUT /sender-identities/default` — the org's default From identity. */
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

  /** `GET /domain` — the org's sender domains. */
  async listDomains(orgId?: string): Promise<SenderDomainRecord[]> {
    const payload = await request<unknown>(
      { method: "GET", url: "/domain" },
      orgId
    );
    return toDomainRecords(payload);
  },

  /**
   * `POST /domain` — registers the domain and provisions it with the provider.
   * Check `status` on the response: `VERIFIED` → done (skip the DNS screen),
   * `PENDING_VERIFICATION` → show `getDomainDns` records then `verifyDomain`.
   */
  createDomain(domain: string, orgId?: string) {
    return request<SenderDomainRecord>(
      { method: "POST", url: "/domain", data: { domain } },
      orgId
    );
  },

  /** `GET /domain/{id}/dns` — registrar-ready TXT/DKIM/SPF records. */
  async getDomainDns(domainId: string, orgId?: string) {
    const payload = await request<unknown>(
      { method: "GET", url: `/domain/${domainId}/dns` },
      orgId
    );
    return toArray(payload).filter(isJsonObject) as DomainDnsRecord[];
  },

  /**
   * `POST /domain/{id}/verify` — long-polls the provider until VERIFIED/FAILED,
   * so it is explicitly bounded rather than left to hang.
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

  /* ── Provider-agnostic domain authentication ────────────────────────────── */

  /** `POST /domain` — register a sending domain. Returns the domain + `id`. */
  addSendingDomain(body: { domain: string; type?: string }, orgId?: string) {
    return request<SenderDomainRecord>(
      { method: "POST", url: "/domain", data: body },
      orgId
    );
  },

  /**
   * `POST /domain/{id}/provision` — provision the domain with the configured
   * email providers. Returns `providers[]`: `authenticating` → publish
   * `records[]` as CNAMEs, `skipped` → hide, `error` → show `reason`.
   */
  provisionDomain(domainId: string, orgId?: string) {
    return request<ProvisionDomainResponse>(
      { method: "POST", url: `/domain/${domainId}/provision` },
      orgId
    );
  },

  /**
   * Re-check the domain's DNS. Poll until `{ valid: true }`, after which the
   * domain can send. The route segment below is the backend's provider
   * namespace (the one place the concrete provider surfaces, like GoldRush's
   * URLs) — nothing above the wire depends on it.
   */
  validateDomain(domainId: string, orgId?: string) {
    return request<ValidateDomainResponse>(
      {
        method: "POST",
        url: `/domain/${domainId}/${DOMAIN_PROVIDER_SEGMENT}/validate`,
      },
      orgId
    );
  },
};
