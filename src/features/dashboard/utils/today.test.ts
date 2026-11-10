import { describe, expect, it } from "vitest";

import { listOf, parseDismissed, todayItems, todaySummary } from "./today";

const none = {
  unread: { count: 0 },
  pausedLoops: [],
  campaigns: [],
};

describe("todayItems", () => {
  it("is empty when nothing needs anyone", () => {
    expect(todayItems({ ...none, domainVerified: true })).toEqual([]);
  });

  it("does not raise a domain alarm while the domain status is unknown", () => {
    expect(todayItems(none)).toEqual([]);
    expect(todayItems({ ...none, domainVerified: false })[0]?.id).toBe(
      "sender"
    );
  });

  it("puts replies first and quotes the latest one", () => {
    const items = todayItems({
      ...none,
      unread: {
        count: 3,
        latest: {
          id: "t1",
          from: "maya.eth",
          snippet: "Is there a way to move my position?",
        },
      },
      pausedLoops: [{ id: "l1", name: "Dormant win-back", entries: 164 }],
      campaigns: [{ id: "c1", name: "Launch", status: "draft" }],
    });
    expect(items.map((i) => i.id)).toEqual([
      "replies",
      "loop-paused:l1",
      "drafts",
    ]);
    expect(items[0]?.title).toBe("3 replies are waiting for you");
    expect(items[0]?.why).toBe(
      "Latest from maya.eth: “Is there a way to move my position?”"
    );
    expect(items[0]?.action.href).toBe("/inbox?thread=t1");
    expect(items[1]?.why).toContain("164 people entered it");
  });

  it("folds scheduled sends into one item, soonest first", () => {
    const items = todayItems({
      ...none,
      campaigns: [
        {
          id: "b",
          name: "Later",
          status: "scheduled",
          scheduledFor: new Date("2026-12-02"),
        },
        {
          id: "a",
          name: "Sooner",
          status: "scheduled",
          scheduledFor: new Date("2026-12-01"),
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("2 sends are scheduled");
    expect(items[0]?.why).toBe(
      "“Sooner” and “Later”. Give each a last read before it sends."
    );
  });

  it("names one scheduled send and who it goes to", () => {
    const [item] = todayItems({
      ...none,
      campaigns: [
        { id: "a", name: "Pack drop", status: "scheduled", recipients: 259 },
      ],
    });
    expect(item?.title).toBe("Pack drop is scheduled");
    expect(item?.why).toBe(
      "Goes to 259 people. Give it a last read before it sends."
    );
    expect(item?.action.href).toBe("/campaigns/a");
  });
});

describe("todaySummary", () => {
  it("counts the urgent ones", () => {
    const items = todayItems({
      ...none,
      unread: { count: 1 },
      campaigns: [{ id: "c", name: "D", status: "draft" }],
    });
    expect(todaySummary(items)).toEqual({ count: 2, now: 1 });
  });
});

describe("listOf", () => {
  it("names two and counts the rest", () => {
    expect(listOf(["a", "b", "c", "d"])).toBe("a, b and 2 others");
  });
});

describe("parseDismissed", () => {
  const today = new Date("2026-11-10T09:00:00Z");
  it("keeps today's dismissals and forgets yesterday's", () => {
    expect(
      parseDismissed(
        JSON.stringify({ day: "2026-11-10", ids: ["drafts"] }),
        today
      )
    ).toEqual(new Set(["drafts"]));
    expect(
      parseDismissed(
        JSON.stringify({ day: "2026-11-09", ids: ["drafts"] }),
        today
      )
    ).toEqual(new Set());
    expect(parseDismissed("junk", today)).toEqual(new Set());
  });
});
