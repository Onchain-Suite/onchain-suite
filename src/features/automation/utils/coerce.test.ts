import { describe, expect, it } from "vitest";

import { asBoolean, asNumber, asString, pickArray, pickText } from "./coerce";

describe("asString", () => {
  it("returns strings as-is and everything else as empty", () => {
    expect(asString("hi")).toBe("hi");
    expect(asString(42)).toBe("");
    expect(asString(null)).toBe("");
    expect(asString(undefined)).toBe("");
    expect(asString({})).toBe("");
  });
});

describe("asNumber", () => {
  it("keeps finite numbers and parses numeric strings", () => {
    expect(asNumber(5)).toBe(5);
    expect(asNumber("7.5")).toBe(7.5);
    expect(asNumber("  12 ")).toBe(12);
  });
  it("is 0 for non-finite, blank, or non-numeric input", () => {
    expect(asNumber(Number.NaN)).toBe(0);
    expect(asNumber(Number.POSITIVE_INFINITY)).toBe(0);
    expect(asNumber("")).toBe(0);
    expect(asNumber("abc")).toBe(0);
    expect(asNumber(null)).toBe(0);
  });
});

describe("asBoolean", () => {
  it("only the literal true is true", () => {
    expect(asBoolean(true)).toBe(true);
    expect(asBoolean(false)).toBe(false);
    expect(asBoolean(1)).toBe(false);
    expect(asBoolean("true")).toBe(false);
  });
});

describe("pickArray", () => {
  it("unwraps the array itself or a {items}/{data} envelope", () => {
    expect(pickArray([1, 2])).toEqual([1, 2]);
    expect(pickArray({ items: ["a"] })).toEqual(["a"]);
    expect(pickArray({ data: ["b"] })).toEqual(["b"]);
  });
  it("is [] when there is no array to find", () => {
    expect(pickArray({ nope: 1 })).toEqual([]);
    expect(pickArray(null)).toEqual([]);
    expect(pickArray("x")).toEqual([]);
  });
});

describe("pickText", () => {
  it("returns the first non-blank string, trimmed", () => {
    expect(pickText("", "  ", "found", "later")).toBe("found");
    expect(pickText("  spaced  ")).toBe("spaced");
  });
  it("skips non-strings and is empty when nothing qualifies", () => {
    expect(pickText(null, 3, {}, "ok")).toBe("ok");
    expect(pickText(null, undefined, 0)).toBe("");
  });
});
