"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { API_BASE_URL, apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type {
  AvailableSmsNumber,
  ConnectionCredentials,
  ConnectionKind,
  ConnectionSummary,
  ConsentImportResult,
  DataSyncResult,
  DiscordImportResult,
  EventsCatalog,
  IdentitySyncResult,
  IterableJob,
  IterableJobStatus,
  MigrationResult,
  SmsA2pStatus,
  SmsA2pSubmission,
  SmsManagedSetup,
  SmsManagedStatus,
  SmsNumberType,
  SmsOptInLink,
  SmsWebhookSetup,
  WhatsAppWebhookSetup,
} from "./contracts/connections";
import {
  toAvailableSmsNumbers,
  toConnection,
  toConnectionList,
  toConsentImport,
  toDataSync,
  toDiscordImport,
  toEventsCatalog,
  toIdentitySync,
  toIterableJob,
  toIterableStatus,
  toMigrationResult,
  toSmsA2pStatus,
  toSmsManagedSetup,
  toSmsManagedStatus,
  toSmsOptInLink,
  toSmsSetup,
  toWhatsAppSetup,
} from "./utils/normalize-connections";

export type * from "./contracts/connections";

/**
 * Connections and integrations (staging-only backend, 2026-10-22): save and
 * verify a connector's credential, then sync, migrate or opt people in.
 * OWNER/ADMIN only; the UI gates on role so these never 403 in normal use.
 *
 * A `PUT` answers 200 even when the provider rejected the credential; callers
 * branch on `verified`. A 404 means this server does not have the route yet,
 * which surfaces as `code: "NOT_DEPLOYED"`.
 */

/** Paged migrations do up to 50 provider pages per call. */
const LONG_TIMEOUT_MS = 120_000;

export class ConnectionsError extends Error {
  readonly code: string;
  readonly status: number | null;
  constructor(message: string, code: string, status: number | null) {
    super(message);
    this.name = "ConnectionsError";
    this.code = code;
    this.status = status;
  }
}

export const NOT_DEPLOYED_MESSAGE =
  "This isn't available on this server yet. It is live on staging.";

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const unwrap = (payload: unknown): unknown =>
  isJsonObject(payload) && "data" in payload ? payload.data : payload;

function toError(e: unknown): ConnectionsError {
  const err = e as AxiosError<unknown>;
  if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
    return new ConnectionsError("Stopped.", "CANCELED", null);
  }
  const status = err?.response?.status ?? null;
  if (status === 404) {
    return new ConnectionsError(NOT_DEPLOYED_MESSAGE, "NOT_DEPLOYED", 404);
  }
  const data = err?.response?.data;
  const nested =
    isJsonObject(data) && isJsonObject(data.error) ? data.error : {};
  const rawMessage =
    nested.message ?? (isJsonObject(data) ? data.message : undefined);
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(" ")
    : typeof rawMessage === "string" && rawMessage
      ? rawMessage
      : err?.code === "ECONNABORTED"
        ? "The request timed out."
        : (err?.message ?? "Request failed.");
  const code = typeof nested.code === "string" ? nested.code : "REQUEST_FAILED";
  return new ConnectionsError(message, code, status);
}

async function request(
  config: AxiosRequestConfig,
  orgId?: string
): Promise<unknown> {
  const resolved = pickOrgId(orgId);
  try {
    const res = await apiClient.request<unknown>({
      ...config,
      headers: {
        ...(config.headers ?? {}),
        ...(resolved ? { "x-org-id": resolved } : {}),
        "x-onchain-silent-error": "1",
      },
    });
    return unwrap(res.data);
  } catch (e) {
    throw toError(e);
  }
}

const integration = (path: string) => `/organization/integrations/${path}`;

export const connectionsService = {
  async list(kind?: ConnectionKind, orgId?: string) {
    const data = await request(
      {
        method: "GET",
        url: "/organization/connections",
        ...(kind ? { params: { kind } } : {}),
      },
      orgId
    );
    return toConnectionList(data);
  },

  async save(
    connector: string,
    credentials: ConnectionCredentials,
    orgId?: string
  ): Promise<ConnectionSummary> {
    const data = await request(
      {
        method: "PUT",
        url: `/organization/connections/${connector}`,
        data: credentials,
      },
      orgId
    );
    const conn = toConnection(data);
    if (!conn) {
      throw new ConnectionsError(
        "The server did not return the connection.",
        "BAD_RESPONSE",
        200
      );
    }
    return conn;
  },

  async remove(connector: string, orgId?: string): Promise<void> {
    await request(
      { method: "DELETE", url: `/organization/connections/${connector}` },
      orgId
    );
  },

  async syncIdentity(
    connector: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
    orgId?: string
  ): Promise<IdentitySyncResult> {
    const data = await request(
      {
        method: "POST",
        url: integration(`${connector}/sync`),
        data: body,
        signal,
        timeout: LONG_TIMEOUT_MS,
      },
      orgId
    );
    return toIdentitySync(data);
  },

  async syncData(
    route: string,
    signal?: AbortSignal,
    orgId?: string
  ): Promise<DataSyncResult> {
    const data = await request(
      {
        method: "POST",
        url: integration(`${route}/sync`),
        signal,
        timeout: LONG_TIMEOUT_MS,
      },
      orgId
    );
    return toDataSync(data);
  },

  async migrate(
    connector: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
    orgId?: string
  ): Promise<MigrationResult> {
    const data = await request(
      {
        method: "POST",
        url: integration(`${connector}/migrate`),
        data: body,
        signal,
        timeout: LONG_TIMEOUT_MS,
      },
      orgId
    );
    return toMigrationResult(data);
  },

  async startIterable(orgId?: string): Promise<IterableJob> {
    const data = await request(
      { method: "POST", url: integration("iterable/migrate") },
      orgId
    );
    return toIterableJob(data);
  },

  async iterableStatus(
    jobId: string,
    signal?: AbortSignal,
    orgId?: string
  ): Promise<IterableJobStatus> {
    const data = await request(
      {
        method: "GET",
        url: integration(`iterable/migrate/${encodeURIComponent(jobId)}`),
        signal,
      },
      orgId
    );
    return toIterableStatus(data);
  },

  /**
   * OAuth has to be a top-level navigation (the backend answers with a 302 to
   * the provider). The proxy turns `orgId` into the `x-org-id` header, since a
   * navigation cannot carry one.
   */
  oauthAuthorizeUrl(connector: string, orgId?: string): string {
    const resolved = pickOrgId(orgId);
    const qs = resolved ? `?orgId=${encodeURIComponent(resolved)}` : "";
    return `${API_BASE_URL}${integration(`oauth/${connector}/authorize`)}${qs}`;
  },

  async whatsappWebhookSetup(orgId?: string): Promise<WhatsAppWebhookSetup> {
    const data = await request(
      {
        method: "GET",
        url: "/organization/connections/whatsapp/webhook-setup",
      },
      orgId
    );
    return toWhatsAppSetup(data);
  },

  async smsWebhookSetup(orgId?: string): Promise<SmsWebhookSetup> {
    const data = await request(
      {
        method: "GET",
        url: "/organization/connections/sms/webhook-setup",
      },
      orgId
    );
    return toSmsSetup(data);
  },

  async smsOptInLink(
    walletAddress: string,
    orgId?: string
  ): Promise<SmsOptInLink> {
    const data = await request(
      {
        method: "POST",
        url: "/organization/connections/sms/opt-in-link",
        data: { walletAddress },
      },
      orgId
    );
    return toSmsOptInLink(data);
  },

  async smsA2pStatus(orgId?: string): Promise<SmsA2pStatus> {
    const data = await request(
      { method: "GET", url: "/organization/connections/sms/a2p" },
      orgId
    );
    return toSmsA2pStatus(data);
  },

  async smsA2pSubmit(
    body: SmsA2pSubmission,
    orgId?: string
  ): Promise<SmsA2pStatus> {
    const data = await request(
      { method: "POST", url: "/organization/connections/sms/a2p", data: body },
      orgId
    );
    return toSmsA2pStatus(data);
  },

  async smsA2pRefresh(orgId?: string): Promise<SmsA2pStatus> {
    const data = await request(
      { method: "POST", url: "/organization/connections/sms/a2p/refresh" },
      orgId
    );
    return toSmsA2pStatus(data);
  },

  async smsManagedStatus(orgId?: string): Promise<SmsManagedStatus> {
    const data = await request(
      { method: "GET", url: "/organization/connections/sms/managed" },
      orgId
    );
    return toSmsManagedStatus(data);
  },

  async smsManagedNumbers(
    query: { country: string; type: SmsNumberType; areaCode?: string },
    orgId?: string
  ): Promise<AvailableSmsNumber[]> {
    const data = await request(
      {
        method: "GET",
        url: "/organization/connections/sms/managed/numbers",
        params: {
          country: query.country,
          type: query.type,
          ...(query.areaCode ? { areaCode: query.areaCode } : {}),
        },
      },
      orgId
    );
    return toAvailableSmsNumbers(data);
  },

  async smsManagedSetUp(
    phoneNumber: string,
    orgId?: string
  ): Promise<SmsManagedSetup> {
    const data = await request(
      {
        method: "POST",
        url: "/organization/connections/sms/managed",
        data: { phoneNumber },
      },
      orgId
    );
    return toSmsManagedSetup(data);
  },

  async consentImport(
    channel: "sms" | "whatsapp",
    body: {
      consentText: string;
      source: string;
      defaultCountry?: string;
      rows: Array<Record<string, string>>;
    },
    signal?: AbortSignal,
    orgId?: string
  ): Promise<ConsentImportResult> {
    const data = await request(
      {
        method: "POST",
        url: `/organization/consents/${channel}/import`,
        data: body,
        signal,
      },
      orgId
    );
    return toConsentImport(data);
  },

  async discordImportMembers(
    body: { guildId?: string; cursor?: string },
    signal?: AbortSignal,
    orgId?: string
  ): Promise<DiscordImportResult> {
    const data = await request(
      {
        method: "POST",
        url: integration("discord/import-members"),
        data: body,
        signal,
        timeout: LONG_TIMEOUT_MS,
      },
      orgId
    );
    return toDiscordImport(data);
  },

  async eventsCatalog(orgId?: string): Promise<EventsCatalog> {
    const data = await request(
      { method: "GET", url: "/events/catalog" },
      orgId
    );
    return toEventsCatalog(data);
  },
};
