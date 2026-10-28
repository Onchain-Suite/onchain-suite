import { describe, expect, it } from "vitest";

import { calcomSignature, verifyCalcomSignature } from "./calcom-signature";

const SECRET = "whsec_test_secret";
const BODY = JSON.stringify({ triggerEvent: "BOOKING_CREATED", payload: {} });

describe("verifyCalcomSignature", () => {
  it("accepts a correct signature over the raw body", () => {
    const sig = calcomSignature(BODY, SECRET);
    expect(verifyCalcomSignature(BODY, sig, SECRET)).toEqual({ ok: true });
  });

  it("rejects a tampered body", () => {
    const sig = calcomSignature(BODY, SECRET);
    const res = verifyCalcomSignature(`${BODY} `, sig, SECRET);
    expect(res).toEqual({ ok: false, reason: "mismatch" });
  });

  it("rejects a wrong-length header without throwing", () => {
    expect(verifyCalcomSignature(BODY, "deadbeef", SECRET)).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });

  it("fails closed when the secret or signature is missing", () => {
    expect(
      verifyCalcomSignature(BODY, calcomSignature(BODY, SECRET), "")
    ).toEqual({ ok: false, reason: "no-secret" });
    expect(verifyCalcomSignature(BODY, null, SECRET)).toEqual({
      ok: false,
      reason: "no-signature",
    });
  });
});
