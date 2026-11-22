import { describe, expect, it } from "vitest";

import { preflightLines } from "./send-preflight";

describe("preflightLines", () => {
  it("states the reach and the unengaged skip", () => {
    const l = preflightLines({
      recipients: 1200,
      afterSuppression: 1140,
      sunset: {
        applied: true,
        excluded: 60,
        note: "60 contacts excluded as unengaged",
      },
    });
    expect(l.reach).toBe("1,200 selected · 1,140 will receive it");
    expect(l.unengaged).toBe("60 contacts will be skipped as unengaged");
    expect(l.includingUnengaged).toBe(false);
  });

  it("uses the singular for one contact", () => {
    const l = preflightLines({
      recipients: 2,
      afterSuppression: 1,
      sunset: { applied: true, excluded: 1, note: null },
    });
    expect(l.unengaged).toBe("1 contact will be skipped as unengaged");
  });

  it("says nothing about unengaged contacts when none are skipped", () => {
    const l = preflightLines({
      recipients: 10,
      afterSuppression: 10,
      sunset: { applied: true, excluded: 0, note: null },
    });
    expect(l.unengaged).toBeNull();
  });

  it("flags a campaign that includes unengaged contacts", () => {
    const l = preflightLines({
      recipients: 10,
      afterSuppression: 10,
      sunset: { applied: false, excluded: 0, note: null },
    });
    expect(l.includingUnengaged).toBe(true);
    expect(l.unengaged).toBeNull();
  });

  it("works with an older backend that has no sunset block", () => {
    const l = preflightLines({ recipients: 5, afterSuppression: 4 });
    expect(l.reach).toBe("5 selected · 4 will receive it");
    expect(l.unengaged).toBeNull();
    expect(l.includingUnengaged).toBe(false);
  });

  it("returns nothing for a missing or garbled body", () => {
    expect(preflightLines(null).reach).toBeNull();
    expect(
      preflightLines({
        recipients: Number.NaN,
        afterSuppression: 1,
      } as never).reach
    ).toBeNull();
  });
});
