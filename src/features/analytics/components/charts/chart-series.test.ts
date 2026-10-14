import { describe, expect, it } from "vitest";

import { seriesConfig } from "./chart-series";

describe("seriesConfig", () => {
  it("maps each series to a label + colour, defaulting to a --chart-N token by position", () => {
    const cfg = seriesConfig([
      { key: "email", label: "Email" },
      { key: "push", label: "In-app" },
    ]);
    expect(cfg.email).toEqual({ label: "Email", color: "var(--chart-1)" });
    expect(cfg.push).toEqual({ label: "In-app", color: "var(--chart-2)" });
  });

  it("respects an explicit colour", () => {
    expect(
      seriesConfig([{ key: "x", label: "X", color: "#abc" }]).x.color
    ).toBe("#abc");
  });

  it("cycles the default palette after five series", () => {
    const cfg = seriesConfig(
      ["a", "b", "c", "d", "e", "f"].map((k) => ({ key: k, label: k }))
    );
    expect(cfg.f.color).toBe("var(--chart-1)");
  });
});
