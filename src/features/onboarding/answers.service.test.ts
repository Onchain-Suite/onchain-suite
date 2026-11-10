import { describe, expect, it } from "vitest";

import { toWorkspaceAnswers } from "./answers.service";

describe("toWorkspaceAnswers", () => {
  it("reads both answers", () => {
    expect(
      toWorkspaceAnswers({
        startPath: {
          value: "chain",
          setAt: "2026-11-10T10:00:00Z",
          source: "home",
        },
        goal: {
          value: "deposit",
          setAt: "2026-11-10T10:00:00Z",
          source: "onboarding",
        },
      })
    ).toEqual({
      startPath: {
        value: "chain",
        setAt: "2026-11-10T10:00:00Z",
        source: "home",
      },
      goal: {
        value: "deposit",
        setAt: "2026-11-10T10:00:00Z",
        source: "onboarding",
      },
    });
  });

  it("treats a missing, empty or unknown answer as not given", () => {
    expect(toWorkspaceAnswers(null)).toEqual({ startPath: null, goal: null });
    expect(
      toWorkspaceAnswers({ startPath: null, goal: { value: "" } })
    ).toEqual({
      startPath: null,
      goal: null,
    });
    expect(
      toWorkspaceAnswers({ startPath: { value: "signups" } }).startPath
    ).toBeNull();
  });

  it("defaults an unknown source to the wizard", () => {
    expect(
      toWorkspaceAnswers({ goal: { value: "signup", source: "elsewhere" } })
        .goal?.source
    ).toBe("onboarding");
  });
});
