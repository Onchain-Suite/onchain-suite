import { describe, expect, it } from "vitest";

import { isOrgAccessLost } from "./org-access";

describe("isOrgAccessLost", () => {
  it("recognises a deleted workspace", () => {
    expect(isOrgAccessLost(404, "Organization not found")).toBe(true);
  });

  it("recognises a removed member and an inactive membership", () => {
    expect(
      isOrgAccessLost(403, "You are not a member of this organization")
    ).toBe(true);
    expect(isOrgAccessLost(403, "Membership is not active")).toBe(true);
  });

  it("does not mistake a missing role for a lost workspace", () => {
    expect(isOrgAccessLost(403, "Insufficient permissions")).toBe(false);
  });

  it("ignores other things that are not found", () => {
    expect(isOrgAccessLost(404, "Campaign not found")).toBe(false);
    expect(isOrgAccessLost(404, undefined)).toBe(false);
  });

  it("only reads the statuses the guard uses", () => {
    expect(isOrgAccessLost(500, "Organization not found")).toBe(false);
    expect(
      isOrgAccessLost(401, "You are not a member of this organization")
    ).toBe(false);
  });
});
