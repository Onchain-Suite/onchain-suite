import { describe, expect, it } from "vitest";

import type { ConnectorRunStatus } from "../contracts/runs";
import {
  isRunLive,
  migrationTotals,
  runPanelStatus,
  runStartLabel,
  syncTotals,
  toRunStatus,
} from "./runs";

const run = (over: Partial<ConnectorRunStatus> = {}): ConnectorRunStatus => ({
  ...toRunStatus({}, "hubspot"),
  ...over,
});

describe("toRunStatus", () => {
  it("reads the server's status", () => {
    expect(
      toRunStatus(
        {
          connector: "hubspot",
          state: "running",
          totals: { scanned: 12500 },
          slices: 3,
          resumable: false,
          incomplete: false,
          stopping: true,
          error: null,
          startedAt: "2026-11-11T10:00:00.000Z",
          finishedAt: null,
        },
        "hubspot"
      )
    ).toEqual({
      connector: "hubspot",
      state: "running",
      totals: { scanned: 12500 },
      slices: 3,
      resumable: false,
      incomplete: false,
      stopping: true,
      error: null,
      startedAt: "2026-11-11T10:00:00.000Z",
      finishedAt: null,
    });
  });

  it("reads anything it does not recognise as no run yet", () => {
    for (const raw of [null, undefined, "x", [], { state: "exploded" }]) {
      expect(toRunStatus(raw, "kit")).toMatchObject({
        connector: "kit",
        state: "idle",
        totals: {},
        slices: 0,
        resumable: false,
      });
    }
  });
});

describe("run state", () => {
  it("is live while queued or running, and not otherwise", () => {
    expect(isRunLive(run({ state: "queued" }))).toBe(true);
    expect(isRunLive(run({ state: "running" }))).toBe(true);
    for (const state of ["idle", "completed", "stopped", "failed"] as const) {
      expect(isRunLive(run({ state }))).toBe(false);
    }
    expect(isRunLive(null)).toBe(false);
  });

  it("maps the server's states onto the progress panel's", () => {
    expect(runPanelStatus(null)).toBe("idle");
    expect(runPanelStatus(run({ state: "queued" }))).toBe("running");
    expect(runPanelStatus(run({ state: "running" }))).toBe("running");
    expect(runPanelStatus(run({ state: "completed" }))).toBe("done");
    expect(runPanelStatus(run({ state: "stopped" }))).toBe("stopped");
    expect(runPanelStatus(run({ state: "failed" }))).toBe("error");
  });

  it("offers to continue a run that kept its place", () => {
    const verbs = { start: "Start migration", again: "Run again" };
    expect(runStartLabel(null, verbs)).toBe("Start migration");
    expect(runStartLabel(run({ state: "completed" }), verbs)).toBe("Run again");
    expect(
      runStartLabel(run({ state: "failed", resumable: true }), verbs)
    ).toBe("Continue");
    expect(
      runStartLabel(run({ state: "failed", resumable: false }), verbs)
    ).toBe("Run again");
  });
});

describe("totals", () => {
  it("reads a migration's counts and holds, with zeros for what is absent", () => {
    expect(
      migrationTotals({
        scanned: 50_000,
        created: 48_000,
        alreadyMigrated: 500,
        held: { unsubscribed: 1_200, invalid: 300 },
        listName: "Imported from HubSpot",
        warnings: ["a", 2, "b"],
      })
    ).toEqual({
      scanned: 50_000,
      created: 48_000,
      alreadyMigrated: 500,
      held: {
        unsubscribed: 1_200,
        unconfirmed: 0,
        invalid: 300,
        unreachable: 0,
      },
      skipped: 0,
      listName: "Imported from HubSpot",
      warnings: ["a", "b"],
    });
    expect(migrationTotals({}).held).toEqual({
      unsubscribed: 0,
      unconfirmed: 0,
      invalid: 0,
      unreachable: 0,
    });
  });

  it("finds what a sync read under whichever name the source used", () => {
    expect(syncTotals({ scanned: 9, created: 4 }).read).toBe(9);
    expect(syncTotals({ rows: 20_000 }).read).toBe(20_000);
    expect(syncTotals({ wallets: 7, logs: 30 }).read).toBe(7);
    expect(syncTotals({}).read).toBe(0);
  });

  it("carries a truncation flag from either spelling", () => {
    expect(syncTotals({ truncatedAtCap: true }).truncated).toBe(true);
    expect(syncTotals({ truncated: true }).truncated).toBe(true);
    expect(syncTotals({}).truncated).toBe(false);
  });

  it("never lets a hostile number through", () => {
    const t = syncTotals({ scanned: NaN, created: -5, skipped: Infinity });
    expect(t).toMatchObject({ read: 0, created: 0, skipped: 0 });
  });
});
