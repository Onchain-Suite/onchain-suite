import { describe, expect, it } from "vitest";

import { resolveMetric, retentionCurve } from "./resolve-metric";

const ts = (conversions: Array<number | null>) => ({
  period: "30d" as const,
  grain: "day" as const,
  metrics: ["reach" as const, "conversions" as const],
  series: conversions.map((c, i) => ({
    bucket: `b${i}`,
    start: `2026-07-0${i + 1}T00:00:00.000Z`,
    end: "",
    reach: 100,
    conversions: c,
  })),
});

describe("resolveMetric", () => {
  it("charts reach per bucket with the overview total", () => {
    const d = resolveMetric("reach_over_time", {
      timeseries: ts([1, 2]),
      overview: {
        period: "30d",
        window: { start: "", end: "" },
        kpis: {
          walletsReached: { value: 180, previous: null, changePct: null },
          emailOpenRate: { value: null, previous: null, changePct: null },
          pushViewRate: { value: null, previous: null, changePct: null },
          activeWallets: { value: null, previous: null, changePct: null },
          onChainConversions: { value: null, previous: null, changePct: null },
        },
      },
    });
    expect(d.rows).toEqual([
      { bucket: "Jul 1", reach: 100 },
      { bucket: "Jul 2", reach: 100 },
    ]);
    expect(d.total).toBe(180);
    expect(d.emptyReason).toBeUndefined();
  });

  it("explains unconfigured conversions instead of drawing zeros", () => {
    expect(
      resolveMetric("conversions_over_time", { timeseries: ts([null, null]) })
        .emptyReason
    ).toMatch(/count as conversions/);
    expect(
      resolveMetric("conversion_rate_over_time", { timeseries: ts([5, 10]) })
        .rows
    ).toEqual([
      { bucket: "Jul 1", rate: 5 },
      { bucket: "Jul 2", rate: 10 },
    ]);
  });

  it("reads campaign rates as percentages of delivered", () => {
    const d = resolveMetric("engagement_rates", {
      campaigns: {
        email: {
          delivered: 100,
          openRateOfDelivered: 42.3,
          unsubscribeRate: 0.4,
        },
        inapp: { delivered: 50, viewRate: 90.6 },
      },
    });
    expect(d.unit).toBe("percent");
    expect(d.rows[0]).toEqual({ metric: "Email open rate", value: 42.3 });
    expect(d.rows[1]).toEqual({ metric: "Push view rate", value: 90.6 });
  });

  it("turns report fractions into percentages", () => {
    const d = resolveMetric("segment_engagement", {
      segments: {
        rows: [
          {
            segmentId: "s",
            name: "Whales",
            sent: 10,
            openRate: 0.4231,
            clickRate: 0.1,
            pushViewRate: 0,
          },
        ],
      },
    });
    expect(d.rows).toEqual([{ segment: "Whales", open: 42.3, click: 10 }]);
  });
});

describe("retentionCurve", () => {
  it("weights each week by the cohorts old enough to have reached it", () => {
    expect(
      retentionCurve([
        { size: 100, retained: [100, 50, 25] },
        { size: 100, retained: [100, 70] },
      ])
    ).toEqual([100, 60, 25]);
    expect(retentionCurve([])).toEqual([]);
  });
});
