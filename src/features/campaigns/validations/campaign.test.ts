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

  it("requires an SMS body", () => {
    expect(issuePaths({ ...base, channel: "sms", smsBody: "  " })).toEqual([
      "smsBody",
    ]);
  });
});
