import { describe, expect, it } from "vitest";

import {
  createDashboard,
  deleteDashboard,
  duplicateDashboard,
  EMPTY_STATE,
  newChartSpec,
  parseState,
  publish,
  revoke,
  updateDashboard,
  withBuiltIns,
} from "./dashboards";

const NOW = "2026-10-22T10:00:00.000Z";

describe("dashboard operations", () => {
  it("always lists the four built-in tabs first", () => {
    const { state } = createDashboard(EMPTY_STATE, "Weekly growth", NOW);
    expect(withBuiltIns(state).map((d) => d.name)).toEqual([
      "Overview",
      "Conversions",
      "Engagement",
      "Retention",
      "Weekly growth",
    ]);
  });

  it("adds charts to a built-in tab without letting it be renamed or deleted", () => {
    const chart = newChartSpec("lifecycle");
    const { state, dashboard } = updateDashboard(
      EMPTY_STATE,
      "overview",
      { name: "Mine", charts: [chart] },
      NOW
    );
    expect(dashboard?.name).toBe("Overview");
    expect(dashboard?.chartCount).toBe(1);
    expect(deleteDashboard(state, "overview")).toBe(state);
  });

  it("duplicates charts under new ids", () => {
    const created = createDashboard(EMPTY_STATE, "Growth", NOW);
    const withChart = updateDashboard(
      created.state,
      created.dashboard.id,
      { charts: [newChartSpec()] },
      NOW
    );
    const copy = duplicateDashboard(withChart.state, created.dashboard.id, NOW);
    expect(copy.dashboard?.name).toBe("Growth copy");
    expect(copy.dashboard?.charts).toHaveLength(1);
    expect(copy.dashboard?.charts[0]?.id).not.toBe(
      withChart.dashboard?.charts[0]?.id
    );
  });

  it("turns off a dashboard's links when it is deleted", () => {
    const created = createDashboard(EMPTY_STATE, "Growth", NOW);
    const pub = publish(
      created.state,
      created.dashboard.id,
      "Growth",
      "https://app.test",
      NOW
    );
    expect(pub.link.url).toBe(`https://app.test/d/${pub.link.token}`);
    expect(deleteDashboard(pub.state, created.dashboard.id).links).toEqual([]);
    expect(revoke(pub.state, pub.link.token).links).toEqual([]);
  });

  it("picks a chart the measure supports", () => {
    expect(newChartSpec("lifecycle").chart).toBe("donut");
    expect(newChartSpec("lifecycle", "line").chart).toBe("donut");
    expect(newChartSpec("reach_over_time", "area").chart).toBe("area");
  });

  it("starts clean from malformed storage", () => {
    expect(parseState("{oops")).toEqual(EMPTY_STATE);
    expect(
      parseState(JSON.stringify({ dashboards: [null, { id: "d1" }] }))
        .dashboards
    ).toEqual([{ id: "d1" }]);
  });
});
