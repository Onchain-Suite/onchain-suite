import { describe, expect, it } from "vitest";

import {
  exportDecisionError,
  toExportRequestList,
  toExportStart,
} from "./export-requests";

describe("toExportStart", () => {
  it("reads a normal export job", () => {
    expect(
      toExportStart({ data: { jobId: "job_1", state: "queued" } })
    ).toEqual({
      kind: "job",
      jobId: "job_1",
    });
  });

  it("reads an export held for approval (jobId null)", () => {
    expect(
      toExportStart({
        success: true,
        data: {
          jobId: null,
          state: "pending_approval",
          approvalId: "cm1",
          estimatedRows: 48210,
          threshold: 10000,
        },
      })
    ).toEqual({ kind: "pending", approvalId: "cm1", estimatedRows: 48210 });
  });

  it("returns null when there is neither", () => {
    expect(toExportStart({ data: { jobId: null } })).toBeNull();
  });
});

describe("toExportRequestList", () => {
  it("keeps the threshold and the requests", () => {
    const l = toExportRequestList({
      data: {
        threshold: 10000,
        requests: [
          {
            id: "cm1",
            status: "pending_approval",
            format: "csv",
            estimatedRows: 48210,
            createdAt: "2026-11-22T10:00:00Z",
          },
          { status: "running" },
        ],
      },
    });
    expect(l.threshold).toBe(10000);
    expect(l.requests).toHaveLength(1);
    expect(l.requests[0].estimatedRows).toBe(48210);
  });
});

describe("exportDecisionError", () => {
  it("explains self-approval and an already-decided request", () => {
    expect(
      exportDecisionError({ status: 403, code: "EXPORT_SELF_APPROVAL" })
    ).toBe("You can't approve your own export. Another owner or admin has to.");
    expect(exportDecisionError({ status: 409 })).toMatch(/already decided/);
    expect(
      exportDecisionError({ status: 403, code: "EXPORT_APPROVER_ROLE" })
    ).toMatch(/owner or admin/);
  });
});
