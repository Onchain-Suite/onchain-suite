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
  it("repairs an in-progress record when this device saw them finish", () => {
    expect(
      shouldRepairServer("in_progress", { cookie: true, workspaceLive: false })
    ).toBe(true);
    expect(
      shouldRepairServer("in_progress", { cookie: false, workspaceLive: true })
    ).toBe(true);
  });

  it("leaves a genuinely unfinished wizard alone", () => {
    expect(
      shouldRepairServer("in_progress", { cookie: false, workspaceLive: false })
    ).toBe(false);
  });

  it("never completes the wizard for someone who did not start it", () => {
    expect(
      shouldRepairServer("not_started", { cookie: true, workspaceLive: true })
    ).toBe(false);
    expect(
      shouldRepairServer("completed", { cookie: true, workspaceLive: true })
    ).toBe(false);
  });
});

describe("device records", () => {
  it("reads the cookie exactly", () => {
    expect(hasCompleteCookie("a=1; onchain.onboardingComplete=1")).toBe(true);
    expect(hasCompleteCookie("onchain.onboardingComplete=0")).toBe(false);
    expect(hasCompleteCookie("")).toBe(false);
  });

  it("keeps a pending completion until it is cleared", () => {
    expect(readPendingCompletion()).toBeNull();
    savePendingCompletion({
      totalTimeSeconds: 240,
      currentStep: "plan_selection",
    });
    expect(readPendingCompletion()).toEqual({
      totalTimeSeconds: 240,
      currentStep: "plan_selection",
    });
    clearPendingCompletion();
    expect(readPendingCompletion()).toBeNull();
  });

  it("confirming sets the cookie and drops the pending copy", () => {
    savePendingCompletion({ totalTimeSeconds: 1 });
    expect(isServerConfirmed()).toBe(false);
    markServerConfirmed();
    expect(isServerConfirmed()).toBe(true);
    expect(readPendingCompletion()).toBeNull();
    expect(hasCompleteCookie(document.cookie)).toBe(true);
  });

  it("ignores a corrupt pending record", () => {
    window.localStorage.setItem("onchain.onboarding.pendingComplete", "[1]");
    expect(readPendingCompletion()).toBeNull();
  });
});
