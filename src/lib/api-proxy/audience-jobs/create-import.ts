import { isJsonObject } from "@/lib/utils";

import { parseCsv, toTags } from "../csv";
import { fetchBackendJson, okJson, randomJobId } from "../http";
import type { AudienceJobContext } from "./context";
import type {
  AudienceImportError,
  AudienceImportExportFormat,
  AudienceImportJob,
} from "./state";
import { audienceImportJobs } from "./state";

/** `POST /audience/imports`: create a local import job. */
export async function createImportJob({
  req,
  orgId,
  backendBase,
  backendHeaders,
}: AudienceJobContext) {
  const formatFromQuery = (req.nextUrl.searchParams.get("format") ?? "")
    .trim()
    .toLowerCase();
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File)) {
    return okJson(
      req,
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Missing file" },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.nextUrl.pathname,
          requestId: "unknown",
        },
      },
      400
    );
  }

  const maxBytes = 100 * 1024 * 1024;
  if (file.size > maxBytes) {
    return okJson(
      req,
      {
        success: false,
        error: { code: "PAYLOAD_TOO_LARGE", message: "File too large" },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.nextUrl.pathname,
          requestId: "unknown",
        },
      },
      413
    );
  }

  const fileName = file.name.toLowerCase();
  const inferred: AudienceImportExportFormat | null = fileName.endsWith(".csv")
    ? "csv"
    : fileName.endsWith(".json")
      ? "json"
      : null;
  const format: AudienceImportExportFormat | null =
    formatFromQuery === "csv" || formatFromQuery === "json"
      ? (formatFromQuery as AudienceImportExportFormat)
      : inferred;

  if (!format) {
    return okJson(
      req,
      {
        success: false,
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Only CSV and JSON are supported",
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.nextUrl.pathname,
          requestId: "unknown",
        },
      },
      415
    );
  }

  const mappingRaw = fd?.get("mapping");
  const mapping =
    typeof mappingRaw === "string" && mappingRaw.length > 0
      ? (() => {
          try {
            const json = JSON.parse(mappingRaw);
            return isJsonObject(json) ? (json as Record<string, string>) : null;
          } catch {
            return null;
          }
        })()
      : null;

  const now = new Date().toISOString();
  const createdJobId = randomJobId();
  const job: AudienceImportJob = {
    jobId: createdJobId,
    orgId,
    createdAt: now,
    startedAt: now,
    state: "processing",
    format,
    processedRows: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
  };
  audienceImportJobs.set(createdJobId, job);

  const text = await file.text();
  const maxRows = 2000;

  const pushError = (err: AudienceImportError) => {
    job.errors.push(err);
    job.errorCount = job.errors.length;
  };

  const upsertOne = async (
    body: Record<string, unknown>,
    rowNumber?: number
  ) => {
    const res = await fetchBackendJson(`${backendBase}/audience/profiles`, {
      method: "POST",
      headers: (() => {
        const h = new Headers(backendHeaders);
        h.set("content-type", "application/json");
        return h;
      })(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.ok) {
      job.createdCount += 1;
      return;
    }
    if (res.status === 409) {
      job.skippedCount += 1;
      return;
    }
    const msg =
      (isJsonObject(res.json) && typeof res.json.message === "string"
        ? res.json.message
        : res.text) || "Failed to import row";
    pushError({ rowNumber, message: msg });
  };

  try {
    if (format === "csv") {
      const { headers, rows } = parseCsv(text);
      job.totalRows = rows.length;
      const headerToIndex = new Map<string, number>();
      headers.forEach((h, i) => headerToIndex.set(h, i));
      const limit = Math.min(rows.length, maxRows);
      for (let i = 0; i < limit; i += 1) {
        const row = rows[i];
        const rowNumber = i + 2;
        const body: Record<string, unknown> = {};
        const attributes: Record<string, unknown> = {};
        for (const [header, idx] of headerToIndex.entries()) {
          const rawValue = idx < row.length ? row[idx] : "";
          const value = rawValue.replace(/^"|"$/g, "").trim();
          if (!value) continue;
          const target =
            mapping && typeof mapping[header] === "string"
              ? mapping[header]
              : header;
          const normalized = String(target).trim();
          if (!normalized) continue;
          if (normalized.startsWith("attributes.")) {
            const key = normalized.slice("attributes.".length).trim();
            if (key) attributes[key] = value;
            continue;
          }
          if (
            normalized === "walletAddress" ||
            normalized === "wallet" ||
            normalized === "wallet_address" ||
            normalized === "address"
          ) {
            body.walletAddress = value;
            body.wallet = value;
          } else if (normalized === "tags") body.tags = toTags(value);
          else body[normalized] = value;
        }
        if (Object.keys(attributes).length > 0) body.attributes = attributes;
        if (!body.email && !body.wallet && !body.walletAddress) {
          pushError({ rowNumber, message: "Missing email or wallet" });
          job.processedRows += 1;
          continue;
        }
        await upsertOne(body, rowNumber);
        job.processedRows += 1;
      }
    } else {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed)
        ? parsed
        : isJsonObject(parsed) &&
            Array.isArray((parsed as { data?: unknown }).data)
          ? ((parsed as { data?: unknown }).data as unknown[])
          : null;
      if (!arr) {
        job.state = "failed";
        pushError({
          message: "Invalid JSON format. Expected an array or { data: [] }",
        });
      } else {
        job.totalRows = arr.length;
        const limit = Math.min(arr.length, maxRows);
        for (let i = 0; i < limit; i += 1) {
          const item = arr[i];
          const rowNumber = i + 1;
          const obj = isJsonObject(item)
            ? (item as Record<string, unknown>)
            : {};
          const next: Record<string, unknown> = {};
          if (typeof obj.email === "string") next.email = obj.email;
          if (typeof obj.name === "string") next.name = obj.name;
          if (typeof obj.walletAddress === "string") {
            next.walletAddress = obj.walletAddress;
            next.wallet = obj.walletAddress;
          }
          if (typeof obj.wallet === "string" && !("walletAddress" in next)) {
            next.walletAddress = obj.wallet;
            next.wallet = obj.wallet;
          }
          if ("tags" in obj) {
            const tags = toTags(obj.tags);
            if (tags) next.tags = tags;
          }
          if (isJsonObject(obj.attributes)) next.attributes = obj.attributes;
          for (const [k, v] of Object.entries(obj)) {
            if (
              k === "email" ||
              k === "name" ||
              k === "wallet" ||
              k === "walletAddress" ||
              k === "tags" ||
              k === "attributes"
            ) {
              continue;
            }
            next.attributes ??= {};
            if (isJsonObject(next.attributes))
              (next.attributes as Record<string, unknown>)[k] = v;
          }
          if (!next.email && !next.wallet && !next.walletAddress) {
            pushError({ rowNumber, message: "Missing email or wallet" });
            job.processedRows += 1;
            continue;
          }
          await upsertOne(next, rowNumber);
          job.processedRows += 1;
        }
      }
    }

    job.state = job.state === "failed" ? "failed" : "completed";
    job.finishedAt = new Date().toISOString();
  } catch (e) {
    job.state = "failed";
    job.finishedAt = new Date().toISOString();
    pushError({
      message: e instanceof Error ? e.message : "Import failed",
    });
  }

  const responseData = {
    jobId: job.jobId,
    state: job.state,
    format: job.format,
    createdAt: job.createdAt,
  };

  return okJson(
    req,
    {
      success: true,
      message: "Import job created",
      data: responseData,
      timestamp: new Date().toISOString(),
      requestId: "local",
    },
    202
  );
}
