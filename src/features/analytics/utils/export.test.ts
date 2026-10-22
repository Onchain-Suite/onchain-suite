import { describe, expect, it } from "vitest";

import { chartRows, toCsv } from "./export";

describe("csv export", () => {
  it("quotes cells that need it", () => {
    expect(toCsv([["Chart", "Item, with comma", 'say "hi"']])).toBe(
      'Chart,"Item, with comma","say ""hi"""'
    );
  });

  it("writes one row per category and series, or why it is empty", () => {
    expect(
      chartRows("Push", {
        categoryKey: "stage",
        rows: [{ stage: "Queued", value: 1200 }],
        series: [{ key: "value", label: "Pushes" }],
        unit: "count",
        total: null,
      })
    ).toEqual([["Push", "Queued", "1,200"]]);
    expect(
      chartRows("Conversions", {
        categoryKey: "x",
        rows: [],
        series: [],
        unit: "count",
        total: null,
        emptyReason: "Not set up",
      })
    ).toEqual([["Conversions", "", "Not set up"]]);
  });
});
