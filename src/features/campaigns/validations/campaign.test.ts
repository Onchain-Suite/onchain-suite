import { describe, expect, it } from "vitest";

import { campaignFormSchema } from "./campaign";

/** The fields every campaign has, with a blank subject (the composer default). */
const base = {
  campaignName: "Launch",
  campaignType: "smart-sending",
  selectedAudiences: ["seg_1"],
  sendOption: "now",
  emailSubject: "",
};

const issuePaths = (input: Record<string, unknown>): string[] => {
  const result = campaignFormSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
};

describe("campaignFormSchema subject rule", () => {
  // These channels have no subject field. The subject used to be required for
  // every channel, so a fresh SMS (or Telegram, WhatsApp...) campaign could not
  // pass Continue or open the send dialog: it failed on a field it never shows.
  it.each([
    ["sms", { smsBody: "gm" }],
    ["telegram", { telegramText: "gm" }],
    ["whatsapp", { whatsappTemplateName: "launch_v1" }],
    ["discord", { discordText: "gm", discordChannelId: "123" }],
    ["x", { xText: "gm" }],
    ["farcaster", { farcasterText: "gm" }],
  ])("does not require a subject for %s", (channel, content) => {
    expect(issuePaths({ ...base, channel, ...content })).toEqual([]);
  });

  it("still requires the subject for email", () => {
    expect(
      issuePaths({
        ...base,
        channel: "email",
        senderName: "Acme",
        senderEmail: "hi@acme.xyz",
      })
    ).toEqual(["emailSubject"]);
  });

  it("still requires the subject (the push title) for in-app push", () => {
    expect(issuePaths({ ...base, channel: "in-app-push" })).toContain(
      "emailSubject"
    );
  });

  it("requires the DM text, not the post, for an X DM send", () => {
    expect(
      issuePaths({ ...base, channel: "x", xDelivery: "dm", xText: "a post" })
    ).toEqual(["xDmText"]);
    expect(
      issuePaths({ ...base, channel: "x", xDelivery: "dm", xDmText: "gm" })
    ).toEqual([]);
  });

  it("needs no channel id for a Discord DM send", () => {
    expect(
      issuePaths({
        ...base,
        channel: "discord",
        discordDelivery: "dm",
        discordText: "gm",
      })
    ).toEqual([]);
  });

  it("checks a Farcaster notification's title, message and link, not the cast", () => {
    const notification = {
      ...base,
      channel: "farcaster",
      farcasterDelivery: "notification",
    };
    expect(issuePaths(notification).sort()).toEqual([
      "farcasterNotificationBody",
      "farcasterNotificationTitle",
      "farcasterNotificationUrl",
    ]);
    expect(
      issuePaths({
        ...notification,
        farcasterNotificationTitle: "x".repeat(33),
        farcasterNotificationBody: "gm",
        farcasterNotificationUrl: "https://app.acme.xyz/claim",
      })
    ).toEqual(["farcasterNotificationTitle"]);
    expect(
      issuePaths({
        ...notification,
        farcasterNotificationTitle: "Season 2",
        farcasterNotificationBody: "gm",
        farcasterNotificationUrl: "http://app.acme.xyz",
      })
    ).toEqual(["farcasterNotificationUrl"]);
  });

  it("requires an SMS body", () => {
    expect(issuePaths({ ...base, channel: "sms", smsBody: "  " })).toEqual([
      "smsBody",
    ]);
  });
});
