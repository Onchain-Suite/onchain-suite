import { describe, expect, it, vi } from "vitest";

import type { Dashboard } from "../contracts/dashboards";
import { buildDashboardSnapshot, composeCharts } from "./dashboard-snapshot";

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
    // The user's chart is always last; built-in measures come first.
    expect(ids[ids.length - 1]).toBe("mine");
    expect(ids.length).toBeGreaterThan(1);
  });
});

describe("buildDashboardSnapshot", () => {
  it("freezes resolved data for each chart and tolerates a failed source", async () => {
    const qc = {
      // reach_over_time reads the `timeseries` and `overview` sources.
      fetchQuery: vi.fn(
        async ({ queryKey }: { queryKey: readonly unknown[] }) => {
          const [, , source] = queryKey;
          if (source === "timeseries")
            return {
              grain: "day",
              series: [{ start: "2026-10-01", reach: 5 }],
            };
          throw new Error("overview is down");
        }
      ),
    } as unknown as Parameters<typeof buildDashboardSnapshot>[0];

    const snapshot = await buildDashboardSnapshot(
      qc,
      base({ charts: [chart("a")] })
    );

    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].spec.id).toBe("a");
    // Data resolved from the one source that answered.
    expect(snapshot[0].data.rows).toEqual([{ bucket: "Oct 1", reach: 5 }]);
  });
});
