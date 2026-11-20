import { describe, expect, it } from "vitest";

import {
  bpsToPercent,
  MAX_REVENUE_EVENTS,
  normalizeRevenueEvents,
  percentToBps,
  readFeeBps,
  sanitizeRevenueEvents,
  validateRevenueEvents,
} from "./project-value";

describe("percentToBps", () => {
  it.each([
    ["0.3", 30],
    ["100", 10_000],
    ["0", 0],
    ["0.01", 1],
    ["0.29", 29],
    ["2.5", 250],
    [" 1.25% ", 125],
    [".5", 50],
  ])("%s%% -> %d bps", (input, bps) => {
    expect(percentToBps(input)).toEqual({ ok: true, feeBps: bps });
  });

  it("treats empty input as 'not set', not 0", () => {
    expect(percentToBps("")).toEqual({ ok: true, feeBps: undefined });
    expect(percentToBps("   ")).toEqual({ ok: true, feeBps: undefined });
  });

  it.each(["abc", "101", "-1", "1e2", "NaN", "Infinity", "1.2.3", "100.01"])(
    "rejects %s",
    (input) => {
      expect(percentToBps(input).ok).toBe(false);
    }
  );

  it("rejects more than two decimals (finer than 1 bp)", () => {
    const result = percentToBps("0.005");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/2 decimal/);
  });
});

describe("bpsToPercent", () => {
  it("round-trips the examples", () => {
    expect(bpsToPercent(30)).toBe("0.3");
    expect(bpsToPercent(10_000)).toBe("100");
    expect(bpsToPercent(0)).toBe("0");
    expect(bpsToPercent(1)).toBe("0.01");
    expect(bpsToPercent(undefined)).toBe("");
  });

  it("every bps value survives a round trip", () => {
    for (let bps = 0; bps <= 10_000; bps += 1) {
      expect(percentToBps(bpsToPercent(bps))).toEqual({
        ok: true,
        feeBps: bps,
      });
    }
  });
});

describe("readFeeBps", () => {
  it("accepts integers 0-10000 only", () => {
    expect(readFeeBps(30)).toBe(30);
    expect(readFeeBps(0)).toBe(0);
    expect(readFeeBps(10_001)).toBeUndefined();
    expect(readFeeBps(-1)).toBeUndefined();
    expect(readFeeBps(1.5)).toBeUndefined();
    expect(readFeeBps("30")).toBeUndefined();
    expect(readFeeBps(null)).toBeUndefined();
  });
});

describe("revenue events", () => {
  it("normalizes the wire shape and drops malformed entries", () => {
    expect(
      normalizeRevenueEvents([
        { eventName: "trade_settled" },
        { eventName: " loan_repaid ", amountField: "interest_usd" },
        { eventName: "" },
        { amountField: "x" },
        "nope",
      ])
    ).toEqual([
      { eventName: "trade_settled" },
      { eventName: "loan_repaid", amountField: "interest_usd" },
    ]);
    expect(normalizeRevenueEvents(undefined)).toEqual([]);
  });

  it("trims, drops blank rows and omits an empty amount field", () => {
    expect(
      sanitizeRevenueEvents([
        { eventName: "  trade_settled ", amountField: "  " },
        { eventName: "", amountField: "" },
        { eventName: "loan_repaid", amountField: " interest_usd " },
      ])
    ).toEqual([
      { eventName: "trade_settled" },
      { eventName: "loan_repaid", amountField: "interest_usd" },
    ]);
  });

  it("accepts a valid list and ignores fully blank rows", () => {
    expect(
      validateRevenueEvents([
        { eventName: "trade_settled" },
        { eventName: "", amountField: "" },
        { eventName: "loan_repaid", amountField: "interest_usd" },
      ])
    ).toEqual([]);
  });

  it("flags duplicates case-insensitively, after trimming", () => {
    const issues = validateRevenueEvents([
      { eventName: "Trade" },
      { eventName: " trade " },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ index: 1, field: "eventName" });
  });

  it("flags a blank event name when an amount field is set", () => {
    expect(
      validateRevenueEvents([{ eventName: "  ", amountField: "usd" }])
    ).toEqual([expect.objectContaining({ index: 0, field: "eventName" })]);
  });

  it("flags names and amount fields the backend would reject", () => {
    const issues = validateRevenueEvents([
      { eventName: "has space" },
      { eventName: "ok", amountField: "nested.field" },
    ]);
    expect(issues.map((i) => [i.index, i.field])).toEqual([
      [0, "eventName"],
      [1, "amountField"],
    ]);
  });

  it(`caps the list at ${MAX_REVENUE_EVENTS}`, () => {
    const rows = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ eventName: `event_${i}` }));
    expect(validateRevenueEvents(rows(MAX_REVENUE_EVENTS))).toEqual([]);
    expect(validateRevenueEvents(rows(MAX_REVENUE_EVENTS + 1))).toEqual([
      expect.objectContaining({ field: "list", index: -1 }),
    ]);
  });
});
