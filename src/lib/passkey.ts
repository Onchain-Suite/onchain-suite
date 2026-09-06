"use client";

import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

import { isJsonObject } from "@/lib/utils";

/**
 * Typed passkey (WebAuthn) client against our own passkey controller
 * (src/auth/passkey.controller.ts), served at `/api/v1/passkey/*`:
 *
 * - POST   /passkey/register/start                 -> creation options
 * - POST   /passkey/register/finish  { response, name? } -> passkey record
 * - POST   /passkey/login/start      { email? }    -> request options
 * - POST   /passkey/login/finish     <bare AuthenticationResponseJSON> -> session
 * - GET    /passkey/status                         -> { passkeys[], twoFactorEnabled, hasPassword }
 * - PATCH  /passkey/:id              { name }       -> renamed record
 * - DELETE /passkey/:id                             -> 200
 *
 * These are our custom routes (not better-auth's passkey plugin), driven with
 * typed fetch + `@simplewebauthn/browser` for the WebAuthn ceremony (it handles
 * base64url decoding of challenge/credential fields).
 */

export interface PasskeyRecord {
  id: string;
  name: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string | null;
}

const REQUEST_TIMEOUT_MS = 15_000;

const getAuthBaseUrl = (): string => {
  if (typeof window === "undefined") {
    throw new Error("Passkey operations are only available in the browser");
  }
  // The passkey controller lives at `/api/v1/passkey/*` (NOT under `/auth`):
  // AuthController's `@All('*path')` catch-all is mounted at `/auth` and would
  // otherwise swallow every `/auth/passkey/*` request into better-auth's 404.
  return `${window.location.origin}/api/v1`;
};

export const isWebAuthnSupported = (): boolean => {
  if (typeof window === "undefined") return false;
  return browserSupportsWebAuthn();
};

const extractErrorMessage = (payload: unknown, fallback: string): string => {
  if (!isJsonObject(payload)) return fallback;
  const candidates = [payload.message, payload.error, payload.statusText];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return fallback;
};

/** Unwraps an optional `{ success, data }` envelope; better-auth routes
 * usually return the payload directly, so this is defensive. */
const unwrapEnvelope = (payload: unknown): unknown => {
  if (isJsonObject(payload) && "success" in payload && "data" in payload) {
    return payload.data;
  }
  return payload;
};

const fetchAuthJson = async (
  path: string,
  init?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    signal?: AbortSignal;
    fallbackError?: string;
    /** Treat a 404 as "resource doesn't exist" (resolves to `null`) instead
     * of throwing - e.g. listing passkeys when none are registered. */
    notFoundIsEmpty?: boolean;
  }
): Promise<unknown> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );
  const onOuterAbort = () => controller.abort();
  init?.signal?.addEventListener("abort", onOuterAbort);

  try {
    const response = await fetch(`${getAuthBaseUrl()}${path}`, {
      method: init?.method ?? "GET",
      headers:
        init?.body !== undefined
          ? { "Content-Type": "application/json" }
          : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      signal: controller.signal,
    });

    const payload: unknown =
      response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
      if (init?.notFoundIsEmpty && response.status === 404) {
        return null;
      }
      throw new Error(
        extractErrorMessage(
          payload,
          init?.fallbackError ?? `Request failed (${response.status})`
        )
      );
    }

    return unwrapEnvelope(payload);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request timed out. Please try again.", {
        cause: error,
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    init?.signal?.removeEventListener("abort", onOuterAbort);
  }
};

const asOptionalString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const normalizePasskey = (value: unknown): PasskeyRecord | null => {
  if (!isJsonObject(value)) return null;
  const id = asOptionalString(value.id);
  if (!id) return null;
  return {
    id,
    name: asOptionalString(value.name),
    deviceType: asOptionalString(value.deviceType),
    backedUp: value.backedUp === true,
    createdAt: asOptionalString(value.createdAt),
  };
};

const normalizePasskeyList = (payload: unknown): PasskeyRecord[] => {
  const list = Array.isArray(payload)
    ? payload
    : isJsonObject(payload) && Array.isArray(payload.passkeys)
      ? payload.passkeys
      : [];
  return list
    .map(normalizePasskey)
    .filter((item): item is PasskeyRecord => item !== null);
};

/** Maps WebAuthn ceremony failures (user cancelled, timeout, duplicate
 * credential) to a friendly message; rethrows everything else. */
const toFriendlyWebAuthnError = (error: unknown): Error => {
  if (error instanceof Error) {
    if (error.name === "NotAllowedError") {
      return new Error("The passkey prompt was closed or timed out.");
    }
    if (error.name === "InvalidStateError") {
      return new Error(
        "A passkey for this account already exists on this device."
      );
    }
    return error;
  }
  return new Error("Passkey operation failed");
};

export const listPasskeys = async (
  signal?: AbortSignal
): Promise<PasskeyRecord[]> => {
  const payload = await fetchAuthJson("/passkey/status", {
    signal,
    fallbackError: "Failed to load passkeys",
    notFoundIsEmpty: true,
  });
  return normalizePasskeyList(payload);
};

export interface SecurityStatus {
  passkeys: PasskeyRecord[];
  twoFactorEnabled: boolean;
  /** False for OAuth-only accounts with no password set - better-auth's 2FA
   * enable() needs a password to confirm, so the UI gates on this. */
  hasPassword: boolean;
}

/** Reads the combined security status (passkeys + 2FA + whether a password is
 * set). Used to gate 2FA setup for OAuth-only accounts. */
export const getSecurityStatus = async (
  signal?: AbortSignal
): Promise<SecurityStatus> => {
  const payload = await fetchAuthJson("/passkey/status", {
    signal,
    fallbackError: "Failed to load security status",
    notFoundIsEmpty: true,
  });
  const root = isJsonObject(payload) ? payload : {};
  return {
    passkeys: normalizePasskeyList(payload),
    twoFactorEnabled: root.twoFactorEnabled === true,
    // Default true so we never wrongly block a real password user if the field
    // is absent (older backend); we only gate when it is explicitly false.
    hasPassword: root.hasPassword !== false,
  };
};

/**
 * Establishes a FIRST account password for an OAuth-only user (no current
 * password required — the session authorizes it). This is what lets a Google
 * user enable 2FA inline instead of being bounced to a separate screen: 2FA
 * enable confirms with a password, and an OAuth account has none until this
 * runs. Hits our own `POST /api/v1/auth/set-password`; the backend refuses
 * (409) if a password already exists.
 */
export const setAccountPassword = async (
  newPassword: string
): Promise<void> => {
  await fetchAuthJson("/auth/set-password", {
    method: "POST",
    body: { newPassword },
    fallbackError: "Failed to set password",
  });
};

export const registerPasskey = async (
  name: string
): Promise<PasskeyRecord | null> => {
  const options = (await fetchAuthJson("/passkey/register/start", {
    method: "POST",
    fallbackError: "Failed to start passkey registration",
  })) as PublicKeyCredentialCreationOptionsJSON;

  let attestation: RegistrationResponseJSON;
  try {
    attestation = await startRegistration({ optionsJSON: options });
  } catch (error) {
    throw toFriendlyWebAuthnError(error);
  }

  const verified = await fetchAuthJson("/passkey/register/finish", {
    method: "POST",
    body: { response: attestation, name: name.trim() || undefined },
    fallbackError: "Failed to verify passkey registration",
  });
  return normalizePasskey(verified);
};

export const renamePasskey = async (
  id: string,
  name: string
): Promise<void> => {
  await fetchAuthJson(`/passkey/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { name },
    fallbackError: "Failed to rename passkey",
  });
};

export const deletePasskey = async (id: string): Promise<void> => {
  await fetchAuthJson(`/passkey/${encodeURIComponent(id)}`, {
    method: "DELETE",
    fallbackError: "Failed to delete passkey",
  });
};

/**
 * Full passkey sign-in ceremony. On success the backend sets the better-auth
 * session cookie (forwarded by the auth proxy), so the caller only needs to
 * redirect.
 */
export const signInWithPasskey = async (email?: string): Promise<void> => {
  const options = (await fetchAuthJson("/passkey/login/start", {
    method: "POST",
    body: email ? { email } : {},
    fallbackError: "Failed to start passkey sign-in",
  })) as PublicKeyCredentialRequestOptionsJSON;

  let assertion: AuthenticationResponseJSON;
  try {
    assertion = await startAuthentication({ optionsJSON: options });
  } catch (error) {
    throw toFriendlyWebAuthnError(error);
  }

  // login/finish takes the bare AuthenticationResponseJSON (not { response }).
  await fetchAuthJson("/passkey/login/finish", {
    method: "POST",
    body: assertion,
    fallbackError: "Passkey sign-in failed",
  });
};
