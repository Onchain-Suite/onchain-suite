import { describe, expect, it } from "vitest";

import { parseEmailDesignMessage } from "./email-design-channel";

describe("parseEmailDesignMessage", () => {
  it("accepts a well-formed message and trims the optional fields", () => {
    expect(
      parseEmailDesignMessage({
        type: "email-design-saved",
        campaignId: "camp_1",
        templateId: " tpl_1 ",
        subject: " Welcome ",
        previewText: " Hi ",
      })
    ).toEqual({
      type: "email-design-saved",
      campaignId: "camp_1",
      templateId: "tpl_1",
      subject: "Welcome",
      previewText: "Hi",
    });
  });

  it("keeps campaignId and drops optional fields that are absent", () => {
    expect(
      parseEmailDesignMessage({
        type: "email-design-saved",
        campaignId: "camp_2",
      })
    ).toEqual({
      type: "email-design-saved",
      campaignId: "camp_2",
      templateId: undefined,
      subject: undefined,
      previewText: undefined,
    });
  });

  it("rejects the wrong message type", () => {
    expect(
      parseEmailDesignMessage({ type: "something-else", campaignId: "camp_1" })
    ).toBeNull();
  });

  it("rejects a message with no campaignId", () => {
    expect(parseEmailDesignMessage({ type: "email-design-saved" })).toBeNull();
    expect(
      parseEmailDesignMessage({ type: "email-design-saved", campaignId: "  " })
    ).toBeNull();
  });

  it("rejects non-object payloads", () => {
    expect(parseEmailDesignMessage(null)).toBeNull();
    expect(parseEmailDesignMessage("email-design-saved")).toBeNull();
    expect(parseEmailDesignMessage(42)).toBeNull();
  });
});
