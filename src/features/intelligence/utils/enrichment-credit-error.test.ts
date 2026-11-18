import { describe, expect, it } from "vitest";

import {
  classifyEnrichmentError,
  ONCHAIN_CREDITS_EXHAUSTED_MESSAGE,
} from "./enrichment-credit-error";

/** What `intelligenceService` throws: the backend message, axios error as cause. */
const thrown = (status: number, data: unknown, message = "x") =>
  new Error(message, { cause: { response: { status, data } } });

const REFRESH_MESSAGE =
  "This refresh re-enriches 2,886 wallets and can use up to 8,658 credits. 1,000 are left this month and the usage wallet cannot cover the rest.";

describe("classifyEnrichmentError", () => {
  // The backend's global envelope, as the refresh pre-flight sends it.
  it("reads REFRESH_EXCEEDS_CREDITS from the envelope, keeping the backend's message", () => {
    const err = thrown(
      402,
      {
        success: false,
        error: {
          code: "REFRESH_EXCEEDS_CREDITS",
          message: REFRESH_MESSAGE,
          details: {
            code: "REFRESH_EXCEEDS_CREDITS",
            message: REFRESH_MESSAGE,
            wallets: 2886,
            creditsUpTo: 8658,
            meter: { used: 0, limit: 1000 },
          },
        },
      },
      REFRESH_MESSAGE
    );
    expect(classifyEnrichmentError(err)).toEqual({
      kind: "refresh-exceeds-credits",
      message: REFRESH_MESSAGE,
      wallets: 2886,
      creditsUpTo: 8658,
    });
  });

  it("reads the code from a bare body too, without the envelope", () => {
    const err = thrown(402, {
      code: "REFRESH_EXCEEDS_CREDITS",
      message: REFRESH_MESSAGE,
    });
    const failure = classifyEnrichmentError(err);
    expect(failure.kind).toBe("refresh-exceeds-credits");
    expect(failure.message).toBe(REFRESH_MESSAGE);
  });

  it("names Onchain credits when the allowance and wallet are spent", () => {
    const err = thrown(402, {
      success: false,
      error: { code: "CREDITS_EXCEEDED", message: "Credits exceeded" },
    });
    expect(classifyEnrichmentError(err)).toEqual({
      kind: "credits-exhausted",
      message: ONCHAIN_CREDITS_EXHAUSTED_MESSAGE,
    });
    expect(ONCHAIN_CREDITS_EXHAUSTED_MESSAGE).toContain("Onchain credits");
  });

  // The old handler looked for "402" in the message, which never had it.
  it("treats any other 402 as out of credits", () => {
    expect(classifyEnrichmentError(thrown(402, "Payment Required")).kind).toBe(
      "credits-exhausted"
    );
  });

  it("leaves an AI-credits refusal to its own copy", () => {
    const err = thrown(
      402,
      { error: { code: "AI_CREDITS_EXCEEDED", message: "AI credits used up" } },
      "AI credits used up"
    );
    expect(classifyEnrichmentError(err)).toEqual({
      kind: "other",
      message: "AI credits used up",
    });
  });

  it("passes any other failure through with its message, or the fallback", () => {
    expect(
      classifyEnrichmentError(thrown(500, {}, "Upstream timed out"))
    ).toEqual({ kind: "other", message: "Upstream timed out" });
    expect(classifyEnrichmentError(new Error(""), "Failed to refresh")).toEqual(
      {
        kind: "other",
        message: "Failed to refresh",
      }
    );
    expect(classifyEnrichmentError("boom").kind).toBe("other");
  });
});
