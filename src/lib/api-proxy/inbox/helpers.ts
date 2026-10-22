import type { NextRequest } from "next/server";

import type { InboxFolder } from "@/server/inbox-state";

import { extractBearer, extractTokenFromCookie } from "../auth";

/** Parsing and send helpers for the local inbox routes. */

export const pickUserKey = (req: NextRequest): string => {
  const auth = extractBearer(req.headers.get("authorization"));
  if (auth) return `bearer:${auth.slice(0, 16)}`;
  const cookie = req.headers.get("cookie") ?? "";
  const token = extractTokenFromCookie(cookie);
  if (token) return `cookie:${token.slice(0, 16)}`;
  const sessionMatch =
    /(^|;\s*)(__Secure-)?better-auth\.session_token=([^;]+)/.exec(cookie) ??
    /(^|;\s*)(__Host-)?better-auth\.session_token=([^;]+)/.exec(cookie);
  const session = sessionMatch?.[3] ?? "";
  if (session) return `session:${decodeURIComponent(session).slice(0, 16)}`;
  return "session";
};

export const toBool = (raw: string | null): boolean | null => {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return null;
};

export const toInt = (raw: string | null, fallback: number): number => {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
};

export const clampInt = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export const toFolder = (raw: string | null): InboxFolder | null => {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  if (v === "INBOX" || v === "SENT" || v === "ARCHIVE" || v === "TRASH") {
    return v as InboxFolder;
  }
  return null;
};

export const sendEmailViaAcs = async (input: {
  fromEmail: string;
  to: string[];
  subject: string;
  content: string;
}) => {
  const conn = (process.env.AZURE_COMMUNICATION_CONNECTION_STRING ?? "").trim();
  const from = (
    process.env.AZURE_COMMUNICATION_EMAIL_FROM ?? input.fromEmail
  ).trim();
  if (conn.length === 0 || from.length === 0) return;

  try {
    const mod = (await import("@azure/communication-email")) as unknown as {
      EmailClient?: new (connectionString: string) => {
        beginSend: (message: unknown) => Promise<unknown>;
      };
    };
    if (!mod.EmailClient) return;
    const client = new mod.EmailClient(conn);
    const recipients = input.to.map((address) => ({ address }));
    await client.beginSend({
      senderAddress: from,
      content: {
        subject: input.subject,
        plainText: input.content,
        html: `<pre>${input.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
      },
      recipients: { to: recipients },
    });
  } catch (_e) {
    String(_e);
  }
};
