import { describe, expect, it } from "vitest";

import { block, result, warn } from "../test/fixtures";
import { parsePresendError, toPresendResult } from "./presend-errors";

const apiError = (fields: Record<string, unknown>) =>
  Object.assign(new Error("refused"), fields);

describe("parsePresendError", () => {
  it("reads a 409 from the error envelope's details", () => {
    const parsed = parsePresendError(
      apiError({
        code: "PRESEND_ACK_REQUIRED",
        details: {
          code: "PRESEND_ACK_REQUIRED",
          missing: ["NEW_LINK_DOMAIN"],
          checks: [warn("GMAIL_CLIP"), warn("NEW_LINK_DOMAIN")],
          presend: result([warn("GMAIL_CLIP"), warn("NEW_LINK_DOMAIN")]),
        },
      })
    );
    expect(parsed).toEqual(
      expect.objectContaining({
        kind: "ack",
        missing: ["NEW_LINK_DOMAIN"],
        warnCodes: ["GMAIL_CLIP", "NEW_LINK_DOMAIN"],
      })
    );
  });

  it("reads an unwrapped body (no envelope) too", () => {
    const parsed = parsePresendError(
      apiError({
        body: {
          code: "PRESEND_BLOCKED",
          checks: [block("URL_SHORTENER")],
        },
      })
    );
    expect(parsed?.kind).toBe("blocked");
    expect(parsed?.checks.map((c) => c.code)).toEqual(["URL_SHORTENER"]);
  });

  it("ignores a VALIDATION_FAILED with no blocking check (flag off)", () => {
    expect(
      parsePresendError(
        apiError({
          code: "VALIDATION_FAILED",
          details: { code: "VALIDATION_FAILED", errors: [{ code: "X" }] },
        })
      )
    ).toBeNull();
  });

  it("ignores unrelated errors", () => {
    expect(parsePresendError(new Error("boom"))).toBeNull();
    expect(parsePresendError("nope")).toBeNull();
  });
});

describe("toPresendResult", () => {
  it("drops malformed checks and derives blocked when missing", () => {
    const parsed = toPresendResult({
      checks: [
        block("DKIM_NOT_PASSING"),
        { code: 1 },
        { code: "X", outcome: "maybe" },
      ],
    });
    expect(parsed?.blocked).toBe(true);
    expect(parsed?.checks).toHaveLength(1);
  });
});
