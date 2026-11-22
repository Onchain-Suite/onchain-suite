import { isJsonObject } from "@/lib/utils";

import type {
  ExportRequest,
  ExportRequestList,
  ExportRequestStatus,
} from "../contracts/export-requests";

/** What `POST /audience/exports` started: a download job, or a request waiting for a second admin. */
export type ExportStart =
  | { kind: "job"; jobId: string }
  | { kind: "pending"; approvalId: string; estimatedRows: number | null };

const unwrap = (p: unknown): unknown =>
  isJsonObject(p) && "data" in p ? p.data : p;

/** Read the POST answer. Returns null when it is neither (the caller reports an error). */
export function toExportStart(payload: unknown): ExportStart | null {
  const r = unwrap(payload);
  if (!isJsonObject(r)) return null;
  if (r.state === "pending_approval" || r.status === "pending_approval") {
    const approvalId = typeof r.approvalId === "string" ? r.approvalId : "";
    return {
      kind: "pending",
      approvalId,
      estimatedRows:
        typeof r.estimatedRows === "number" && Number.isFinite(r.estimatedRows)
          ? r.estimatedRows
          : null,
    };
  }
  const jobId =
    typeof r.jobId === "string" && r.jobId
      ? r.jobId
      : typeof r.id === "string" && r.id
        ? r.id
        : null;
  return jobId ? { kind: "job", jobId } : null;
}

const STATUSES: ExportRequestStatus[] = [
  "pending_approval",
  "running",
  "completed",
  "rejected",
  "failed",
  "cancelled",
];

const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function toExportRequestList(payload: unknown): ExportRequestList {
  const r = unwrap(payload);
  const o = isJsonObject(r) ? r : {};
  const requests = Array.isArray(o.requests) ? o.requests : [];
  return {
    threshold: num(o.threshold) ?? 10_000,
    requests: requests
      .filter(isJsonObject)
      .map((q): ExportRequest => ({
        id: String(q.id ?? ""),
        status: STATUSES.includes(q.status as ExportRequestStatus)
          ? (q.status as ExportRequestStatus)
          : "running",
        actorUserId: str(q.actorUserId),
        format: str(q.format) ?? "csv",
        filters: isJsonObject(q.filters) ? q.filters : null,
        estimatedRows: num(q.estimatedRows),
        rowCount: num(q.rowCount),
        ip: str(q.ip),
        userAgent: str(q.userAgent),
        exportJobId: str(q.exportJobId),
        approverUserId: str(q.approverUserId),
        approverKind: str(q.approverKind),
        decidedAt: str(q.decidedAt),
        decisionReason: str(q.decisionReason),
        createdAt: str(q.createdAt) ?? "",
        completedAt: str(q.completedAt),
      }))
      .filter((q) => q.id.length > 0),
  };
}

export const EXPORT_STATUS_LABEL: Record<ExportRequestStatus, string> = {
  pending_approval: "Waiting for approval",
  running: "Running",
  completed: "Completed",
  rejected: "Rejected",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** A decision error in plain words: who may approve, and what happened. */
export function exportDecisionError(e: unknown): string {
  const err = isJsonObject(e) ? e : {};
  const status = typeof err.status === "number" ? err.status : undefined;
  const code = typeof err.code === "string" ? err.code : "";
  if (code === "EXPORT_SELF_APPROVAL")
    return "You can't approve your own export. Another owner or admin has to.";
  if (code === "EXPORT_APPROVER_ROLE")
    return "Only an owner or admin can approve or reject exports.";
  if (status === 409)
    return "This request was already decided. The list has been refreshed.";
  if (status === 404) return "This request no longer exists.";
  return "Couldn't save that decision. Try again.";
}
