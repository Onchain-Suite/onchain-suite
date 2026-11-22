import type { AxiosError } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type {
  ExportApproval,
  ExportRejection,
  ExportRequestFilter,
  ExportRequestList,
} from "./contracts/export-requests";
import { toExportRequestList } from "./utils/export-requests";

export type {
  ExportRequest,
  ExportRequestList,
} from "./contracts/export-requests";

const headers = () => {
  const orgId = getSelectedOrganizationId();
  return {
    ...(orgId ? { "x-org-id": orgId } : {}),
    "x-onchain-silent-error": "1",
  };
};

const unwrap = <T>(p: unknown): T =>
  (isJsonObject(p) && "data" in p ? p.data : p) as T;

/** An Error that keeps the HTTP status and backend code for `exportDecisionError`. */
export class ExportRequestError extends Error {
  status?: number;
  code?: string;
  constructor(e: unknown) {
    const ax = e as AxiosError<unknown>;
    const data = ax?.response?.data;
    const err =
      isJsonObject(data) && isJsonObject(data.error) ? data.error : null;
    super(
      typeof err?.message === "string" ? err.message : "Export request failed",
      { cause: e }
    );
    this.status = ax?.response?.status;
    this.code = typeof err?.code === "string" ? err.code : undefined;
  }
}

const path = (id: string, action: "approve" | "reject") =>
  `/audience/export-requests/${encodeURIComponent(id)}/${action}`;

export const exportRequestsService = {
  async list(status: ExportRequestFilter = "all"): Promise<ExportRequestList> {
    const res = await apiClient.get("/audience/export-requests", {
      params: { status },
      headers: headers(),
    });
    return toExportRequestList(res.data);
  },

  async approve(id: string): Promise<ExportApproval> {
    try {
      const res = await apiClient.post(
        path(id, "approve"),
        {},
        { headers: headers() }
      );
      return unwrap<ExportApproval>(res.data);
    } catch (e) {
      throw new ExportRequestError(e);
    }
  },

  async reject(id: string, reason?: string): Promise<ExportRejection> {
    try {
      const res = await apiClient.post(
        path(id, "reject"),
        reason ? { reason } : {},
        { headers: headers() }
      );
      return unwrap<ExportRejection>(res.data);
    } catch (e) {
      throw new ExportRequestError(e);
    }
  },
};
