"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Discord channel connection for a workspace (connect-existing / BYO bot).
 *
 * OWNER/ADMIN only (the backend enforces it). The bot token is never returned -
 * the server holds it and gives back a `fingerprint` plus the verified bot's
 * public info (username) so the customer can tell which bot is installed.
 *
 * `PUT /organization/connections/discord` verifies the token with Discord
 * (`GET /users/@me`) before responding, so a `200` can carry `verified: false`
 * (saved, but the token is bad) - a saved-but-not-working state, NOT a request
 * error. Unlike Telegram there is no activate/webhook step: broadcast posts to a
 * channel outbound-only, so connecting the bot token is the whole setup.
 */

const CONNECTOR = "discord";

export interface DiscordConnection {
  /** Non-secret bot info the API echoes back, e.g. `{ botUsername, botId }`. */
  config: Record<string, unknown>;
  /** Short hash of the installed token so it's identifiable without exposing it. */
  fingerprint: string;
  verified: boolean;
  verifiedAt: string | null;
  /** Verbatim Discord error when `verified` is false. */
  lastError: string | null;
  updatedAt: string;
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
          : (err.message ?? "Discord request failed");
    throw new Error(String(message), { cause: e });
  }
};

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asBool = (v: unknown): boolean => v === true;
const asNullableString = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

/** Coerce one raw connection summary into a typed `DiscordConnection`. */
const normalizeConnection = (raw: unknown): DiscordConnection | null => {
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

/** The connections list may be an array of summaries; find the discord one. */
const findDiscord = (payload: unknown): DiscordConnection | null => {
  const root = extractData<unknown>(payload);
  const arr = Array.isArray(root)
    ? root
    : isJsonObject(root) && Array.isArray(root.connections)
      ? root.connections
      : [];
  const match = arr.find((c) => isJsonObject(c) && c.connector === CONNECTOR);
  return match ? normalizeConnection(match) : null;
};

export const discordService = {
  /** `GET /organization/connections?kind=channel` - returns the discord one or null. */
  async getConnection(orgId?: string): Promise<DiscordConnection | null> {
    const payload = await request<unknown>(
      {
        method: "GET",
        url: "/organization/connections",
        params: { kind: "channel" },
      },
      orgId
    );
    return findDiscord(payload);
  },

  /** `PUT /organization/connections/discord`. 200 can carry verified:false. */
  async connect(botToken: string, orgId?: string): Promise<DiscordConnection> {
    const payload = await request<unknown>(
      {
        method: "PUT",
        url: "/organization/connections/discord",
        data: { botToken },
      },
      orgId
    );
    const normalized = normalizeConnection(extractData<unknown>(payload));
    if (!normalized) {
      throw new Error("Discord did not return a connection.");
    }
    return normalized;
  },

  /** `DELETE /organization/connections/discord`. */
  async disconnect(orgId?: string): Promise<void> {
    await request<unknown>(
      { method: "DELETE", url: "/organization/connections/discord" },
      orgId
    );
  },
};

/** Map a stored Discord error to a short, actionable line for the card. */
export function explainDiscordError(lastError: string | null): string | null {
  if (!lastError) return null;
  const rules: Array<[RegExp, string]> = [
    [/DISCORD_NOT_CONNECTED/i, "Connect the bot token first."],
    [
      /401|unauthorized|BOT token/i,
      "That bot token was rejected. Copy it from your app's Bot tab.",
    ],
    [
      /not a bot token/i,
      "Use the bot token, not the client secret or an OAuth token.",
    ],
    [
      /could not reach discord/i,
      "Couldn't reach Discord to verify. Try again in a moment.",
    ],
  ];
  const hit = rules.find(([re]) => re.test(lastError));
  return hit ? hit[1] : lastError;
}
