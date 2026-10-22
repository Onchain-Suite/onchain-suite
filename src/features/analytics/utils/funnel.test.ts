import { describe, expect, it } from "vitest";

import { campaignFunnelSteps, funnelSankey, worstDrop } from "./funnel";

const STEPS = [
  { name: "Reached", value: 1000 },
  { name: "Engaged", value: 400 },
  { name: "Clicked", value: 100 },
];

describe("funnel", () => {
  it("branches the people lost after each step", () => {
    const s = funnelSankey(STEPS);
    expect(s.nodes.map((n) => n.name)).toEqual([
      "Reached",
      "Engaged",
      "Clicked",
      "Lost after reached",
      "Lost after engaged",
    ]);
    expect(s.links).toEqual([
      { source: 0, target: 1, value: 400 },
      { source: 0, target: 3, value: 600 },
      { source: 1, target: 2, value: 100 },
      { source: 1, target: 4, value: 300 },
    ]);
  });

  it("never lets a later step exceed an earlier one", () => {
    expect(
      funnelSankey([
        { name: "A", value: 10 },
        { name: "B", value: 30 },
      ]).nodes[1]?.value
    ).toBe(10);
  });

  it("names the biggest drop as a share of the top", () => {
    expect(worstDrop(STEPS)).toEqual({
      from: "Reached",
      to: "Engaged",
      lost: 600,
      pctOfTop: 60,
    });
    expect(worstDrop([{ name: "A", value: 0 }])).toBeNull();
  });

  it("adds Converted only when conversions are counted", () => {
    const c = {
      email: { delivered: 80, uniqueOpens: 30, uniqueClicks: 6 },
      inapp: { delivered: 20, viewed: 15, clicked: 4 },
    };
    expect(campaignFunnelSteps(c, undefined).map((s) => s.value)).toEqual([
      100, 45, 10,
    ]);
    const attribution = {
      period: "30d" as const,
      windowHours: 72,
      conversionEvents: ["swap"],
      attributed: { conversions: 5, wallets: 3, byEvent: [] },
    };
    expect(campaignFunnelSteps(c, attribution).at(-1)).toEqual({
      name: "Converted",
      value: 3,
    });
  });
});
