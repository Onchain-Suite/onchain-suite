"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Developer API credentials for a workspace: server-side secret keys
 * (`sk_live_…` / `sk_test_…`) and outbound webhook endpoints.
 *
 * Two things the UI must not get wrong (docs/backend.md 5124-5270,
 * notes/product/developer-credentials-reference.md):
 *
 *  1. Secrets are returned EXACTLY ONCE. `POST /developer/keys` (and `roll`)
 *     return `token`; `POST /developer/webhooks` returns `secret`. Every later
 *     read is masked (`prefix`, `secretHint`). The create/roll flows must reveal
 *     the value before it is gone.
 *  2. Drive key-row state off `status` (`active` | `expiring` | `revoked`), NOT
 *     off `revokedAt` being truthy. A rolled key carries a FUTURE `revokedAt`
 *     and is still serving traffic until then; greying it out on any truthy
 *     `revokedAt` tells the customer their live key is dead while it works.
 */

export type KeyEnvironment = "live" | "test";
export type KeyScope = "read_write" | "read_only";
export type KeyStatus = "active" | "expiring" | "revoked";

/** A secret key as returned by list/create/roll (masked apart from `prefix`). */
export interface DeveloperKey {
  id: string;
  name: string;
  /** Masked leading segment shown after creation, e.g. `sk_live_a1b2…`. */
  prefix: string;
  environment: KeyEnvironment;
  scope: KeyScope;
  status: KeyStatus;
  /** Stamped on every successful call - null means the key was never used. */
  lastUsedAt: string | null;
  /**
   * Expiry INSTANT, not a boolean. A rolled key carries a future value and is
   * still accepting traffic until then. Never gate row state on this - use
   * `status`. Kept so the UI can surface the deadline.
   */
  revokedAt: string | null;
  createdAt: string | null;
}

export interface CreateKeyInput {
  environment: KeyEnvironment;
  name?: string;
  scope?: KeyScope;
}

/** Create/roll response: the row plus the full `token`, returned once. */
export interface DeveloperKeyWithToken extends DeveloperKey {
  token: string;
  /** Roll only: the key being retired and when it stops working. */
  replaced?: { id: string; expiresAt: string | null };
}

export interface RollKeyInput {
  /** 0 kills the outgoing key now (leak); 24-168 keeps it working (rotation). */
  expireInHours: number;
}

export type WebhookStatus = "active" | "paused" | "failing";

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  /** Masked signing secret, e.g. `whsec_••••1234`. */
  secretHint: string | null;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: string | null;
  failureCount: number;
  createdAt: string | null;
}

export interface CreateWebhookInput {
  url: string;
  events: string[];
}

/** Create response: the row plus the full `whsec_…` secret, returned once. */
export interface WebhookEndpointWithSecret extends WebhookEndpoint {
  secret: string;
}

export interface UpdateWebhookInput {
  status?: WebhookStatus;
  events?: string[];
}

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const extractData = <T>(payload: unknown): T => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

/**
 * Structured error carrying the backend `code` (e.g. `KEY_ALREADY_REVOKED`) so
 * callers can branch instead of string-matching a message.
 */
export class DeveloperApiError extends Error {
  readonly code?: string;
  readonly status?: number;
  constructor(
    message: string,
    opts?: { code?: string; status?: number; cause?: unknown }
  ) {
    super(message, opts?.cause ? { cause: opts.cause } : undefined);
    this.name = "DeveloperApiError";
    this.code = opts?.code;
    this.status = opts?.status;
  }
}

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
        : typeof data === "string"
          ? data
          : (err.message ?? "Developer API request failed");
    const code =
      isJsonObject(nestedError) && typeof nestedError.code === "string"
        ? nestedError.code
        : isJsonObject(data) && typeof data.code === "string"
          ? data.code
          : undefined;
    throw new DeveloperApiError(String(message), { code, status, cause: e });
  }
};

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asNullableString = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const asNumber = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const KEY_ENVIRONMENTS = new Set<KeyEnvironment>(["live", "test"]);
const KEY_SCOPES = new Set<KeyScope>(["read_write", "read_only"]);
const KEY_STATUSES = new Set<KeyStatus>(["active", "expiring", "revoked"]);
const WEBHOOK_STATUSES = new Set<WebhookStatus>([
  "active",
  "paused",
  "failing",
]);

/** Environment can arrive as `live`/`test` or embedded in a `prefix`. */
const toEnvironment = (raw: Record<string, unknown>): KeyEnvironment => {
  const v = raw.environment;
  if (typeof v === "string" && KEY_ENVIRONMENTS.has(v as KeyEnvironment)) {
    return v as KeyEnvironment;
  }
  const prefix = asString(raw.prefix);
  if (/^sk_test/i.test(prefix)) return "test";
  return "live";
};

const toScope = (v: unknown): KeyScope =>
  typeof v === "string" && KEY_SCOPES.has(v as KeyScope)
    ? (v as KeyScope)
    : "read_write";

/**
 * Derive the display status. Prefer the explicit `status` field; only if it is
 * missing fall back to inferring from `revokedAt` (past = revoked, future =
 * expiring). Defaults to `active` so a key with no signals is not greyed out.
 */
const toKeyStatus = (raw: Record<string, unknown>): KeyStatus => {
  const v = raw.status;
  if (typeof v === "string" && KEY_STATUSES.has(v as KeyStatus)) {
    return v as KeyStatus;
  }
  const revokedAt = asNullableString(raw.revokedAt);
  if (revokedAt) {
    const t = Date.parse(revokedAt);
    if (Number.isFinite(t)) return t <= Date.now() ? "revoked" : "expiring";
  }
  return "active";
};

const normalizeKey = (raw: unknown): DeveloperKey | null => {
  if (!isJsonObject(raw)) return null;
  const id = asString(raw.id);
  if (id.length === 0) return null;
  return {
    id,
    name: asString(raw.name),
    prefix: asString(raw.prefix),
    environment: toEnvironment(raw),
    scope: toScope(raw.scope),
    status: toKeyStatus(raw),
    lastUsedAt: asNullableString(raw.lastUsedAt),
    revokedAt: asNullableString(raw.revokedAt),
    createdAt: asNullableString(raw.createdAt),
  };
};

const normalizeKeyWithToken = (raw: unknown): DeveloperKeyWithToken => {
  const base = normalizeKey(raw);
  const obj = isJsonObject(raw) ? raw : {};
  const replacedRaw = isJsonObject(obj.replaced) ? obj.replaced : undefined;
  return {
    ...(base ?? {
      id: asString(obj.id),
      name: asString(obj.name),
      prefix: asString(obj.prefix),
      environment: toEnvironment(obj),
      scope: toScope(obj.scope),
      status: toKeyStatus(obj),
      lastUsedAt: asNullableString(obj.lastUsedAt),
      revokedAt: asNullableString(obj.revokedAt),
      createdAt: asNullableString(obj.createdAt),
    }),
    token: asString(obj.token),
    ...(replacedRaw
      ? {
          replaced: {
            id: asString(replacedRaw.id),
            expiresAt: asNullableString(replacedRaw.expiresAt),
          },
        }
      : {}),
  };
};

const toWebhookStatus = (v: unknown): WebhookStatus =>
  typeof v === "string" && WEBHOOK_STATUSES.has(v as WebhookStatus)
    ? (v as WebhookStatus)
    : "active";

const normalizeWebhook = (raw: unknown): WebhookEndpoint | null => {
  if (!isJsonObject(raw)) return null;
  const id = asString(raw.id);
  if (id.length === 0) return null;
  return {
    id,
    url: asString(raw.url),
    events: asStringArray(raw.events),
    status: toWebhookStatus(raw.status),
    secretHint: asNullableString(raw.secretHint),
    lastDeliveryAt: asNullableString(raw.lastDeliveryAt),
    lastDeliveryStatus: asNullableString(raw.lastDeliveryStatus),
    failureCount: asNumber(raw.failureCount),
    createdAt: asNullableString(raw.createdAt),
  };
};

/** Read a list out of `[…]`, `{ items: […] }`, `{ data: […] }` or `{ keys/webhooks: […] }`. */
const extractArray = (payload: unknown, key: string): unknown[] => {
  const root = extractData<unknown>(payload);
  if (Array.isArray(root)) return root;
  if (isJsonObject(root)) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
    if (Array.isArray(root.items)) return root.items;
    if (Array.isArray(root.data)) return root.data;
  }
  return [];
};

export const developerService = {
  // ---- Secret keys -------------------------------------------------------

  /** `GET /developer/keys`. */
  async listKeys(orgId?: string): Promise<DeveloperKey[]> {
    const payload = await request<unknown>(
      { method: "GET", url: "/developer/keys" },
      orgId
    );
    return extractArray(payload, "keys")
      .map(normalizeKey)
      .filter((k): k is DeveloperKey => k !== null);
  },

  /**
   * `POST /developer/keys`. `environment` is REQUIRED (a body of just
   * `{ name, scope }` is a 400). Response carries the full `token`, once.
   */
  async createKey(
    input: CreateKeyInput,
    orgId?: string
  ): Promise<DeveloperKeyWithToken> {
    const body: Record<string, unknown> = { environment: input.environment };
    if (input.name && input.name.trim().length > 0)
      body.name = input.name.trim();
    if (input.scope) body.scope = input.scope;
    const payload = await request<unknown>(
      { method: "POST", url: "/developer/keys", data: body },
      orgId
    );
    return normalizeKeyWithToken(payload);
  },

  /**
   * `POST /developer/keys/{keyId}/roll`. Issues a replacement (inheriting name,
   * scope and environment) and expires this one after `expireInHours` (0-168;
   * 0 = immediately). Returns the new row + `token` once + `replaced`.
   */
  async rollKey(
    keyId: string,
    input: RollKeyInput,
    orgId?: string
  ): Promise<DeveloperKeyWithToken> {
    const expireInHours = Math.min(
      168,
      Math.max(0, Math.round(input.expireInHours))
    );
    const payload = await request<unknown>(
      {
        method: "POST",
        url: `/developer/keys/${keyId}/roll`,
        data: { expireInHours },
      },
      orgId
    );
    return normalizeKeyWithToken(payload);
  },

  /** `DELETE /developer/keys/{keyId}` - revoke (brings a rolled expiry to now). */
  async revokeKey(keyId: string, orgId?: string): Promise<void> {
    await request<unknown>(
      { method: "DELETE", url: `/developer/keys/${keyId}` },
      orgId
    );
  },

  // ---- Webhooks ----------------------------------------------------------

  /** `GET /developer/webhooks/events` - the subscribable topic catalog. */
  async listWebhookEvents(orgId?: string): Promise<string[]> {
    const payload = await request<unknown>(
      { method: "GET", url: "/developer/webhooks/events" },
      orgId
    );
    const root = extractData<unknown>(payload);
    if (isJsonObject(root) && Array.isArray(root.events)) {
      return asStringArray(root.events);
    }
    return asStringArray(root);
  },

  /** `GET /developer/webhooks`. */
  async listWebhooks(orgId?: string): Promise<WebhookEndpoint[]> {
    const payload = await request<unknown>(
      { method: "GET", url: "/developer/webhooks" },
      orgId
    );
    return extractArray(payload, "webhooks")
      .map(normalizeWebhook)
      .filter((w): w is WebhookEndpoint => w !== null);
  },

  /**
   * `POST /developer/webhooks`. `url` must be https and at least one valid topic
   * is required (else 400). Response carries the full `whsec_…` secret, once.
   */
  async createWebhook(
    input: CreateWebhookInput,
    orgId?: string
  ): Promise<WebhookEndpointWithSecret> {
    const payload = await request<unknown>(
      {
        method: "POST",
        url: "/developer/webhooks",
        data: { url: input.url, events: input.events },
      },
      orgId
    );
    const obj = isJsonObject(extractData<unknown>(payload))
      ? extractData<Record<string, unknown>>(payload)
      : {};
    const base = normalizeWebhook(obj);
    return {
      ...(base ?? {
        id: asString(obj.id),
        url: asString(obj.url) || input.url,
        events: asStringArray(obj.events),
        status: toWebhookStatus(obj.status),
        secretHint: asNullableString(obj.secretHint),
        lastDeliveryAt: asNullableString(obj.lastDeliveryAt),
        lastDeliveryStatus: asNullableString(obj.lastDeliveryStatus),
        failureCount: asNumber(obj.failureCount),
        createdAt: asNullableString(obj.createdAt),
      }),
      secret: asString(obj.secret),
    };
  },

  /**
   * `PATCH /developer/webhooks/{id}` - pause/resume or change topics. Setting
   * `status: "active"` clears the failure streak.
   */
  async updateWebhook(
    id: string,
    input: UpdateWebhookInput,
    orgId?: string
  ): Promise<WebhookEndpoint | null> {
    const payload = await request<unknown>(
      { method: "PATCH", url: `/developer/webhooks/${id}`, data: input },
      orgId
    );
    return normalizeWebhook(extractData<unknown>(payload));
  },

  /** `POST /developer/webhooks/{id}/test` - signed `ping` down the real path. */
  async testWebhook(id: string, orgId?: string): Promise<void> {
    await request<unknown>(
      { method: "POST", url: `/developer/webhooks/${id}/test` },
      orgId
    );
  },

  /** `DELETE /developer/webhooks/{id}`. */
  async deleteWebhook(id: string, orgId?: string): Promise<void> {
    await request<unknown>(
      { method: "DELETE", url: `/developer/webhooks/${id}` },
      orgId
    );
  },
};
