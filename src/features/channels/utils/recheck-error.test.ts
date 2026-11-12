import { describe, expect, it } from "vitest";

import { isTimeoutError } from "./recheck-error";

describe("isTimeoutError", () => {
  it("matches the axios timeout message the service re-throws", () => {
    expect(isTimeoutError(new Error("timeout of 30000ms exceeded"))).toBe(true);
    expect(isTimeoutError(new Error("timeout of 120000ms exceeded"))).toBe(
      true
    );
  });

  it("matches timeout codes and 'timed out' phrasing", () => {
    expect(isTimeoutError(new Error("Request timed out"))).toBe(true);
    expect(isTimeoutError(new Error("ETIMEDOUT"))).toBe(true);
  });

  it("matches a wrapped axios cause with an abort code", () => {
    const err = new Error("Sender identities request failed", {
      cause: { code: "ECONNABORTED" },
    });
    expect(isTimeoutError(err)).toBe(true);
  });

  it("does not match ordinary request failures", () => {
    expect(isTimeoutError(new Error("[HTTP 500] Internal Server Error"))).toBe(
      false
    );
    expect(isTimeoutError(new Error("[HTTP 404] Not found"))).toBe(false);
  });

  it("is safe for non-Error inputs", () => {
    expect(isTimeoutError(undefined)).toBe(false);
    expect(isTimeoutError("timeout")).toBe(false);
    expect(isTimeoutError({ message: "timeout of 30000ms exceeded" })).toBe(
      false
    );
  });
});
