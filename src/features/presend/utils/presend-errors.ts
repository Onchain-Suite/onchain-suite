import { isJsonObject } from "@/lib/utils";

import type { PresendCheck, PresendResult } from "../contracts/presend";

export const PRESEND_ACK_REQUIRED = "PRESEND_ACK_REQUIRED";
export const PRESEND_BLOCKED = "PRESEND_BLOCKED";
export const VALIDATION_FAILED = "VALIDATION_FAILED";

/** A launch/activate/save the pre-send gate refused, parsed off the error. */
export type PresendInterruption =
  | {
      kind: "ack";
      /** Every check to show: the full result when the body carried one. */
      checks: PresendCheck[];
      /** Warn codes this request did not acknowledge. */
      missing: string[];
      /** Every warn code the retry must acknowledge. */
      warnCodes: string[];
    }
  | {
      kind: "blocked";
      checks: PresendCheck[];
      /** Other validation errors the 422 carried (campaign launch only). */
      otherErrors: string[];
    };

const OUTCOMES = new Set(["pass", "warn", "block"]);

const toCheck = (value: unknown): PresendCheck | null => {
  if (!isJsonObject(value)) return null;
  const { code, outcome, message, fix, details } = value;
  if (typeof code !== "string" || typeof outcome !== "string") return null;
  if (!OUTCOMES.has(outcome)) return null;
  return {
    code,
    outcome: outcome as PresendCheck["outcome"],
    message: typeof message === "string" ? message : "",
    ...(typeof fix === "string" && fix.length > 0 ? { fix } : {}),
    ...(isJsonObject(details)
      ? { details: details as PresendCheck["details"] }
      : {}),
  };
};

export const toChecks = (value: unknown): PresendCheck[] =>
  Array.isArray(value)
    ? value.map(toCheck).filter((c): c is PresendCheck => c !== null)
    : [];

/** Read a presend result off any response; null when it is not one. */
export const toPresendResult = (value: unknown): PresendResult | null => {
  if (!isJsonObject(value) || !Array.isArray(value.checks)) return null;
  const checks = toChecks(value.checks);
  const blocked =
    typeof value.blocked === "boolean"
      ? value.blocked
      : checks.some((c) => c.outcome === "block");
  return {
    ok: typeof value.ok === "boolean" ? value.ok : !blocked,
    blocked,
    rulesetVersion:
      typeof value.rulesetVersion === "string" ? value.rulesetVersion : "",
    ...(value.mode === "full" || value.mode === "legacy"
      ? { mode: value.mode }
      : {}),
    checks,
  };
};

export const warnCodesOf = (checks: PresendCheck[]): string[] => [
  ...new Set(checks.filter((c) => c.outcome === "warn").map((c) => c.code)),
];

export const hasBlocks = (checks: PresendCheck[]): boolean =>
  checks.some((c) => c.outcome === "block");

export const hasWarns = (checks: PresendCheck[]): boolean =>
  checks.some((c) => c.outcome === "warn");

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];

/**
 * The backend's global filter wraps an HttpException's body as
 * `{ success: false, error: { code, message, details: <body> } }`, and the
 * services copy `code`/`details` onto the thrown Error. Read the body from
 * `details`, falling back to a raw `body` (automation service) so a response
 * that is not wrapped still parses.
 */
const errorBody = (
  error: unknown
): { code: string; body: Record<string, unknown> } | null => {
  if (!isJsonObject(error) && !(error instanceof Error)) return null;
  const e = error as { code?: unknown; details?: unknown; body?: unknown };
  const candidates: unknown[] = [e.details];
  if (isJsonObject(e.body)) {
    const nested = isJsonObject(e.body.error) ? e.body.error : undefined;
    candidates.push(nested?.details, e.body);
  }
  for (const candidate of candidates) {
    if (!isJsonObject(candidate)) continue;
    const code =
      typeof candidate.code === "string"
        ? candidate.code
        : typeof e.code === "string"
          ? e.code
          : "";
    if (code) return { code, body: candidate };
  }
  return null;
};

/**
 * Recognise a pre-send refusal. Returns null for every other error, including
 * a `VALIDATION_FAILED` that carries no blocking check (old backend, or the
 * flag is off): that one is an ordinary validation error for the caller.
 */
export const parsePresendError = (
  error: unknown
): PresendInterruption | null => {
  const parsed = errorBody(error);
  if (!parsed) return null;
  const { code, body } = parsed;
  const presend = toPresendResult(body.presend);
  const bodyChecks = toChecks(body.checks);

  if (code === PRESEND_ACK_REQUIRED) {
    const shown = presend?.checks.length ? presend.checks : bodyChecks;
    const missing = strings(body.missing);
    const warnCodes = [
      ...new Set([
        ...warnCodesOf(bodyChecks),
        ...warnCodesOf(shown),
        ...missing,
      ]),
    ];
    return { kind: "ack", checks: shown, missing, warnCodes };
  }

  if (code === PRESEND_BLOCKED || code === VALIDATION_FAILED) {
    const blocking = bodyChecks.filter((c) => c.outcome === "block");
    const fromResult = presend?.checks.filter((c) => c.outcome === "block");
    if (blocking.length === 0 && !fromResult?.length) return null;
    const shown = presend?.checks.length ? presend.checks : bodyChecks;
    const blockCodes = new Set(
      shown.filter((c) => c.outcome === "block").map((c) => c.code)
    );
    const otherErrors = Array.isArray(body.errors)
      ? body.errors
          .filter(isJsonObject)
          .filter(
            (err) => typeof err.code !== "string" || !blockCodes.has(err.code)
          )
          .map((err) => (typeof err.message === "string" ? err.message : ""))
          .filter((m) => m.trim().length > 0)
      : [];
    return { kind: "blocked", checks: shown, otherErrors };
  }

  return null;
};

/** Thrown by the gate when the user cancelled or a block stopped the action. */
export class PresendStoppedError extends Error {
  readonly reason: "cancelled" | "blocked";
  constructor(reason: "cancelled" | "blocked") {
    super(
      reason === "blocked"
        ? "Pre-send checks blocked this send."
        : "Cancelled at the pre-send review."
    );
    this.name = "PresendStoppedError";
    this.reason = reason;
  }
}

export const isPresendStopped = (
  error: unknown
): error is PresendStoppedError => error instanceof PresendStoppedError;
