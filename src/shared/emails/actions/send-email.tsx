"use server";

import { cookies } from "next/headers";
import type { ReactElement } from "react";
import { render } from "react-email";

import { getBackendApiKey, getBackendBaseUrl } from "@/lib/backend";

import { EmailVerificationEmail, PasswordResetEmail } from "../templates";

const SEND_TIMEOUT_MS = 10000;

/**
 * Transactional sends go through the backend's `POST /email/send` (Azure
 * pipeline). That route is session-auth only, so the caller's cookies are
 * forwarded; `x-api-key` is rate-limit identification, not auth. DTO:
 * `{ to, subject, html, text?, from?, tags?, configurationSet? }` - unknown
 * fields are stripped. Omitting `from` uses the platform sender.
 */
async function sendTransactionalEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}) {
  const [html, text] = await Promise.all([
    render(react),
    render(react, { plainText: true }),
  ]);

  const cookieHeader = (await cookies()).toString();
  const apiKey = getBackendApiKey();
  const res = await fetch(`${getBackendBaseUrl()}/email/send`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: JSON.stringify({ to, subject, html, text }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Transactional email send failed (${res.status}): ${detail.slice(0, 300)}`
    );
  }
}

export async function sendResetPasswordEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  await sendTransactionalEmail({
    to,
    subject: "Reset your password 🔐",
    react: <PasswordResetEmail name={name} resetUrl={resetUrl} />,
  });
}

export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
}: {
  to: string;
  name?: string;
  verifyUrl: string;
}) {
  await sendTransactionalEmail({
    to,
    subject: "Verify your account ✅",
    react: <EmailVerificationEmail name={name} verifyUrl={verifyUrl} />,
  });
}
