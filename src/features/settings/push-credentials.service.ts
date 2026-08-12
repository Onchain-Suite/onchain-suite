"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Mobile app push credentials (APNs / FCM) for a workspace.
 *
 * OWNER/ADMIN only (the backend enforces it; the UI hides the card for other
 * roles). No secret is ever returned - the server holds the key and gives back
 * a `fingerprint` so the customer can tell which key is installed.
 *
 * Both PUTs verify the credential with Apple/Google before responding, so a
 * `200` can carry `verified: false` (saved, but the credential is bad) - that
 * is a saved-but-not-working state, NOT a request error. Callers must branch on
 * `verified` and surface `lastError`.
 */

export type PushProvider = "apns" | "fcm";

/** Non-secret APNs config the API echoes back. */
export interface ApnsConfig {
  keyId: string;
  teamId: string;
  bundleId: string;
  sandbox: boolean;
}

/** Non-secret FCM config the API echoes back (extracted from the JSON). */
export interface FcmConfig {
  projectId?: string;
  clientEmail?: string;
}

export interface PushCredential {
  provider: PushProvider;
  config: (ApnsConfig | FcmConfig) & Record<string, unknown>;
  /** Short hash of the installed key so it's identifiable without exposing it. */
  fingerprint: string;
  verified: boolean;
  verifiedAt: string | null;
  /** Verbatim provider error when `verified` is false. */
  lastError: string | null;
  updatedAt: string;
}

export interface ApnsInput {
  /** The `.p8` file contents (read as text). */
  privateKey: string;
  keyId: string;
  teamId: string;
  bundleId: string;
  sandbox: boolean;
}

/** The parsed Firebase service-account JSON; the backend extracts what it needs. */
export type FcmInput = Record<string, unknown>;

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
          : (err.message ?? "Push credentials request failed");
    throw new Error(String(message), { cause: e });
  }
};

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asBool = (v: unknown): boolean => v === true;
const asNullableString = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

/** Coerce one raw credential object into a typed `PushCredential`. */
const normalizeCredential = (raw: unknown): PushCredential | null => {
  if (!isJsonObject(raw)) return null;
  const provider = raw.provider === "fcm" ? "fcm" : "apns";
  const config = isJsonObject(raw.config) ? raw.config : {};
  return {
    provider,
    config: config as PushCredential["config"],
    fingerprint: asString(raw.fingerprint),
    verified: asBool(raw.verified),
    verifiedAt: asNullableString(raw.verifiedAt),
    lastError: asNullableString(raw.lastError),
    updatedAt: asString(raw.updatedAt),
  };
};

/** GET / PUT responses may be `{ credentials: [...] }`, a bare array, or a
 *  single credential object - normalize all three to a list. */
const normalizeList = (payload: unknown): PushCredential[] => {
  const root = extractData<unknown>(payload);
  const arr = Array.isArray(root)
    ? root
    : isJsonObject(root) && Array.isArray(root.credentials)
      ? root.credentials
      : isJsonObject(root) && isJsonObject(root.credential)
        ? [root.credential]
        : isJsonObject(root) && typeof root.provider === "string"
          ? [root]
          : [];
  return arr
    .map((c) => normalizeCredential(c))
    .filter((c): c is PushCredential => c !== null);
};

export const pushCredentialsService = {
  /** `GET /organization/push-credentials` - OWNER/ADMIN. */
  async list(orgId?: string): Promise<PushCredential[]> {
    const payload = await request<unknown>(
      { method: "GET", url: "/organization/push-credentials" },
      orgId
    );
    return normalizeList(payload);
  },

  /** `PUT /organization/push-credentials/apns`. 200 can carry verified:false. */
  async updateApns(body: ApnsInput, orgId?: string): Promise<PushCredential> {
    const payload = await request<unknown>(
      { method: "PUT", url: "/organization/push-credentials/apns", data: body },
      orgId
    );
    const [cred] = normalizeList(payload);
    return (
      cred ?? {
        provider: "apns",
        config: {
          keyId: body.keyId,
          teamId: body.teamId,
          bundleId: body.bundleId,
          sandbox: body.sandbox,
        },
        fingerprint: "",
        verified: false,
        verifiedAt: null,
        lastError: null,
        updatedAt: "",
      }
    );
  },

  /** `PUT /organization/push-credentials/fcm`. Body is the service-account JSON. */
  async updateFcm(
    serviceAccount: FcmInput,
    orgId?: string
  ): Promise<PushCredential> {
    const payload = await request<unknown>(
      {
        method: "PUT",
        url: "/organization/push-credentials/fcm",
        data: serviceAccount,
      },
      orgId
    );
    const [cred] = normalizeList(payload);
    return (
      cred ?? {
        provider: "fcm",
        config: {
          projectId: asString(serviceAccount.project_id),
          clientEmail: asString(serviceAccount.client_email),
        },
        fingerprint: "",
        verified: false,
        verifiedAt: null,
        lastError: null,
        updatedAt: "",
      }
    );
  },

  /** `DELETE /organization/push-credentials/:provider`. */
  async remove(provider: PushProvider, orgId?: string): Promise<void> {
    await request<unknown>(
      { method: "DELETE", url: `/organization/push-credentials/${provider}` },
      orgId
    );
  },
};

/**
 * Provider error strings are opaque; pair the verbatim `lastError` with a
 * plain-language explanation of what the customer should actually do.
 */
export function explainPushError(lastError: string | null): string | null {
  if (!lastError) return null;
  const map: [RegExp, string][] = [
    [
      /InvalidProviderToken/i,
      "Apple rejected this key. Check the Key ID, or generate a new key.",
    ],
    [/TopicDisallowed/i, "This bundle ID doesn't belong to that team."],
    [/could not sign APNs token/i, "That doesn't look like a valid .p8 file."],
    [
      /PERMISSION_DENIED/i,
      "This service account can't reach that Firebase project.",
    ],
  ];
  for (const [re, msg] of map) {
    if (re.test(lastError)) return msg;
  }
  return null;
}
