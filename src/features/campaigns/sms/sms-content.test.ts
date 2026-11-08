import { describe, expect, it } from "vitest";

import { countSmsSegments } from "../utils/sms-segments";
import {
  smsContent,
  smsFormValues,
  smsLinks,
  TRACKED_LINK_CHARS,
  withTrackedLinks,
} from "./sms-content";

describe("sms content", () => {
  it("finds the links the backend would track, leaving sentence punctuation out", () => {
    expect(smsLinks("Claim at https://acme.xyz/c. Or http://a.co")).toEqual([
      "https://acme.xyz/c",
      "http://a.co",
    ]);
    expect(smsLinks("no links, acme.xyz")).toEqual([]);
  });

  it("estimates the tracked text at a tracked link's length, without changing encoding", () => {
    const text = "Mint now https://a.co/x!";
    const tracked = withTrackedLinks(text);
    expect(tracked.length).toBe("Mint now ".length + TRACKED_LINK_CHARS + 1);
    expect(tracked.endsWith("!")).toBe(true);
    expect(countSmsSegments(tracked).encoding).toBe("GSM-7");
  });

  it("a short text with a link can cross into a second segment once tracked", () => {
    const text = `${"x".repeat(100)} https://a.co`;
    expect(countSmsSegments(text).segments).toBe(1);
    expect(countSmsSegments(withTrackedLinks(text)).segments).toBe(2);
  });

  it("saves tracking off unless switched on, and reads it back", () => {
    expect(smsContent({ smsBody: " hi " })).toEqual({
      body: "hi",
      trackLinks: false,
    });
    expect(smsContent({ smsBody: "hi", smsTrackLinks: true })).toEqual({
      body: "hi",
      trackLinks: true,
    });
    expect(smsFormValues({ body: "hi", trackLinks: true })).toEqual({
      smsBody: "hi",
      smsTrackLinks: true,
    });
    expect(smsFormValues({ text: "old" })).toEqual({
      smsBody: "old",
      smsTrackLinks: false,
    });
  });
});
