"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Client-side service for the backend's transactional email family
 * (`POST /email/send`, docs/backend.md - "Domain & Email"). That route is
 * session-auth only; the browser session cookie is forwarded automatically by
 * the `withCredentials` axios client, so no extra auth wiring is needed.
 *
 * Unlike campaign sends, `/email/send` does **not** resolve merge tags - it
 * expects already-rendered `html`/`text` and forwards them straight to the
 * Azure send queue. Callers that want per-recipient personalization must
 * render it before calling `send`.
 *
 * Send-time `from` resolution (backend): explicit `from` → org default sender
 * identity → most-recently-verified identity → platform fallback. Omitting
 * `from` is valid and uses the org default.
 */

export interface SendTransactionalEmailBody {
  /** A single recipient address. The endpoint queues one email per call. */
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Must belong to a verified domain owned by the caller/org when provided. */
  from?: string;
  tags?: string[];
  configurationSet?: string;
}

/** Bounded so a stuck send never hangs the compose UI. */
const SEND_TIMEOUT_MS = 15_000;

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

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
    const res = await apiClient.request<T>({
      timeout: SEND_TIMEOUT_MS,
      ...config,
      headers,
    });
    return (
      isJsonObject(res.data) && "data" in res.data ? res.data.data : res.data
    ) as T;
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
          : (err.message ?? "Email send failed");
    throw new Error(String(message), { cause: e });
  }
};

/** Escape a plaintext string for safe interpolation into HTML. */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Wrap a plaintext message body into a minimal, email-client-safe HTML
 * document. `/email/send` does not render markup for us, so we build both the
 * `html` and `text` payloads here from the user's plain message.
 */
export const buildEmailPayload = (
  plainMessage: string
): { html: string; text: string } => {
  const text = plainMessage.replace(/\r\n/g, "\n").trimEnd();
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => escapeHtml(block).replace(/\n/g, "<br />"))
    .filter((block) => block.length > 0)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;line-height:1.6;color:#111827;">${block}</p>`
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;background:#ffffff;">${
    paragraphs || '<p style="margin:0;"></p>'
  }</body></html>`;
  return { html, text };
};

export const emailService = {
  /** `POST /email/send` - queue a single transactional email. */
  send(body: SendTransactionalEmailBody, orgId?: string) {
    return request<
      { id?: string; messageId?: string } & Record<string, unknown>
    >({ method: "POST", url: "/email/send", data: body }, orgId);
  },
};
