import type { PresendCheck, PresendResult } from "../contracts/presend";

export const warn = (
  code: string,
  message = `${code} message`
): PresendCheck => ({
  code,
  outcome: "warn",
  message,
  fix: `${code} fix`,
});

export const block = (code: string): PresendCheck => ({
  code,
  outcome: "block",
  message: `${code} message`,
  fix: `${code} fix`,
});

export const pass = (code: string, skipped?: string): PresendCheck => ({
  code,
  outcome: "pass",
  message: skipped ? `Not checked: ${skipped}` : "",
  ...(skipped ? { details: { skipped } } : {}),
});

export const result = (checks: PresendCheck[]): PresendResult => {
  const blocked = checks.some((c) => c.outcome === "block");
  return {
    ok: !blocked,
    blocked,
    rulesetVersion: "2026-11-21.1",
    mode: "full",
    checks,
  };
};

/**
 * An axios rejection shaped exactly as the backend's global filter sends it:
 * the HttpException body sits under `error.details`.
 */
export const axiosRejection = (status: number, body: Record<string, unknown>) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: {
      status,
      data: {
        success: false,
        error: {
          code: body.code,
          message: body.message ?? "refused",
          details: body,
        },
      },
    },
  });

export const ackRequired = (
  warns: PresendCheck[],
  missing: string[],
  extra: PresendCheck[] = []
) =>
  axiosRejection(409, {
    statusCode: 409,
    code: "PRESEND_ACK_REQUIRED",
    message: `Review ${missing.length} pre-send warnings`,
    rulesetVersion: "2026-11-21.1",
    missing,
    checks: warns,
    presend: result([...warns, ...extra]),
  });
