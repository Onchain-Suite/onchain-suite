/**
 * Export approvals (backend `modules/export-approval/API.md`, 2026-11-22).
 * An export over 10,000 contacts waits for a second OWNER/ADMIN to approve
 * it. Bodies are at `data`.
 */

/** `POST /audience/exports` when the export is over the threshold. */
export interface PendingExportStart {
  jobId: null;
  state: "pending_approval";
  approvalId: string;
  estimatedRows: number;
  threshold: number;
  format: "csv" | "json";
  createdAt: string;
}

export type ExportRequestStatus =
  | "pending_approval"
  | "running"
  | "completed"
  | "rejected"
  | "failed"
  | "cancelled";

/** `status` query values for the list. Default `all`. */
export type ExportRequestFilter =
  | "pending"
  | "all"
  | "running"
  | "completed"
  | "rejected"
  | "failed"
  | "cancelled";

export interface ExportRequest {
  id: string;
  status: ExportRequestStatus;
  actorUserId: string | null;
  format: string;
  filters: Record<string, unknown> | null;
  estimatedRows: number | null;
  rowCount: number | null;
  ip: string | null;
  userAgent: string | null;
  exportJobId: string | null;
  approverUserId: string | null;
  approverKind: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

/** `GET /audience/export-requests?status=` (any member, newest first, max 100). */
export interface ExportRequestList {
  threshold: number;
  requests: ExportRequest[];
}

/** `POST /audience/export-requests/:id/approve` (OWNER/ADMIN, not the requester). */
export interface ExportApproval {
  approvalId: string;
  status: "approved";
  jobId: string;
  state: string;
}

/** `POST /audience/export-requests/:id/reject` body `{ reason? }`. */
export interface ExportRejection {
  approvalId: string;
  status: "rejected";
}
