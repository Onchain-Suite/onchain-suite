import type { NextRequest } from "next/server";

import { hasAnyAuth, requireOrgId } from "../auth";
import { getBackendBaseUrl } from "../config";
import { buildBackendHeaders, okJson } from "../http";
import { createExportJob } from "./create-export";
import { createImportJob } from "./create-import";
import { exportJobRoute } from "./export-job";
import { importJobRoute } from "./import-job";

/** Local audience import/export jobs (`/audience/imports|exports/*`). */
export const handleAudienceImportExport = async (
  req: NextRequest,
  path: string[],
  method: string
) => {
  if (path.length < 2 || path[0] !== "audience") return null;
  const sub = path[1] ?? "";
  if (sub !== "imports" && sub !== "exports") return null;

  const orgId = requireOrgId(req);
  if (!orgId) {
    return okJson(
      req,
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Missing x-org-id header",
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.nextUrl.pathname,
          requestId: "unknown",
        },
      },
      400
    );
  }

  if (!hasAnyAuth(req)) {
    return okJson(
      req,
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication failed",
          details: { error: "Missing session", statusCode: 401 },
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.nextUrl.pathname,
          requestId: "unknown",
        },
      },
      401
    );
  }

  const ctx = {
    req,
    orgId,
    backendBase: getBackendBaseUrl(),
    backendHeaders: buildBackendHeaders(req),
  };
  const jobId = path.length >= 3 ? path[2] : null;
  const extra = path.length >= 4 ? path[3] : null;

  if (sub === "imports") {
    if (method === "POST" && !jobId) return createImportJob(ctx);
    return importJobRoute({ ...ctx, method, jobId, extra });
  }

  if (method === "POST" && !jobId) return createExportJob(ctx);
  return exportJobRoute({ ...ctx, method, jobId, extra });
};
