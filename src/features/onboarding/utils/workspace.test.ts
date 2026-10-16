import { describe, expect, it } from "vitest";

import {
  deriveWorkspaceMode,
  isEmptyWorkspace,
  type WorkspaceSignals,
} from "./workspace";

const signals = (over: Partial<WorkspaceSignals> = {}): WorkspaceSignals => ({
  hasTrackedContract: false,
  contactCount: 0,
  ...over,
});

describe("deriveWorkspaceMode", () => {
  it("is empty when nothing is tracked and there are no contacts", () => {
    expect(deriveWorkspaceMode(signals())).toBe("empty");
  });

  it("is live once a contract is tracked, even with zero contacts", () => {
    expect(deriveWorkspaceMode(signals({ hasTrackedContract: true }))).toBe(
      "live"
    );
  });

  it("is live once any contact exists, even with no tracked contract", () => {
    expect(deriveWorkspaceMode(signals({ contactCount: 1 }))).toBe("live");
  });

  it("is live when both signals are present", () => {
    expect(
      deriveWorkspaceMode(
        signals({ hasTrackedContract: true, contactCount: 42 })
      )
    ).toBe("live");
  });

  it("treats a negative/garbage contact count as no contacts", () => {
    expect(deriveWorkspaceMode(signals({ contactCount: -5 }))).toBe("empty");
  });
});

describe("isEmptyWorkspace", () => {
  it("mirrors deriveWorkspaceMode === empty", () => {
    expect(isEmptyWorkspace(signals())).toBe(true);
    expect(isEmptyWorkspace(signals({ contactCount: 3 }))).toBe(false);
  });
});
