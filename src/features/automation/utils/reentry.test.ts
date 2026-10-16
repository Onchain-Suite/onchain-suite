import { describe, expect, it } from "vitest";

import { reentryConfigToUi, reentryUiToConfig } from "./reentry";

describe("reentryUiToConfig", () => {
  it("maps each panel choice to the runtime policy contract", () => {
    expect(reentryUiToConfig("once")).toEqual({ policy: "once" });
    expect(reentryUiToConfig("daily")).toEqual({
      policy: "window",
      windowDays: 1,
    });
    expect(reentryUiToConfig("weekly")).toEqual({
      policy: "window",
      windowDays: 7,
    });
    expect(reentryUiToConfig("always")).toEqual({ policy: "always" });
    // Unknown UI values fall back to "always".
    expect(reentryUiToConfig("")).toEqual({ policy: "always" });
  });
});

describe("reentryConfigToUi", () => {
  it("maps the runtime policy back to a panel choice", () => {
    expect(reentryConfigToUi({ policy: "once" })).toBe("once");
    expect(reentryConfigToUi({ policy: "window", windowDays: 1 })).toBe(
      "daily"
    );
    expect(reentryConfigToUi({ policy: "window", windowDays: 7 })).toBe(
      "weekly"
    );
    expect(reentryConfigToUi({ policy: "always" })).toBe("always");
  });

  it("treats a window >= 7 days as weekly, anything less as daily", () => {
    expect(reentryConfigToUi({ policy: "window", windowDays: 30 })).toBe(
      "weekly"
    );
    expect(reentryConfigToUi({ policy: "window", windowDays: 3 })).toBe(
      "daily"
    );
    // Missing windowDays parses as NaN, which is not >= 7, so daily.
    expect(reentryConfigToUi({ policy: "window" })).toBe("daily");
  });

  it("defaults to always for missing or malformed config", () => {
    expect(reentryConfigToUi(undefined)).toBe("always");
    expect(reentryConfigToUi(null)).toBe("always");
    expect(reentryConfigToUi("nope")).toBe("always");
    expect(reentryConfigToUi({})).toBe("always");
  });

  it("round-trips every panel choice through config and back", () => {
    for (const ui of ["once", "daily", "weekly", "always"]) {
      expect(reentryConfigToUi(reentryUiToConfig(ui))).toBe(ui);
    }
  });
});
