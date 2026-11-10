import { describe, expect, it } from "vitest";

import { hasActiveOrg } from "./org-gate";

const base = {
  confirmedBySession: false,
  selectedOrgId: null,
  confirmedOrgId: null,
  isSwitchingOrg: false,
};

describe("hasActiveOrg", () => {
  it("has none while nothing is resolved", () => {
    expect(hasActiveOrg(base)).toBe(false);
  });

  it("follows the switcher once it confirms an org the shell sampled too early", () => {
    // Fresh browser session: no cookie at mount, the switcher then copies the
    // session's org into it. The shell's own sample is still null.
    expect(hasActiveOrg({ ...base, confirmedOrgId: "org_1" })).toBe(true);
  });

  it("accepts the cookie the shell sampled", () => {
    expect(hasActiveOrg({ ...base, selectedOrgId: "org_1" })).toBe(true);
  });

  it("holds pages back while a switch is in flight", () => {
    expect(
      hasActiveOrg({
        ...base,
        selectedOrgId: "org_1",
        confirmedOrgId: "org_1",
        isSwitchingOrg: true,
      })
    ).toBe(false);
  });

  it("trusts cookie and session agreeing, even mid-switch", () => {
    expect(
      hasActiveOrg({ ...base, confirmedBySession: true, isSwitchingOrg: true })
    ).toBe(true);
  });
});
