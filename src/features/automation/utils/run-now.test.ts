import { describe, expect, it } from "vitest";

import {
  canRunLendingHealthFactorNow,
  LENDING_RUN_NOW_TRIGGER_TYPE,
} from "./run-now";

describe("canRunLendingHealthFactorNow", () => {
  it("allows the DeFi lending Health Factor Crossed trigger", () => {
    expect(canRunLendingHealthFactorNow("defi_health_factor")).toBe(true);
    expect(canRunLendingHealthFactorNow(LENDING_RUN_NOW_TRIGGER_TYPE)).toBe(
      true
    );
  });

  it("does NOT allow the contact-score trigger (the conflation bug)", () => {
    // `health_threshold` is a contact-score trigger with no lending pool; wiring
    // its "Run now" to the lending endpoint fires a check with nothing to read.
    expect(canRunLendingHealthFactorNow("health_threshold")).toBe(false);
  });

  it("does not allow unrelated or missing trigger types", () => {
    expect(canRunLendingHealthFactorNow("onchain_event")).toBe(false);
    expect(canRunLendingHealthFactorNow("segment_entered")).toBe(false);
    expect(canRunLendingHealthFactorNow("")).toBe(false);
    expect(canRunLendingHealthFactorNow(null)).toBe(false);
    expect(canRunLendingHealthFactorNow(undefined)).toBe(false);
  });
});
