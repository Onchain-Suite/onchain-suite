import { describe, expect, it } from "vitest";

import { toDmPreflight } from "./dm-send.service";
import { dmChannelFor } from "./use-dm-send";

const raw = {
  channel: "telegram",
  reachable: 2500.7,
  estimatedDurationSeconds: 100,
  cost: {
    provider: "Telegram",
    usdPerMessage: 0,
    estimatedUsd: 0,
    billedTo: "client",
  },
  consent: {
    version: "telegram-dm-2026-11-07",
    platform: "Telegram",
    rule: "A bot can only message people who started it.",
    risk: "Spam reports can get your bot banned.",
    policyUrl: "https://telegram.org/tos/bot-developers",
    statements: ["All 2,500 people started our bot.", 42, ""],
    accepted: { acceptedAt: "2026-11-07T00:00:00Z" },
  },
};

describe("toDmPreflight", () => {
  it("keeps what the client consents to and drops junk", () => {
    expect(toDmPreflight(raw)).toMatchObject({
      channel: "telegram",
      reachable: 2500,
      consent: {
        version: "telegram-dm-2026-11-07",
        statements: ["All 2,500 people started our bot."],
        accepted: true,
      },
    });
  });

  it("is null without statements or a version: nothing to consent to", () => {
    expect(
      toDmPreflight({ ...raw, consent: { ...raw.consent, statements: [] } })
    ).toBeNull();
    expect(
      toDmPreflight({ ...raw, consent: { ...raw.consent, version: "" } })
    ).toBeNull();
    expect(toDmPreflight({ ...raw, channel: "sms" })).toBeNull();
    expect(toDmPreflight(null)).toBeNull();
  });

  it("never links to a non-https policy page", () => {
    const p = toDmPreflight({
      ...raw,
      consent: { ...raw.consent, policyUrl: "http://example.com/rule" },
    });
    expect(p?.consent.policyUrl).toBe("");
  });
});

describe("dmChannelFor", () => {
  it("is Telegram always, X and Discord only in DM mode", () => {
    expect(
      dmChannelFor({
        channel: "telegram",
        xDelivery: "post",
        discordDelivery: "post",
      })
    ).toBe("telegram");
    expect(
      dmChannelFor({ channel: "x", xDelivery: "post", discordDelivery: "post" })
    ).toBeNull();
    expect(
      dmChannelFor({ channel: "x", xDelivery: "dm", discordDelivery: "post" })
    ).toBe("x");
    expect(
      dmChannelFor({
        channel: "discord",
        xDelivery: "post",
        discordDelivery: "dm",
      })
    ).toBe("discord");
    expect(
      dmChannelFor({ channel: "email", xDelivery: "dm", discordDelivery: "dm" })
    ).toBeNull();
  });
});
