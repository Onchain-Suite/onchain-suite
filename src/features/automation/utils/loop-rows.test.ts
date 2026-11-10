import { describe, expect, it } from "vitest";

import { loopsAnswer, pickLoops, readTotal, toLoopRow } from "./loop-rows";

describe("toLoopRow", () => {
  it("maps a list item, naming the trigger and its event", () => {
    const row = toLoopRow({
      id: "a1",
      name: "Welcome",
      status: "active",
      trigger: { type: "list_joined", event: "Newsletter" },
      entries: "12",
      conversions: 3,
    });
    expect(row).toMatchObject({
      id: "a1",
      name: "Welcome",
      status: "active",
      triggerLabel: "List joined · Newsletter",
      entries: 12,
      conversions: 3,
    });
  });

  it("treats anything unknown as a draft and needs an id", () => {
    expect(toLoopRow({ id: "x", status: "weird" })?.status).toBe("draft");
    expect(toLoopRow({ name: "No id" })).toBeNull();
  });
});

describe("list responses", () => {
  it("reads items and totals from either shape", () => {
    expect(pickLoops({ items: [1] })).toEqual([1]);
    expect(pickLoops({ data: [2] })).toEqual([2]);
    expect(readTotal({ items: [], meta: { totalItems: 7 } })).toBe(7);
    expect(readTotal([1, 2])).toBeUndefined();
  });
});

describe("loopsAnswer", () => {
  it("speaks in singular and plural", () => {
    const one = loopsAnswer({ live: 1, entries: 1, conversions: 0, paused: 1 });
    expect(one.lead).toBe("1 Loop is live");
    expect(one.detail).toBe("1 person entered one in the last 30 days, and");
    expect(one.stopped).toBe("1 is paused, so nobody new hears from it.");
    const many = loopsAnswer({
      live: 2,
      entries: 380,
      conversions: 70,
      paused: 0,
    });
    expect(many.lead).toBe("2 Loops are live");
    expect(many.stopped).toBe("");
  });
});
