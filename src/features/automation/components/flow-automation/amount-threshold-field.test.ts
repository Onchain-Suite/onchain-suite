import { describe, expect, it } from "vitest";

import { fromBaseUnits, toBaseUnits } from "./amount-threshold-field";

/**
 * Large Transfer advertised "at or above an amount you set" and gave no way to
 * set it. Backend #460 made the threshold expressible; this converts what a
 * person types into what the chain stores.
 *
 * Getting decimals wrong is not a small error: assuming 18 for USDC sets the
 * threshold 10^12 too high, so the alert never fires and reads as a broken
 * trigger rather than a wrong number.
 */
describe("toBaseUnits", () => {
  it("converts whole tokens at 18 decimals", () => {
    expect(toBaseUnits("1000", 18)).toBe("1000000000000000000000");
  });

  it("converts USDC at 6, where the 18-decimal assumption breaks", () => {
    expect(toBaseUnits("1000", 6)).toBe("1000000000");
  });

  it("keeps precision past 2^53", () => {
    // `amount * 10 ** decimals` would drift here — four orders of magnitude
    // below one ETH in wei, which is the range this field serves.
    expect(toBaseUnits("123456789.123456789", 18)).toBe(
      "123456789123456789000000000"
    );
  });

  it("handles a fractional amount", () => {
    expect(toBaseUnits("0.5", 18)).toBe("500000000000000000");
    expect(toBaseUnits("1.5", 6)).toBe("1500000");
  });

  it("truncates a fraction finer than the token allows", () => {
    // Truncate, not round: a rounded-up threshold sits ABOVE what was asked
    // for and quietly filters out matches the user expected to see.
    expect(toBaseUnits("1.9999999", 6)).toBe("1999999");
  });

  it("is zero for zero, not null", () => {
    expect(toBaseUnits("0", 18)).toBe("0");
  });

  it("returns null for anything unusable", () => {
    for (const v of ["", "  ", "abc", "1.2.3", "-5", "1e21", "."]) {
      expect({ v, got: toBaseUnits(v, 18) }).toEqual({ v, got: null });
    }
  });

  it("refuses a nonsense decimals value", () => {
    expect(toBaseUnits("1", -1)).toBeNull();
    expect(toBaseUnits("1", 99)).toBeNull();
    expect(toBaseUnits("1", 1.5)).toBeNull();
  });
});

describe("fromBaseUnits", () => {
  it("round-trips what the user typed", () => {
    for (const [amount, decimals] of [
      ["1000", 18],
      ["1000", 6],
      ["0.5", 18],
      ["123456789.123456789", 18],
    ] as Array<[string, number]>) {
      const base = toBaseUnits(amount, decimals) ?? "";
      expect({ amount, back: fromBaseUnits(base, decimals) }).toEqual({
        amount,
        back: amount,
      });
    }
  });

  it("drops trailing zeros so a stored value reads back cleanly", () => {
    expect(fromBaseUnits("1000000000000000000000", 18)).toBe("1000");
  });

  it("handles zero-decimal tokens and empty input", () => {
    expect(fromBaseUnits("42", 0)).toBe("42");
    expect(fromBaseUnits("", 18)).toBe("");
    expect(fromBaseUnits("not-a-number", 18)).toBe("");
  });
});
