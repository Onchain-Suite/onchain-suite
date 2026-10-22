import { NextResponse } from "next/server";

import { getCorsHeaders } from "../config";
import { okJson } from "../http";
import type { AudienceJobRouteContext } from "./context";
import { audienceImportJobs } from "./state";

/** `GET /audience/imports/:id`, `/errors` and `POST /:id/cancel`. */
export async function importJobRoute({
  req,
  orgId,
  method,
  jobId,
  extra,
}: AudienceJobRouteContext) {
  if (method === "GET" && jobId && !extra) {
    const job = audienceImportJobs.get(jobId);
    if (job?.orgId !== orgId) {
      return okJson(
        req,
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Job not found" },
          meta: {
            timestamp: new Date().toISOString(),
            path: req.nextUrl.pathname,
            requestId: "unknown",
          },
        },
        404
      );
    }
    const progress =
      typeof job.totalRows === "number" && job.totalRows > 0
        ? Math.round((job.processedRows / job.totalRows) * 100)
        : job.state === "completed"
          ? 100
          : 0;
    return okJson(req, {
      success: true,
      message: "Request processed successfully",
      data: {
        ...job,
        progress,
        errorSample: job.errors.slice(0, 50),
      },
      timestamp: new Date().toISOString(),
      requestId: "local",
    });
  }

  if (method === "GET" && jobId && extra === "errors") {
    const job = audienceImportJobs.get(jobId);
    if (job?.orgId !== orgId) {
      return okJson(
        req,
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Job not found" },
          meta: {
            timestamp: new Date().toISOString(),
            path: req.nextUrl.pathname,
            requestId: "unknown",
          },
        },
        404
      );
    }
    if (job.errors.length === 0) {
      return okJson(
        req,
        {
          success: false,
          error: { code: "CONFLICT", message: "No errors available" },
          meta: {
            timestamp: new Date().toISOString(),
            path: req.nextUrl.pathname,
            requestId: "unknown",
          },
        },
        409
      );
    }
    const lines = [
      "rowNumber,key,code,message",
      ...job.errors.map((e) => {
        const row = typeof e.rowNumber === "number" ? String(e.rowNumber) : "";
        const key =
          typeof e.key === "string" ? e.key.replaceAll('"', '""') : "";
        const code =
          typeof e.code === "string" ? e.code.replaceAll('"', '""') : "";
        const message = e.message.replaceAll('"', '""');
        return `${row},"${key}","${code}","${message}"`;
      }),
    ];
    const csv = lines.join("\n");
    const cors = getCorsHeaders(req);
    const res = new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="audience-import-errors-${jobId}.csv"`,
      },
    });
    if (cors) {
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    }
    return res;
  }

  if (method === "POST" && jobId && extra === "cancel") {
    const job = audienceImportJobs.get(jobId);
    if (job?.orgId !== orgId) {
      return okJson(
        req,
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Job not found" },
          meta: {
            timestamp: new Date().toISOString(),
            path: req.nextUrl.pathname,
            requestId: "unknown",
          },
        },
        404
      );
    }
    if (job.state === "completed" || job.state === "failed") {
      return okJson(
        req,
        {
          success: false,
          error: { code: "CONFLICT", message: "Job already finished" },
          meta: {
            timestamp: new Date().toISOString(),
            path: req.nextUrl.pathname,
            requestId: "unknown",
          },
        },
        409
      );
    }
    job.state = "cancelled";
    job.finishedAt = new Date().toISOString();
    return okJson(req, {
      success: true,
      message: "Request processed successfully",
      data: { jobId: job.jobId, state: job.state },
      timestamp: new Date().toISOString(),
      requestId: "local",
    });
  }

  return null;
}
