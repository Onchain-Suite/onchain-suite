import { describe, expect, it } from "vitest";

import type { Dashboard } from "../contracts/dashboards";
import { composeCharts } from "./compose-charts";

const base = (over: Partial<Dashboard>): Dashboard => ({
  id: "custom-1",
  name: "Mine",
  builtIn: false,
  chartCount: 0,
  createdAt: null,
  updatedAt: null,
  period: "30d",
  charts: [],
  ...over,
});

const chart = (id: string) =>
  ({ id, title: id, metric: "reach_over_time", chart: "line" }) as const;

describe("composeCharts", () => {
  it("returns a custom dashboard's own charts, in order", () => {
    const d = base({ charts: [chart("a"), chart("b")] });
    expect(composeCharts(d).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("puts a built-in tab's measure cards before the user's charts", () => {
    const d = base({ id: "overview", builtIn: true, charts: [chart("mine")] });
    const ids = composeCharts(d).map((c) => c.id);
    expect(ids[ids.length - 1]).toBe("mine");
    expect(ids.length).toBeGreaterThan(1);
  });
});
