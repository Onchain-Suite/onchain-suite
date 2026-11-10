import { describe, expect, it } from "vitest";

import { BUILT_IN } from "./dashboards";
import {
  chartsLabel,
  DEFAULT_DASHBOARDS,
  defaultFor,
  headlineFor,
} from "./gallery";

const overview = (
  sent: number,
  open: number,
  active: number,
  conv: number
) => ({
  messagesSent: { value: sent },
  openRate: { value: open },
  activeWallets: { value: active },
  convertedOnchain: { value: conv },
});

describe("default dashboards", () => {
  it("cover every built-in tab exactly once", () => {
    const tabs = DEFAULT_DASHBOARDS.flatMap((d) => d.tabs.map((t) => t.id));
    expect([...tabs].sort()).toEqual(BUILT_IN.map((b) => b.id).sort());
  });

  it("find the dashboard a tab belongs to", () => {
    expect(defaultFor("engagement")?.name).toBe("Growth");
    expect(defaultFor("retention")?.name).toBe("Retention");
    expect(defaultFor("custom-123")).toBeUndefined();
  });
});

describe("headlineFor", () => {
  it("says what Growth sent and how much was opened", () => {
    expect(headlineFor("growth", overview(1182, 42.35, 0, 0))).toEqual([
      { value: "1,182", label: "sent" },
      { value: "42.4%", label: "opened" },
    ]);
  });

  it("claims nothing before anything is measured", () => {
    expect(headlineFor("growth", overview(0, 0, 0, 0))).toEqual([]);
    expect(headlineFor("retention", overview(0, 0, 0, 0))).toEqual([]);
    expect(headlineFor("growth", undefined)).toEqual([]);
  });

  it("leaves out the retention parts that are zero", () => {
    expect(headlineFor("retention", overview(0, 0, 310, 0))).toEqual([
      { value: "310", label: "active wallets" },
    ]);
  });
});

it("labels chart counts", () => {
  expect(chartsLabel(0)).toBe("No charts yet");
  expect(chartsLabel(1)).toBe("1 chart");
  expect(chartsLabel(4)).toBe("4 charts");
});
