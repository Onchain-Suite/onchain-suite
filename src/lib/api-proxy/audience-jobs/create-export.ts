import { isJsonObject } from "@/lib/utils";

import { fetchBackendJson, okJson, randomJobId, readJsonSafe } from "../http";
import type { AudienceJobContext } from "./context";
import type { AudienceExportJob, AudienceImportExportFormat } from "./state";
import { audienceExportJobs } from "./state";

/** `POST /audience/exports`: create a local export job. */
export async function createExportJob({
  req,
  orgId,
  backendBase,
  backendHeaders,
}: AudienceJobContext) {
  const body = (await readJsonSafe(req)) as unknown;
  const formatRaw =
    isJsonObject(body) && typeof body.format === "string"
      ? body.format.toLowerCase().trim()
      : "";
  const format: AudienceImportExportFormat | null =
    formatRaw === "csv" || formatRaw === "json"
      ? (formatRaw as AudienceImportExportFormat)
      : null;
  if (!format) {
    return okJson(
      req,
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Invalid format" },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.nextUrl.pathname,
          requestId: "unknown",
        },
      },
      400
    );
  }

  const now = new Date().toISOString();
  const createdJobId = randomJobId();
  const job: AudienceExportJob = {
    jobId: createdJobId,
    orgId,
    createdAt: now,
    startedAt: now,
    state: "processing",
    format,
    processedRows: 0,
    fileName: `audience-export-${createdJobId}.${format}`,
    contentType:
      format === "json"
        ? "application/json; charset=utf-8"
        : "text/csv; charset=utf-8",
    fileBytes: new Uint8Array(),
  };
  audienceExportJobs.set(createdJobId, job);

  try {
    const maxItems = 5000;
    const limit = 200;
    let page = 1;
    const all: unknown[] = [];
    while (all.length < maxItems) {
      const url = `${backendBase}/audience/profiles?page=${page}&limit=${limit}`;
      const res = await fetchBackendJson(url, {
        method: "GET",
        headers: backendHeaders,
        cache: "no-store",
      });
      if (!res.ok) {
        const msg =
          (isJsonObject(res.json) && typeof res.json.message === "string"
            ? res.json.message
            : res.text) || "Failed to export";
        throw new Error(msg);
      }
      const root = res.json;
      const list = Array.isArray(root)
        ? root
        : isJsonObject(root) && Array.isArray((root as { data?: unknown }).data)
          ? ((root as { data?: unknown }).data as unknown[])
          : isJsonObject(root) &&
              isJsonObject((root as { data?: unknown }).data) &&
              Array.isArray(
                ((root as { data?: unknown }).data as { items?: unknown }).items
              )
            ? ((((root as { data?: unknown }).data as { items?: unknown })
                .items as unknown[]) ?? [])
            : [];
      if (!Array.isArray(list) || list.length === 0) break;
      all.push(...list);
      if (list.length < limit) break;
      page += 1;
    }

    job.processedRows = all.length;
    job.totalRows = all.length;

    if (format === "json") {
      const json = JSON.stringify(all, null, 2);
      job.fileBytes = new TextEncoder().encode(json);
    } else {
      const headers = ["email", "name", "wallet", "tags"];
      const lines: string[] = [];
      lines.push(headers.join(","));
      for (const item of all) {
        const obj = isJsonObject(item) ? (item as Record<string, unknown>) : {};
        const email = typeof obj.email === "string" ? obj.email : "";
        const name =
          typeof obj.name === "string"
            ? obj.name
            : typeof obj.fullName === "string"
              ? obj.fullName
              : "";
        const wallet =
          typeof obj.wallet === "string"
            ? obj.wallet
            : typeof obj.walletAddress === "string"
              ? obj.walletAddress
              : "";
        const tags = Array.isArray(obj.tags)
          ? obj.tags.filter((t) => typeof t === "string").join(",")
          : "";
        const escape = (v: string) => {
          const s = v.replaceAll('"', '""');
          return /[",\n\r]/.test(s) ? `"${s}"` : s;
        };
        lines.push(
          [escape(email), escape(name), escape(wallet), escape(tags)].join(",")
        );
      }
      job.fileBytes = new TextEncoder().encode(lines.join("\n"));
    }

    job.state = "completed";
    job.finishedAt = new Date().toISOString();
  } catch (e) {
    job.state = "failed";
    job.finishedAt = new Date().toISOString();
    return okJson(
      req,
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Export failed",
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

  return okJson(
    req,
    {
      success: true,
      message: "Export job created",
      data: {
        jobId: job.jobId,
        state: job.state,
        format: job.format,
        createdAt: job.createdAt,
      },
      timestamp: new Date().toISOString(),
      requestId: "local",
    },
    202
  );
}
