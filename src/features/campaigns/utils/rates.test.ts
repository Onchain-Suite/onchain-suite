import { describe, expect, it } from "vitest";

import { displayStatus, sendProgressLabel, settlingTitle } from "./rates";

describe("settlingTitle", () => {
  it("explains why there is no rate yet", () => {
    expect(settlingTitle(undefined)).toMatch(
      /0% until about an hour after sending/
    );
    expect(settlingTitle(undefined)).not.toMatch(/Ready at/);
  });

  it("adds the ready time when the backend sends one", () => {
    expect(settlingTitle("2026-11-13T15:38:00.000Z")).toMatch(/Ready at \d/);
  });

  it("ignores a time it cannot read", () => {
    expect(settlingTitle("not a date")).not.toMatch(/Ready at/);
  });
});

describe("send progress on a sent campaign", () => {
  const sent = { status: "sent" as const };

  it("reads Sending, with the count, while emails are still leaving", () => {
    const c = {
      ...sent,
      sendProgress: { sent: 1341, total: 3235, state: "sending" as const },
    };
    expect(displayStatus(c)).toBe("sending");
    expect(sendProgressLabel(c)).toBe("1,341 of 3,235 sent");
  });

  it("reads Partly sent past the stale limit, with the count", () => {
    const c = {
      ...sent,
      sendProgress: { sent: 1723, total: 3019, state: "partly_sent" as const },
    };
    expect(displayStatus(c)).toBe("partly_sent");
    expect(sendProgressLabel(c)).toBe("1,723 of 3,019 sent");
  });

  it("reads Sent with no count once everything has left", () => {
    const c = {
      ...sent,
      sendProgress: { sent: 3019, total: 3019, state: "sent" as const },
    };
    expect(displayStatus(c)).toBe("sent");
    expect(sendProgressLabel(c)).toBeNull();
  });

  it("leaves every other status, and rows without progress, as they were", () => {
    expect(displayStatus({ status: "sent" })).toBe("sent");
    expect(
      displayStatus({
        status: "draft",
        sendProgress: { sent: 1, total: 2, state: "sending" },
      })
    ).toBe("draft");
    expect(
      sendProgressLabel({
        status: "scheduled",
        sendProgress: { sent: 1, total: 2, state: "sending" },
      })
    ).toBeNull();
  });
});
