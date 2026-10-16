"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Telegram channel connection for a workspace (connect-existing / BYO bot).
 *
 * OWNER/ADMIN only (the backend enforces it; the UI hides the card for other
 * roles). The bot token is never returned - the server holds it and gives back
 * a `fingerprint` plus the verified bot's public info (username) so the customer
 * can tell which bot is installed.
 *
 * `PUT /organization/connections/telegram` verifies the token with Telegram
 * (getMe) before responding, so a `200` can carry `verified: false` (saved, but
 * the token is bad) - a saved-but-not-working state, NOT a request error.
 * Callers branch on `verified` and surface `lastError`.
 */

const CONNECTOR = "telegram";

export interface TelegramConnection {
  /** Non-secret bot info the API echoes back, e.g. `{ username, botId }`. */
  config: Record<string, unknown>;
  /** Short hash of the installed token so it's identifiable without exposing it. */
  fingerprint: string;
  verified: boolean;
  verifiedAt: string | null;
  /** Verbatim Telegram error when `verified` is false. */
  lastError: string | null;
  updatedAt: string;
}

export interface TelegramOptInLink {
  url: string;
  payload: string;
  expiresInSeconds: number;
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
          : (err.message ?? "Telegram request failed");
    throw new Error(String(message), { cause: e });
  }
};

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asBool = (v: unknown): boolean => v === true;
const asNullableString = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

/** Coerce one raw connection summary into a typed `TelegramConnection`. */
const normalizeConnection = (raw: unknown): TelegramConnection | null => {
  if (!isJsonObject(raw)) return null;
  return {
    config: isJsonObject(raw.config) ? raw.config : {},
    fingerprint: asString(raw.fingerprint),
    verified: asBool(raw.verified),
    verifiedAt: asNullableString(raw.verifiedAt),
    lastError: asNullableString(raw.lastError),
    updatedAt: asString(raw.updatedAt),
  };
};

/** The connections list may be an array of summaries; find the telegram one. */
const findTelegram = (payload: unknown): TelegramConnection | null => {
  const root = extractData<unknown>(payload);
  const arr = Array.isArray(root)
    ? root
    : isJsonObject(root) && Array.isArray(root.connections)
      ? root.connections
      : [];
  const match = arr.find((c) => isJsonObject(c) && c.connector === CONNECTOR);
  return match ? normalizeConnection(match) : null;
};

export const telegramService = {
  /** `GET /organization/connections?kind=channel` - returns the telegram one or null. */
  async getConnection(orgId?: string): Promise<TelegramConnection | null> {
    const payload = await request<unknown>(
      {
        method: "GET",
        url: "/organization/connections",
        params: { kind: "channel" },
      },
      orgId
    );
    return findTelegram(payload);
  },

  /** `PUT /organization/connections/telegram`. 200 can carry verified:false. */
  async connect(botToken: string, orgId?: string): Promise<TelegramConnection> {
    const payload = await request<unknown>(
      {
        method: "PUT",
        url: "/organization/connections/telegram",
        data: { botToken },
      },
      orgId
    );
    return (
      normalizeConnection(extractData<unknown>(payload)) ?? {
        config: {},
        fingerprint: "",
        verified: false,
        verifiedAt: null,
        lastError: null,
        updatedAt: "",
      }
    );
  },

  /**
   * `POST /organization/connections/telegram/activate` - point the connected
   * bot at our webhook so its `/start` opt-ins reach us. Idempotent.
   */
  async activate(orgId?: string): Promise<{ url: string }> {
    const payload = await request<unknown>(
      { method: "POST", url: "/organization/connections/telegram/activate" },
      orgId
    );
    const data = extractData<unknown>(payload);
    return { url: isJsonObject(data) ? asString(data.url) : "" };
  },

  /** `POST /organization/connections/telegram/opt-in-link` - mint a wallet deep link. */
  async createOptInLink(
    walletAddress: string,
    orgId?: string
  ): Promise<TelegramOptInLink> {
    const payload = await request<unknown>(
      {
        method: "POST",
        url: "/organization/connections/telegram/opt-in-link",
        data: { walletAddress },
      },
      orgId
    );
    const data = extractData<unknown>(payload);
    return {
      url: isJsonObject(data) ? asString(data.url) : "",
      payload: isJsonObject(data) ? asString(data.payload) : "",
      expiresInSeconds:
        isJsonObject(data) && typeof data.expiresInSeconds === "number"
          ? data.expiresInSeconds
          : 0,
    };
  },

  /** `DELETE /organization/connections/telegram`. */
  async disconnect(orgId?: string): Promise<void> {
    await request<unknown>(
      { method: "DELETE", url: "/organization/connections/telegram" },
      orgId
    );
  },
};

/** Map an opaque Telegram error to plain-language guidance. */
export function explainTelegramError(lastError: string | null): string | null {
  if (!lastError) return null;
  const map: [RegExp, string][] = [
    [
      /unauthorized|401|invalid token/i,
      "Telegram rejected this token. Copy it again from @BotFather.",
    ],
    [
      /not found|404/i,
      "That bot doesn't exist. Check the token from @BotFather.",
    ],
    [/TELEGRAM_NOT_CONNECTED/i, "Connect the bot token first, then activate."],
  ];
  for (const [re, msg] of map) {
    if (re.test(lastError)) return msg;
  }
  return null;
}
