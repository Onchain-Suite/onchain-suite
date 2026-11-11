import { describe, expect, it } from "vitest";

import { goneWorkspaces, reconcileSelection } from "./org-selection";

describe("reconcileSelection", () => {
  it("keeps a selection that is still one of their workspaces", () => {
    expect(
      reconcileSelection({
        orgIds: ["a", "b"],
        cookieOrgId: "b",
        sessionOrgId: "a",
      })
    ).toEqual({ kind: "keep" });
  });

  it("moves off a deleted workspace to the session's, when that one is theirs", () => {
    expect(
      reconcileSelection({
        orgIds: ["a", "b"],
        cookieOrgId: "deleted",
        sessionOrgId: "b",
      })
    ).toEqual({ kind: "switch", orgId: "b" });
  });

  it("falls back to the first workspace when the session points at the deleted one too", () => {
    expect(
      reconcileSelection({
        orgIds: ["a", "b"],
        cookieOrgId: "deleted",
        sessionOrgId: "deleted",
      })
    ).toEqual({ kind: "switch", orgId: "a" });
  });

  it("picks a workspace for someone with no selection stored", () => {
    expect(
      reconcileSelection({ orgIds: ["a"], cookieOrgId: null, sessionOrgId: "" })
    ).toEqual({ kind: "switch", orgId: "a" });
  });

  it("clears a selection that points nowhere when no workspace is left", () => {
    expect(
      reconcileSelection({
        orgIds: [],
        cookieOrgId: "deleted",
        sessionOrgId: "deleted",
      })
    ).toEqual({ kind: "clear" });
  });

  it("has nothing to clear for someone with no workspace and no selection", () => {
    expect(
      reconcileSelection({ orgIds: [], cookieOrgId: " ", sessionOrgId: null })
    ).toEqual({ kind: "keep" });
  });
});

describe("goneWorkspaces", () => {
  it("names the workspaces that left the list", () => {
    const before = [
      { id: "a", name: "Acme" },
      { id: "b", name: "Beta" },
    ];
    expect(goneWorkspaces(before, [{ id: "a", name: "Acme" }])).toEqual([
      { id: "b", name: "Beta" },
    ]);
  });

  it("is empty when nothing left, including when one was added", () => {
    const before = [{ id: "a" }];
    expect(goneWorkspaces(before, [{ id: "a" }, { id: "c" }])).toEqual([]);
    expect(goneWorkspaces([], [{ id: "a" }])).toEqual([]);
  });
});
