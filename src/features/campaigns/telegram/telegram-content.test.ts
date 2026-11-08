import { describe, expect, it } from "vitest";

import { dmChannelFor } from "../dm-send/use-dm-send";
import { socialSender } from "../social-send";
import type { CampaignFormData } from "../validations";
import {
  restoreTelegram,
  telegramChannelOutcome,
  telegramContent,
} from "./telegram-content";

describe("telegramContent / restoreTelegram", () => {
  it("saves the channel only for a channel post, and restores it", () => {
    const saved = telegramContent({
      telegramText: " Season 2 ",
      telegramDelivery: "channel",
      telegramChannel: " @acme_news ",
    });
    expect(saved).toEqual({
      text: "Season 2",
      delivery: "channel",
      channel: "@acme_news",
    });
    expect(restoreTelegram(saved)).toEqual({
      telegramText: "Season 2",
      telegramDelivery: "channel",
      telegramChannel: "@acme_news",
    });
    expect(
      telegramContent({ telegramText: "gm", telegramDelivery: "dm" })
    ).toEqual({ text: "gm", delivery: "dm" });
  });
});

describe("routing a Telegram campaign", () => {
  const data = (telegramDelivery: "dm" | "channel") =>
    ({ channel: "telegram", telegramDelivery }) as CampaignFormData;

  it("sends DMs through the consent dialog and channel posts directly", () => {
    expect(dmChannelFor(data("dm"))).toBe("telegram");
    expect(socialSender(data("dm"))).toBeNull();
    expect(dmChannelFor(data("channel"))).toBeNull();
    expect(socialSender(data("channel"))).toBeTypeOf("function");
  });
});

describe("telegramChannelOutcome", () => {
  it("says how many subscribers the post reached", () => {
    expect(
      telegramChannelOutcome({ channel: "@acme_news", subscribers: 12_400 })
    ).toEqual({
      level: "success",
      message: "Posted to @acme_news, which has 12,400 subscribers.",
      done: true,
    });
  });

  it("never claims a second post that didn't happen", () => {
    expect(
      telegramChannelOutcome({ channel: "@acme_news", alreadyPosted: true })
    ).toMatchObject({ level: "warning", done: false });
  });
});
