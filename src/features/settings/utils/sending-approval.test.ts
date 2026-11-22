import { describe, expect, it } from "vitest";

import { toSendingApproval } from "../sending-approval.service";
import {
  approvalApplies,
  approvalBanner,
  draftFromApproval,
  missingFieldLabel,
  profileDraftErrors,
  profileDraftToBody,
} from "./sending-approval";

const pending = toSendingApproval({
  success: true,
  data: {
    status: "pending_review",
    tier: "standard",
    requiresApproval: true,
    grandfathered: false,
    limits: {
      dailyMarketingCap: 500,
      pendingDailyMarketingCap: 500,
      sentToday: 37,
    },
    profile: {
      website: "https://example.xyz",
      projectType: "wallet",
      hasSampleHtml: false,
    },
    missing: ["optInSource", "sampleEmail", "expectedMonthlyVolume"],
    review: { reviewedAt: null, reason: null },
  },
});

describe("sending approval", () => {
  it("applies only to a gated, non-grandfathered workspace", () => {
    expect(approvalApplies(pending)).toBe(true);
    expect(approvalApplies({ ...pending, grandfathered: true })).toBe(false);
    expect(approvalApplies({ ...pending, requiresApproval: false })).toBe(
      false
    );
    expect(approvalBanner({ ...pending, grandfathered: true })).toBeNull();
  });

  it("states the pending cap with what was sent today", () => {
    const b = approvalBanner(pending);
    expect(b?.tone).toBe("pending");
    expect(b?.title).toBe(
      "You can send up to 500 marketing emails a day until we approve your account"
    );
    expect(b?.body).toMatch(/^37 of 500 sent today\./);
  });

  it("shows the rejection reason", () => {
    const b = approvalBanner({
      ...pending,
      status: "rejected",
      review: {
        reviewedAt: "2026-11-22T00:00:00Z",
        reason: "The list was purchased.",
      },
    });
    expect(b?.tone).toBe("rejected");
    expect(b?.body).toContain("The list was purchased.");
  });

  it("names missing fields in plain words", () => {
    expect(missingFieldLabel("sampleEmail")).toBe("A sample email");
    expect(missingFieldLabel("somethingNew")).toBe("Something New");
  });

  it("validates the draft the way the backend does", () => {
    const d = draftFromApproval(pending);
    expect(
      profileDraftErrors({ ...d, website: "example" }).website
    ).toBeTruthy();
    expect(
      profileDraftErrors({ ...d, optInSource: "short" }).optInSource
    ).toBeTruthy();
    expect(
      profileDraftErrors({ ...d, expectedMonthlyVolume: "12.5" })
        .expectedMonthlyVolume
    ).toBeTruthy();
    expect(profileDraftErrors(d)).toEqual({});
  });

  it("sends only filled fields, and the chosen sample kind", () => {
    const d = draftFromApproval(pending);
    expect(
      profileDraftToBody({
        ...d,
        optInSource: "Signup form with double opt-in",
        sampleMode: "html",
        sampleDesignId: "ignored",
        sampleHtml: "<p>Hi</p>",
        expectedMonthlyVolume: "20000",
      })
    ).toEqual({
      website: "https://example.xyz",
      projectType: "wallet",
      optInSource: "Signup form with double opt-in",
      sampleHtml: "<p>Hi</p>",
      expectedMonthlyVolume: 20000,
    });
  });
});
