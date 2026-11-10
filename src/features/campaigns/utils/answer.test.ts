import { describe, expect, it } from "vitest";

import type { Campaign } from "../types/campaign";
import { campaignsAnswer, joinAnd } from "./answer";

const c = (over: Partial<Campaign>): Campaign => ({
  id: over.name ?? "x",
  name: "x",
  type: "email-blast",
  status: "sent",
  subject: "",
  audience: [],
  createdAt: new Date(0),
  ...over,
});

describe("campaignsAnswer", () => {
  it("counts sent campaigns and the messages they sent", () => {
    const a = campaignsAnswer([
      c({ name: "A", recipients: 687, openRateOfDelivered: 51 }),
      c({ name: "B", recipients: 481, openRateOfDelivered: 45 }),
      c({ name: "C", status: "draft" }),
    ]);
    expect(a.sent).toBe(2);
    expect(a.messages).toBe(1168);
    expect(a.best).toEqual({ name: "A", openRate: 51 });
  });

  it("falls back to the audience rate and skips campaigns with no rate", () => {
    const a = campaignsAnswer([
      c({ name: "A", recipients: 10 }),
      c({ name: "B", recipients: 10, openRateOfAudience: 30 }),
    ]);
    expect(a.best?.name).toBe("B");
  });

  it("says what is still to go, in order", () => {
    const a = campaignsAnswer([
      c({ status: "scheduled" }),
      c({ status: "scheduled" }),
      c({ status: "draft" }),
      c({ status: "paused" }),
    ]);
    expect(a.waiting).toBe("2 are scheduled, 1 is a draft and 1 is paused");
    expect(a.sent).toBe(0);
    expect(a.best).toBeUndefined();
  });

  it("joins lists the way people write them", () => {
    expect(joinAnd([])).toBe("");
    expect(joinAnd(["a"])).toBe("a");
    expect(joinAnd(["a", "b"])).toBe("a and b");
  });
});
