import { describe, expect, it } from "vitest";

import { countSmsSegments } from "./sms-segments";

describe("countSmsSegments", () => {
  it("is zero for an empty message", () => {
    expect(countSmsSegments("")).toEqual({
      encoding: "GSM-7",
      units: 0,
      segments: 0,
    });
  });

  it("fits 160 GSM-7 characters in one segment", () => {
    expect(countSmsSegments("a".repeat(160)).segments).toBe(1);
  });

  it("splits GSM-7 at 153 per part once it exceeds 160", () => {
    // 161 chars is 2 parts, not 2 by /160: and 307 needs 3 (2 x 153 = 306).
    expect(countSmsSegments("a".repeat(161)).segments).toBe(2);
    expect(countSmsSegments("a".repeat(306)).segments).toBe(2);
    expect(countSmsSegments("a".repeat(307)).segments).toBe(3);
  });

  it("charges GSM extension characters two septets", () => {
    // 80 euro signs = 160 septets: still one segment, but one more tips it over.
    expect(countSmsSegments("€".repeat(80))).toMatchObject({
      encoding: "GSM-7",
      units: 160,
      segments: 1,
    });
    expect(countSmsSegments("€".repeat(81)).segments).toBe(2);
  });

  it("switches the whole message to UCS-2 for one non-GSM character", () => {
    const text = `${"a".repeat(69)}’`; // a curly apostrophe is not GSM-7
    expect(countSmsSegments(text)).toMatchObject({
      encoding: "UCS-2",
      units: 70,
      segments: 1,
    });
    expect(countSmsSegments(`${text}a`).segments).toBe(2); // 71 > 70, at 67/part
    expect(countSmsSegments(`${"a".repeat(134)}’`).segments).toBe(3); // 135 / 67
  });

  it("counts an emoji as two UCS-2 units", () => {
    expect(countSmsSegments("🎉")).toMatchObject({
      encoding: "UCS-2",
      units: 2,
      segments: 1,
    });
  });

  it("understated what the old length/160 counter reported", () => {
    // The previous counter said 1 segment for a 100-char message with an emoji.
    const text = `${"a".repeat(98)}🎉`;
    expect(countSmsSegments(text).segments).toBe(2);
  });
});
