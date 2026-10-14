import { describe, expect, it } from "vitest";

import type { AudienceProfile } from "../audience.service";
import {
  daysSince,
  deriveStage,
  stageForProfile,
  stageMeta,
  STAGES,
} from "./lifecycle";

describe("deriveStage", () => {
  it("is dormant past 30 days regardless of health", () => {
    expect(
      deriveStage({ healthScore: 90, daysSinceActive: 31, reachableCount: 2 })
    ).toBe("dormant");
  });

  it("is at_risk on low health before dormancy", () => {
    expect(deriveStage({ healthScore: 20, daysSinceActive: 3 })).toBe(
      "at_risk"
    );
  });

  it("is new when recently seen, flagged new, and not low-health", () => {
    expect(
      deriveStage({ healthScore: 70, daysSinceActive: 2, isNew: true })
    ).toBe("new");
  });

  it("is engaged on high health when reachable", () => {
    expect(
      deriveStage({ healthScore: 80, daysSinceActive: 2, reachableCount: 1 })
    ).toBe("engaged");
  });

  it("falls back to activated when engaged conditions are not met", () => {
    // High health but unreachable -> not engaged.
    expect(
      deriveStage({ healthScore: 80, daysSinceActive: 2, reachableCount: 0 })
    ).toBe("activated");
  });

  it("only reports reactivated when the previous stage was dormant", () => {
    expect(
      deriveStage({
        healthScore: 80,
        daysSinceActive: 3,
        reachableCount: 1,
        previousStage: "dormant",
      })
    ).toBe("reactivated");
    // Same inputs without the dormant history read as engaged, not reactivated.
    expect(
      deriveStage({ healthScore: 80, daysSinceActive: 3, reachableCount: 1 })
    ).toBe("engaged");
  });

  it("uses engagement buckets when no health score is present", () => {
    expect(deriveStage({ engagement: "cooling", daysSinceActive: 5 })).toBe(
      "at_risk"
    );
    expect(
      deriveStage({
        engagement: "active",
        daysSinceActive: 5,
        reachableCount: 1,
      })
    ).toBe("engaged");
    expect(deriveStage({ engagement: "cold" })).toBe("dormant");
  });
});

describe("daysSince", () => {
  it("counts whole days from a timestamp", () => {
    const now = new Date("2026-01-31T00:00:00Z").getTime();
    expect(daysSince("2026-01-01T00:00:00Z", now)).toBe(30);
  });

  it("returns null for absent or unparseable values", () => {
    expect(daysSince(null)).toBeNull();
    expect(daysSince(undefined)).toBeNull();
    expect(daysSince("not a date")).toBeNull();
  });
});

describe("stageForProfile", () => {
  const now = new Date("2026-01-31T00:00:00Z").getTime();
  const base: AudienceProfile = { id: "c1" };

  it("derives dormant from an old lastActionAt", () => {
    const p: AudienceProfile = {
      ...base,
      lastActionAt: "2025-12-01T00:00:00Z",
      healthScore: 90,
    };
    expect(stageForProfile(p, now)).toBe("dormant");
  });

  it("reads lastAction.at when lastActionAt is absent", () => {
    const p: AudienceProfile = {
      ...base,
      lastAction: { at: "2026-01-29T00:00:00Z" },
      healthScore: 10,
    };
    expect(stageForProfile(p, now)).toBe("at_risk");
  });
});

describe("STAGES / stageMeta", () => {
  it("exposes all six stages with unique ids", () => {
    const ids = STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(6);
  });

  it("looks up metadata by id", () => {
    expect(stageMeta("dormant").label).toBe("Dormant");
    expect(stageMeta("dormant").tone).toBe("bad");
  });
});
