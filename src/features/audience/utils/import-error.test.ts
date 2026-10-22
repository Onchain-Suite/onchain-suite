import { describe, expect, it } from "vitest";

import { importErrorMessage } from "./import-error";

/** Build an Error the way audience.service.ts does: message + status + code. */
const apiError = (opts: {
  message?: string;
  status?: number;
  code?: string;
  cause?: unknown;
}): Error & { status?: number; code?: string } => {
  const e = new Error(opts.message ?? "request failed", {
    cause: opts.cause,
  }) as Error & { status?: number; code?: string };
  e.status = opts.status;
  e.code = opts.code;
  return e;
};

describe("importErrorMessage", () => {
  it("distinguishes payment (402 / PAYG) from the generic fallback", () => {
    expect(
      importErrorMessage(
        apiError({
          status: 402,
          code: "PAYG_BALANCE_EXHAUSTED",
          message: "Pay-as-you-go balance is empty.",
        })
      )
    ).toMatch(/pay-as-you-go|balance|upgrade/i);
  });

  it("maps a 409 contact-limit conflict to the limit message", () => {
    expect(importErrorMessage(apiError({ status: 409 }))).toMatch(
      /contact limit/i
    );
  });

  it("maps a 413 to the too-large message even with no code", () => {
    expect(importErrorMessage(apiError({ status: 413 }))).toMatch(/too large/i);
  });

  it("owns a 5xx and says it was reported", () => {
    const msg = importErrorMessage(apiError({ status: 500 }));
    expect(msg).toMatch(/our side/i);
    expect(msg).toMatch(/notified|try again/i);
  });

  it("maps 401/403 to a session message", () => {
    expect(importErrorMessage(apiError({ status: 401 }))).toMatch(/session/i);
    expect(importErrorMessage(apiError({ status: 403 }))).toMatch(/session/i);
  });

  it("still recognizes the client pre-flight guard codes by message", () => {
    expect(importErrorMessage(new Error("IMPORT_LIST_REQUIRED"))).toMatch(
      /choose a list/i
    );
    expect(importErrorMessage(new Error("IMPORT_CHAIN_REQUIRED"))).toMatch(
      /chain/i
    );
  });

  it("reads HTTP status baked into the large-file direct-upload message", () => {
    // uploadDirect throws `Import upload failed [HTTP 413]: ...` with no status.
    expect(
      importErrorMessage(new Error("Import upload failed [HTTP 413]: too big"))
    ).toMatch(/too large/i);
  });

  it("reads a code carried on the error cause", () => {
    expect(
      importErrorMessage(
        apiError({ message: "failed", cause: new Error("PLAN_LIMIT exceeded") })
      )
    ).toMatch(/plan|upgrade|balance/i);
  });

  it("falls back to a safe generic message for an unknown 400", () => {
    expect(
      importErrorMessage(apiError({ status: 400, message: "weird" }))
    ).toBe(
      "We couldn't start the import. Please check your file and try again."
    );
  });
});
