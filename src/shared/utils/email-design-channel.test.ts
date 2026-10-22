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

  it("accepts a node design message (designId + nodeId + html, no campaign)", () => {
    const msg = parseEmailDesignMessage({
      type: "email-design-saved",
      designId: "dsn_1",
      nodeId: "node_a",
      subject: "Hi",
      html: "<p>body</p>",
    });
    expect(msg?.designId).toBe("dsn_1");
    expect(msg?.nodeId).toBe("node_a");
    expect(msg?.html).toBe("<p>body</p>");
    expect(msg?.campaignId).toBeUndefined();
  });

  it("rejects a message with neither campaignId nor designId", () => {
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
