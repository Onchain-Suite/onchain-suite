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
 * Typed passkey (WebAuthn) client against the better-auth passkey routes
 * exposed by the backend and proxied at `/api/v1/auth/passkey/*`:
 *
 * - GET  /passkey/generate-register-options
 * - POST /passkey/verify-registration        { response, name? }
 * - POST /passkey/generate-authenticate-options
 * - POST /passkey/verify-authentication      { response }
 * - GET  /passkey/list-user-passkeys
 * - POST /passkey/delete-passkey             { id }
 * - POST /passkey/update-passkey             { id, name }
 *
 * The installed better-auth client (1.4.x) does not ship `passkeyClient`
 * (it moved to the separate `@better-auth/passkey` package, which is not a
 * frontend dependency), so these flows are implemented with typed fetch
 * calls + `@simplewebauthn/browser` for the WebAuthn ceremony (it handles
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
  return `${window.location.origin}/api/v1/auth`;
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
    method?: "GET" | "POST";
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
  const payload = await fetchAuthJson("/passkey/list-user-passkeys", {
    signal,
    fallbackError: "Failed to load passkeys",
    // Some better-auth versions 404 when the user has no passkeys -
    // "none registered" is an empty list, not a failure.
    notFoundIsEmpty: true,
  });
  return normalizePasskeyList(payload);
};

export const registerPasskey = async (
  name: string
): Promise<PasskeyRecord | null> => {
  const options = (await fetchAuthJson("/passkey/generate-register-options", {
    fallbackError: "Failed to start passkey registration",
  })) as PublicKeyCredentialCreationOptionsJSON;

  let attestation: RegistrationResponseJSON;
  try {
    attestation = await startRegistration({ optionsJSON: options });
  } catch (error) {
    throw toFriendlyWebAuthnError(error);
  }

  const verified = await fetchAuthJson("/passkey/verify-registration", {
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
  await fetchAuthJson("/passkey/update-passkey", {
    method: "POST",
    body: { id, name },
    fallbackError: "Failed to rename passkey",
  });
};

export const deletePasskey = async (id: string): Promise<void> => {
  await fetchAuthJson("/passkey/delete-passkey", {
    method: "POST",
    body: { id },
    fallbackError: "Failed to delete passkey",
  });
};

/**
 * Full passkey sign-in ceremony. On success the backend sets the better-auth
 * session cookie (forwarded by the auth proxy), so the caller only needs to
 * redirect.
 */
export const signInWithPasskey = async (email?: string): Promise<void> => {
  const options = (await fetchAuthJson(
    "/passkey/generate-authenticate-options",
    {
      method: "POST",
      body: email ? { email } : {},
      fallbackError: "Failed to start passkey sign-in",
    }
  )) as PublicKeyCredentialRequestOptionsJSON;

  let assertion: AuthenticationResponseJSON;
  try {
    assertion = await startAuthentication({ optionsJSON: options });
  } catch (error) {
    throw toFriendlyWebAuthnError(error);
  }

  await fetchAuthJson("/passkey/verify-authentication", {
    method: "POST",
    body: { response: assertion },
    fallbackError: "Passkey sign-in failed",
  });
};
