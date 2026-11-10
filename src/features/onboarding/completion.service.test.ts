import { describe, expect, it } from "vitest";

import { toOnboardingState } from "./completion.service";

describe("toOnboardingState", () => {
  it("reads completion from the progress row", () => {
    expect(toOnboardingState({ data: { isCompleted: true } }).status).toBe(
      "completed"
    );
    expect(
      toOnboardingState({ data: { progress: { is_completed: true } } }).status
    ).toBe("completed");
  });

  it("reads the resume status wherever it sits", () => {
    expect(
      toOnboardingState({ data: { resume: { status: "in_progress" } } }).status
    ).toBe("in_progress");
    expect(
      toOnboardingState({
        isCompleted: false,
        resume: { status: "in_progress" },
        completionPercentage: 50,
      })
    ).toEqual({ status: "in_progress", completionPercentage: 50 });
  });

  it("trusts the completed flag over a stale resume block", () => {
    expect(
      toOnboardingState({
        data: { isCompleted: true, resume: { status: "in_progress" } },
      }).status
    ).toBe("completed");
  });

  it("reads anything unrecognised as not started, never as in progress", () => {
    expect(toOnboardingState(null).status).toBe("not_started");
    expect(
      toOnboardingState({ data: { resume: { status: "odd" } } }).status
    ).toBe("not_started");
  });
});
