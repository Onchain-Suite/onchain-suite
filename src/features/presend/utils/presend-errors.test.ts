import { describe, expect, it } from "vitest";

import { block, result, warn } from "../test/fixtures";
import {
  otherValidationErrors,
  parsePresendError,
  requestErrorMessage,
  stepsOf,
  toPresendResult,
} from "./presend-errors";

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

  it("drops only the source:presend copies from errors[], by marker not by code", () => {
    const parsed = parsePresendError(
      apiError({
        code: "VALIDATION_FAILED",
        details: {
          code: "VALIDATION_FAILED",
          checks: [block("URL_SHORTENER")],
          errors: [
            { code: "URL_SHORTENER", message: "shortener", source: "presend" },
            { code: "SUBJECT_REQUIRED", message: "Subject is required" },
            // Same code as a block but no marker: an ordinary error, kept.
            { code: "URL_SHORTENER", message: "legacy copy" },
          ],
        },
      })
    );
    expect(parsed).toEqual(
      expect.objectContaining({
        kind: "blocked",
        otherErrors: ["Subject is required", "legacy copy"],
      })
    );
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

describe("otherValidationErrors", () => {
  it("keeps strings and unmarked entries, drops presend copies and blanks", () => {
    expect(
      otherValidationErrors([
        "Audience is empty",
        { code: "X", message: "x", source: "presend" },
        { code: "Y", message: "  " },
        { code: "Z", message: "An error occurred" },
        { code: "W", message: "Subject is required" },
      ])
    ).toEqual(["Audience is empty", "Subject is required"]);
    expect(otherValidationErrors(undefined)).toEqual([]);
  });
});

describe("stepsOf", () => {
  it("reads details.steps, falls back to nodeId, and is empty for campaigns", () => {
    expect(
      stepsOf({
        ...block("URL_SHORTENER"),
        details: {
          nodeId: "email-1",
          steps: ["email-1", "email-3", "email-1"],
        },
      })
    ).toEqual(["email-1", "email-3"]);
    expect(
      stepsOf({ ...warn("GMAIL_CLIP"), details: { nodeId: "email-2" } })
    ).toEqual(["email-2"]);
    expect(stepsOf(warn("GMAIL_CLIP"))).toEqual([]);
  });
});

describe("requestErrorMessage", () => {
  it("never returns the generic filter fallback when details say more", () => {
    expect(
      requestErrorMessage(
        apiError({
          message: "An error occurred",
          code: "VALIDATION_FAILED",
          details: {
            code: "VALIDATION_FAILED",
            errors: [
              { code: "SUBJECT_REQUIRED", message: "Subject is required" },
            ],
          },
        }),
        "Failed"
      )
    ).toBe("Subject is required");
    expect(
      requestErrorMessage(
        Object.assign(new Error("An error occurred"), {}),
        "Failed to update status"
      )
    ).toBe("Failed to update status");
    expect(requestErrorMessage(new Error("Not found"), "Failed")).toBe(
      "Not found"
    );
  });
});
