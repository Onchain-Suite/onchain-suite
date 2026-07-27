import { describe, expect, it } from "vitest";

import {
  domainFromSender,
  parseSenderNotVerified,
  SENDER_NOT_VERIFIED,
  withApiErrorFields,
} from "./launch-errors";

const senderError = (details: unknown) =>
  withApiErrorFields(new Error("[HTTP 400] Sender not verified"), {
    code: SENDER_NOT_VERIFIED,
    details,
  });

describe("domainFromSender", () => {
  it("takes the domain from an address", () => {
    expect(domainFromSender("no-reply@vault777.com")).toBe("vault777.com");
  });

  it("passes a bare domain through, normalized", () => {
    expect(domainFromSender("  VAULT777.com ")).toBe("vault777.com");
  });

  it("returns empty for empty input", () => {
    expect(domainFromSender("   ")).toBe("");
  });
});

describe("parseSenderNotVerified", () => {
  it("returns null for an unrelated error, so generic handling still runs", () => {
    expect(parseSenderNotVerified(new Error("boom"))).toBeNull();
  });

  it("returns null for a different backend code", () => {
    const other = withApiErrorFields(new Error("nope"), {
      code: "CAMPAIGN_NOT_READY",
      details: { sender: "no-reply@vault777.com" },
    });
    expect(parseSenderNotVerified(other)).toBeNull();
  });

  it("derives the domain from the requested sender address", () => {
    expect(
      parseSenderNotVerified(senderError({ sender: "no-reply@vault777.com" }))
    ).toEqual({ sender: "no-reply@vault777.com", domain: "vault777.com" });
  });

  it("prefers an explicit domain when the backend supplies one", () => {
    expect(
      parseSenderNotVerified(
        senderError({
          senderEmail: "hi@mail.vault777.com",
          domain: "vault777.com",
        })
      )
    ).toEqual({ sender: "hi@mail.vault777.com", domain: "vault777.com" });
  });

  it("still reports the domain when only a domain is given", () => {
    expect(
      parseSenderNotVerified(senderError({ domain: "vault777.com" }))
    ).toEqual({ sender: "", domain: "vault777.com" });
  });

  it("degrades to empty strings rather than throwing on an unexpected shape", () => {
    expect(parseSenderNotVerified(senderError(undefined))).toEqual({
      sender: "",
      domain: "",
    });
    expect(parseSenderNotVerified(senderError("nope"))).toEqual({
      sender: "",
      domain: "",
    });
  });
});
