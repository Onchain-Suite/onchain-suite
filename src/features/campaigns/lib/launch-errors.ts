import { isJsonObject } from "@/lib/utils";

/**
 * Launch refuses to send from an address whose domain isn't verified, and
 * returns `SENDER_NOT_VERIFIED` with the requested sender in `details`
 * instead of silently falling back to the platform address.
 *
 * NOTE: docs/backend.md in this repo has not been synced with that revision,
 * so the exact `details` key is not pinned down here. We read the usual
 * spellings rather than guessing one, and fall back to the domain alone when
 * that's all we get.
 */
export const SENDER_NOT_VERIFIED = "SENDER_NOT_VERIFIED";

export interface ApiErrorFields {
  code?: string;
  details?: unknown;
}

/** An Error carrying the backend's structured error fields. */
export type ApiError = Error & ApiErrorFields;

/** Attach `code`/`details` to an Error so callers can branch on them. */
export const withApiErrorFields = (
  error: Error,
  fields: ApiErrorFields
): ApiError => Object.assign(error, fields);

const readString = (source: unknown, keys: string[]): string => {
  if (!isJsonObject(source)) return "";
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

/** "no-reply@vault777.com" → "vault777.com"; a bare domain passes through. */
export const domainFromSender = (sender: string): string => {
  const trimmed = sender.trim();
  if (trimmed.length === 0) return "";
  const afterAt = trimmed.includes("@")
    ? (trimmed.split("@").pop() ?? "")
    : trimmed;
  return afterAt.trim().toLowerCase();
};

export interface SenderNotVerified {
  /** Full address when the backend gave one, else "". */
  sender: string;
  /** Domain to verify — the actionable part. */
  domain: string;
}

/**
 * Recognize a `SENDER_NOT_VERIFIED` failure and pull out the domain the user
 * has to verify. Returns null for every other error so callers fall through
 * to their generic handling.
 */
export const parseSenderNotVerified = (
  error: unknown
): SenderNotVerified | null => {
  if (!(error instanceof Error)) return null;
  const { code, details } = error as ApiError;
  if (code !== SENDER_NOT_VERIFIED) return null;

  const sender = readString(details, [
    "sender",
    "senderEmail",
    "requestedSender",
    "from",
    "fromEmail",
    "email",
    "address",
  ]);
  const domain =
    readString(details, ["domain", "senderDomain", "fromDomain"]) ||
    domainFromSender(sender);

  return { sender, domain };
};
