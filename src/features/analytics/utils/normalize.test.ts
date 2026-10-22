import { describe, expect, it } from "vitest";

import {
  toAttribution,
  toCohorts,
  toOverview,
  toPushDelivery,
  toTimeseries,
} from "./normalize";

describe("analytics normalizers", () => {
  it("keeps nulls honest instead of turning them into zeros", () => {
    const o = toOverview(
      {
        period: "7d",
        kpis: {
          walletsReached: { value: 5480, previous: 4875, changePct: 12.4 },
          onChainConversions: { value: null, previous: null, changePct: null },
        },
        meta: { notes: ["Conversions are not configured."] },
      },
      "30d"
    );
    expect(o.period).toBe("7d");
    expect(o.kpis.walletsReached).toEqual({
      value: 5480,
      previous: 4875,
      changePct: 12.4,
    });
    expect(o.kpis.onChainConversions.value).toBeNull();
    expect(o.kpis.emailOpenRate).toEqual({
      value: null,
      previous: null,
      changePct: null,
    });
    expect(o.meta?.notes).toEqual(["Conversions are not configured."]);
  });

  it("falls back to the requested period and an empty response", () => {
    expect(toOverview(null, "90d").period).toBe("90d");
    expect(toTimeseries(undefined, "7d")).toMatchObject({
      period: "7d",
      grain: "day",
      series: [],
    });
    expect(toCohorts("nope")).toEqual({ cohorts: [] });
  });

  it("reads numeric strings and drops malformed rows", () => {
    const p = toPushDelivery(
      { funnel: { queued: "24800", delivered: 18120, medianTimeToView: null } },
      "30d"
    );
    expect(p.funnel.queued).toBe(24800);
    expect(p.funnel.medianTimeToView).toBeNull();
    const a = toAttribution(
      { attributed: { byEvent: [{ event: "swap", count: 4 }, { count: 2 }] } },
      "30d"
    );
    expect(a.attributed.byEvent).toEqual([{ event: "swap", count: 4 }]);
    expect(a.windowHours).toBe(72);
  });
});
