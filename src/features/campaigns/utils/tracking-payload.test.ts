import { describe, expect, it } from "vitest";

import { buildTrackingPayload, trackingToFormValues } from "./tracking-payload";

const base = {
  smartSending: true,
  smartSendingWindowHours: "",
  trackingParameters: false,
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmTerm: "",
  utmContent: "",
};

describe("buildTrackingPayload", () => {
  it("always sends sendToUnengaged, false by default", () => {
    // The backend reads an omitted key as false, so leaving it out on a
    // Continue flush would switch an opted-in campaign back to skipping.
    expect(buildTrackingPayload(base)).toEqual({
      smartSending: true,
      trackingParameters: false,
      sendToUnengaged: false,
    });
    expect(
      buildTrackingPayload({ ...base, sendToUnengaged: true }).sendToUnengaged
    ).toBe(true);
  });

  it("never sends the read-only applySunset", () => {
    expect(buildTrackingPayload(base)).not.toHaveProperty("applySunset");
  });

  it("keeps the window override only when it is 1-168", () => {
    expect(
      buildTrackingPayload({ ...base, smartSendingWindowHours: "24" })
        .smartSendingWindowHours
    ).toBe(24);
    expect(
      buildTrackingPayload({ ...base, smartSendingWindowHours: "500" })
    ).not.toHaveProperty("smartSendingWindowHours");
  });

  it("adds utm only when tracking is on and a value is set", () => {
    expect(
      buildTrackingPayload({ ...base, utmSource: "x" })
    ).not.toHaveProperty("utm");
    expect(
      buildTrackingPayload({
        ...base,
        trackingParameters: true,
        utmSource: " news ",
      }).utm
    ).toEqual({ source: "news" });
  });

  it("produces identical JSON for identical input (change cache)", () => {
    const a = JSON.stringify(
      buildTrackingPayload({ ...base, sendToUnengaged: true })
    );
    const b = JSON.stringify(
      buildTrackingPayload({ ...base, sendToUnengaged: true })
    );
    expect(a).toBe(b);
  });
});

describe("trackingToFormValues", () => {
  it("hydrates sendToUnengaged from GET tracking", () => {
    expect(
      trackingToFormValues({ applySunset: false, sendToUnengaged: true })
        .sendToUnengaged
    ).toBe(true);
  });

  it("ignores applySunset alone: an old backend always stored false", () => {
    expect(trackingToFormValues({ applySunset: false })).not.toHaveProperty(
      "sendToUnengaged"
    );
  });

  it("maps the window and utm values", () => {
    expect(
      trackingToFormValues({
        smartSending: false,
        smartSendingWindowHours: 12,
        trackingParameters: true,
        utm: { source: "a", campaign: "b" },
      })
    ).toEqual({
      smartSending: false,
      smartSendingWindowHours: "12",
      trackingParameters: true,
      utmSource: "a",
      utmCampaign: "b",
    });
  });
});
