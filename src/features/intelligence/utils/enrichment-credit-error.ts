/**
 * Reads an enrichment failure into the one thing the UI has to decide: is this
 * a credits problem, and which one.
 *
 * `intelligenceService` throws `new Error(message, { cause: axiosError })`, so
 * the thrown message is only the backend's human text. The backend's `code`
 * lives on the cause, in the global error envelope:
 *
 *   402 { success: false, error: { code, message, details: { code, message,
 *         wallets, creditsUpTo, meter } } }
 *
 * The old handler matched "402" in the message, which never appeared there, so
 * a refresh refused for credits read as a bare backend sentence with no way
 * forward. This reads the status and code from the cause instead.
 *
 * Pure so it is unit-tested without rendering.
 */

export const ONCHAIN_CREDITS_EXHAUSTED_MESSAGE =
  "Out of Onchain credits - top up the usage wallet or upgrade in Settings → Billing.";

export type EnrichmentCreditError =
  /**
   * 402 REFRESH_EXCEEDS_CREDITS: the refresh could cost more than is left. The
   * backend's message carries the numbers; `allowPartial` runs what fits.
   */
  | {
      kind: "refresh-exceeds-credits";
      message: string;
      wallets: number | null;
      creditsUpTo: number | null;
    }
  /** 402 CREDITS_EXCEEDED: the allowance is spent and the wallet is empty. */
  | { kind: "credits-exhausted"; message: string }
  | { kind: "other"; message: string };

type Rec = Record<string, unknown>;

const isRecord = (value: unknown): value is Rec =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** The HTTP status and response body behind a thrown error, if it has one. */
const responseOf = (error: unknown): { status?: number; data?: unknown } => {
  const fromCause = isRecord(error) ? error.cause : undefined;
  for (const candidate of [fromCause, error]) {
    if (isRecord(candidate) && isRecord(candidate.response)) {
      const { status } = candidate.response;
      return {
        status: typeof status === "number" ? status : undefined,
        data: candidate.response.data,
      };
    }
  }
  return {};
};

export function classifyEnrichmentError(
  error: unknown,
  fallbackMessage = "Failed to start enrichment"
): EnrichmentCreditError {
  const thrown = error instanceof Error ? str(error.message) : undefined;
  const { status, data } = responseOf(error);
  const body = isRecord(data) ? data : {};
  const envelope = isRecord(body.error) ? body.error : body;
  const details = isRecord(envelope.details) ? envelope.details : {};
  const code = (str(envelope.code) ?? str(details.code) ?? "").toUpperCase();
  const message =
    str(envelope.message) ?? str(details.message) ?? thrown ?? fallbackMessage;

  if (code === "REFRESH_EXCEEDS_CREDITS") {
    return {
      kind: "refresh-exceeds-credits",
      message,
      wallets: num(details.wallets),
      creditsUpTo: num(details.creditsUpTo),
    };
  }

  // CREDITS_EXCEEDED, or a 402 with no code we know: either way the request was
  // refused for on-chain credits, and the copy names the meter. AI credits are
  // a separate meter with their own copy, so their code is left alone.
  if (
    code === "CREDITS_EXCEEDED" ||
    (status === 402 && !code.startsWith("AI_"))
  ) {
    return {
      kind: "credits-exhausted",
      message: ONCHAIN_CREDITS_EXHAUSTED_MESSAGE,
    };
  }

  return { kind: "other", message: thrown ?? fallbackMessage };
}
