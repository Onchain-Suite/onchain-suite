import { describe, expect, it } from "vitest";

import type { CampaignFormData } from "../validations";
import { farcasterContent, notificationOutcome } from "./farcaster-send";

const form = (over: Partial<CampaignFormData>) =>
  ({
    farcasterText: " a cast ",
    farcasterDelivery: "cast",
    farcasterNotificationAudience: "all",
    ...over,
  }) as CampaignFormData;

describe("farcasterContent", () => {
  it("saves only the cast for a cast", () => {
    expect(farcasterContent(form({}))).toEqual({
      text: "a cast",
      delivery: "cast",
    });
  });

  it("saves the notification, trimmed, with its audience", () => {
    expect(
      farcasterContent(
        form({
          farcasterDelivery: "notification",
          farcasterNotificationTitle: " Season 2 ",
          farcasterNotificationBody: "Claim it",
          farcasterNotificationUrl: "https://app.acme.xyz/claim ",
          farcasterNotificationAudience: "campaign",
        })
      )
    ).toEqual({
      text: "a cast",
      delivery: "notification",
      notification: {
        title: "Season 2",
        body: "Claim it",
        targetUrl: "https://app.acme.xyz/claim",
        audience: "campaign",
      },
    });
  });
});

describe("notificationOutcome", () => {
  it("counts who it reached", () => {
    expect(notificationOutcome({ calls: 1, successCount: 48_210 })).toEqual({
      level: "success",
      message: "Notification delivered to 48,210 people.",
      done: true,
    });
  });

  it("says a queued broadcast is on its way", () => {
    expect(notificationOutcome({ queued: true })).toMatchObject({
      level: "success",
      done: true,
    });
  });

  it("never claims a send that already went out", () => {
    expect(notificationOutcome({ calls: 0, alreadySent: 1 })).toMatchObject({
      level: "warning",
      message: expect.stringMatching(/already went out/),
      done: false,
    });
  });

  it("says plainly when nobody had notifications on", () => {
    expect(
      notificationOutcome({ calls: 3, successCount: 0, audience: "campaign" })
    ).toMatchObject({ level: "warning", done: false });
  });
});
