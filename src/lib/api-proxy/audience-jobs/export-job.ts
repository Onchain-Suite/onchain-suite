import { NextResponse } from "next/server";

import { getCorsHeaders } from "../config";
import { okJson } from "../http";
import type { AudienceJobRouteContext } from "./context";
import { audienceExportJobs } from "./state";

/** `GET /audience/exports/:id`, `/download` and `POST /:id/cancel`. */
export async function exportJobRoute({
  req,
  orgId,
  method,
  jobId,
  extra,
}: AudienceJobRouteContext) {
  if (method === "GET" && jobId && !extra) {
    const job = audienceExportJobs.get(jobId);
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
        jobId: job.jobId,
        state: job.state,
        format: job.format,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        progress,
        processedRows: job.processedRows,
        totalRows: job.totalRows,
        fileSizeBytes: job.fileBytes.length,
      },
      timestamp: new Date().toISOString(),
      requestId: "local",
    });
  }

  if (method === "GET" && jobId && extra === "download") {
    const job = audienceExportJobs.get(jobId);
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
    if (job.state !== "completed") {
      return okJson(
        req,
        {
          success: false,
          error: { code: "CONFLICT", message: "Job not completed" },
          meta: {
            timestamp: new Date().toISOString(),
            path: req.nextUrl.pathname,
            requestId: "unknown",
          },
        },
        409
      );
    }
    const cors = getCorsHeaders(req);
    const bytes = Uint8Array.from(job.fileBytes).buffer;
    const res = new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": job.contentType,
        "content-disposition": `attachment; filename="${job.fileName}"`,
      },
    });
    if (cors) {
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    }
    return res;
  }

  if (method === "POST" && jobId && extra === "cancel") {
    const job = audienceExportJobs.get(jobId);
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
