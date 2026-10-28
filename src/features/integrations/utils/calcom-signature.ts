/**
 * Verify a Cal.com webhook signature.
 *
 * Cal signs each delivery with `X-Cal-Signature-256`: the hex HMAC-SHA256 of the
 * RAW request body, keyed by the webhook's secret. We must hash the exact bytes
 * Cal sent (never a re-serialized object), so the route reads `req.text()` and
 * passes it here verbatim. Comparison is constant-time.
 */
import { createHmac, timingSafeEqual } from "crypto";

export type CalcomSignatureResult =
  | { ok: true }
  | { ok: false; reason: "no-secret" | "no-signature" | "mismatch" };

/** Expected hex signature for a raw body under a secret. */
export function calcomSignature(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

/**
 * Fail closed: a missing secret or missing/mismatched header is a rejection, not
 * a pass. The caller maps every `ok: false` to a 401.
 */
export function verifyCalcomSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | undefined | null
): CalcomSignatureResult {
  if (!secret) return { ok: false, reason: "no-secret" };
  if (!signatureHeader) return { ok: false, reason: "no-signature" };

  const expected = calcomSignature(rawBody, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader.trim(), "utf8");
  // timingSafeEqual throws on length mismatch; guard first so a wrong-length
  // header is a plain mismatch, not a 500.
  if (a.length !== b.length) return { ok: false, reason: "mismatch" };
  return timingSafeEqual(a, b)
    ? { ok: true }
    : { ok: false, reason: "mismatch" };
}
