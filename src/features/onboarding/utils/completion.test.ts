import { beforeEach, describe, expect, it } from "vitest";

import {
  clearPendingCompletion,
  type CompletionEvidence,
  hasCompleteCookie,
  isOnboardingDone,
  isServerConfirmed,
  markServerConfirmed,
  readPendingCompletion,
  savePendingCompletion,
  shouldRepairServer,
} from "./completion";

const none: CompletionEvidence = {
  cookie: false,
  pending: false,
  userFlag: false,
  serverCompleted: false,
  workspaceLive: false,
};

beforeEach(() => {
  window.localStorage.clear();
  document.cookie = "onchain.onboardingComplete=; path=/; max-age=0";
});

describe("isOnboardingDone", () => {
  it("is not done with no evidence", () => {
    expect(isOnboardingDone(none)).toBe(false);
  });

  it.each(Object.keys(none) as (keyof CompletionEvidence)[])(
    "is done on %s alone",
    (signal) => {
      expect(isOnboardingDone({ ...none, [signal]: true })).toBe(true);
    }
  );
});

describe("shouldRepairServer", () => {
  it("repairs an in-progress record when the workspace is in use", () => {
    expect(shouldRepairServer("in_progress", { workspaceLive: true })).toBe(
      true
    );
  });

  it("leaves a genuinely unfinished wizard alone", () => {
    expect(shouldRepairServer("in_progress", { workspaceLive: false })).toBe(
      false
    );
  });

  it("never completes the wizard for someone who did not start it", () => {
    expect(shouldRepairServer("not_started", { workspaceLive: true })).toBe(
      false
    );
    expect(shouldRepairServer("completed", { workspaceLive: true })).toBe(
      false
    );
  });
});

describe("device records", () => {
  it("reads the cookie exactly", () => {
    expect(hasCompleteCookie("a=1; onchain.onboardingComplete=1")).toBe(true);
    expect(hasCompleteCookie("onchain.onboardingComplete=0")).toBe(false);
    expect(hasCompleteCookie("")).toBe(false);
  });

  it("keeps a pending completion until it is cleared", () => {
    expect(readPendingCompletion("u1")).toBeNull();
    savePendingCompletion("u1", {
      totalTimeSeconds: 240,
      currentStep: "plan_selection",
    });
    expect(readPendingCompletion("u1")).toEqual({
      totalTimeSeconds: 240,
      currentStep: "plan_selection",
    });
    clearPendingCompletion("u1");
    expect(readPendingCompletion("u1")).toBeNull();
  });

  it("confirming sets the cookie and drops the pending copy", () => {
    savePendingCompletion("u1", { totalTimeSeconds: 1 });
    expect(isServerConfirmed("u1")).toBe(false);
    markServerConfirmed("u1");
    expect(isServerConfirmed("u1")).toBe(true);
    expect(readPendingCompletion("u1")).toBeNull();
    expect(hasCompleteCookie(document.cookie)).toBe(true);
  });

  it("keeps one account's records away from another on the same browser", () => {
    savePendingCompletion("u1", { totalTimeSeconds: 240 });
    markServerConfirmed("u2");
    expect(readPendingCompletion("u2")).toBeNull();
    expect(readPendingCompletion("u1")).toEqual({ totalTimeSeconds: 240 });
    expect(isServerConfirmed("u1")).toBe(false);
  });

  it("ignores a corrupt pending record", () => {
    window.localStorage.setItem("onchain.onboarding.pendingComplete:u1", "[1]");
    expect(readPendingCompletion("u1")).toBeNull();
  });
});
