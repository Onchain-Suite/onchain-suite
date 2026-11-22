import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import {
  type AudienceImportExportFormat,
  audienceService,
} from "../audience.service";

/**
 * Upload an import file and return the job id. Moved out of the 2.5k-line
 * import component when the consent declaration was added, so the upload
 * path (proxy vs direct, retries, the `options` JSON) is one place.
 *
 * Small files go through the same-origin API proxy (it injects the session);
 * the proxy runs on a serverless function with a ~4.5MB body cap, so larger
 * files go straight to the backend.
 */

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isRateLimitedError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const err = error as { cause?: unknown; message?: unknown };
  const candidate = (err.cause ?? err) as {
    response?: { status?: unknown };
    status?: unknown;
    message?: unknown;
  };
  const status =
    typeof candidate.response?.status === "number"
      ? candidate.response.status
      : typeof candidate.status === "number"
        ? candidate.status
        : null;
  if (status === 429) return true;
  const msg =
    typeof err.message === "string"
      ? err.message
      : typeof candidate.message === "string"
        ? candidate.message
        : "";
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
};

// Large imports (100k+ rows) exceed the Next.js/Vercel proxy body cap, so upload
// straight to the backend when NEXT_PUBLIC_BACKEND_URL is set.
const getDirectBackendBaseUrl = () => {
  const raw = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
};

const unwrapBackendEnvelope = (payload: unknown): unknown => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data ?? payload;
  }
  return payload;
};

const PROXY_BODY_LIMIT = 4 * 1024 * 1024; // headroom under the ~4.5MB cap

export interface UploadImportInput {
  file: File;
  format: AudienceImportExportFormat;
  mapping?: Record<string, string>;
  platform?: string;
  query: Record<string, string | number | boolean | undefined>;
  /** Multipart `options` JSON. Carries `consent` (required by the backend). */
  options: Record<string, unknown>;
}

/** Build the direct-upload body. Exported for the test: `options` must be its own JSON part. */
export function buildImportFormData(input: UploadImportInput): FormData {
  const fd = new FormData();
  fd.append("file", input.file);
  if (input.mapping && Object.keys(input.mapping).length > 0) {
    fd.append("mapping", JSON.stringify(input.mapping));
  }
  if (Object.keys(input.options).length > 0) {
    fd.append("options", JSON.stringify(input.options));
  }
  return fd;
}

export async function uploadImportFile(
  input: UploadImportInput
): Promise<{ jobId: string }> {
  const orgId = getSelectedOrganizationId();
  const directBase = getDirectBackendBaseUrl();

  const uploadDirect = async (): Promise<unknown> => {
    if (!directBase) throw new Error("Missing backend URL");
    if (!orgId) throw new Error("Missing organization id");

    const fd = buildImportFormData(input);
    const params = new URLSearchParams();
    params.set("format", input.format);
    if (input.platform) params.set("platform", input.platform);
    for (const [k, v] of Object.entries(input.query)) {
      if (v === undefined) continue;
      params.set(k, String(v));
    }

    let attempts = 0;
    for (;;) {
      const res = await fetch(`${directBase}/audience/imports?${params}`, {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: { "x-org-id": orgId },
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        return unwrapBackendEnvelope(json);
      }

      if (res.status === 429 && attempts < 3) {
        attempts += 1;
        await wait(2000 + Math.floor(Math.random() * 3000));
        continue;
      }

      const bodyText = await res.text().catch(() => "");
      throw new Error(
        `Import upload failed [HTTP ${res.status}]: ${
          bodyText.trim().length > 0 ? bodyText : "Request failed"
        }`
      );
    }
  };

  const uploadViaProxy = async (): Promise<unknown> => {
    let attempts = 0;
    for (;;) {
      try {
        return await audienceService.createImportJob({
          file: input.file,
          format: input.format,
          mapping: input.mapping,
          platform: input.platform,
          query: input.query,
          options: input.options,
        });
      } catch (innerError) {
        if (!isRateLimitedError(innerError) || attempts >= 3) throw innerError;
        attempts += 1;
        await wait(2000 + Math.floor(Math.random() * 3000));
      }
    }
  };

  let res: unknown;
  if (input.file.size <= PROXY_BODY_LIMIT) {
    res = await uploadViaProxy();
  } else {
    try {
      res = await uploadDirect();
    } catch (error) {
      const authRejected =
        error instanceof Error && /\[HTTP 40[13]\]/.test(error.message);
      const networkFailed =
        !directBase ||
        !orgId ||
        error instanceof TypeError ||
        (error instanceof Error &&
          error.message.toLowerCase().includes("failed to fetch"));
      if (authRejected || networkFailed) {
        throw new Error(
          "This file is larger than the app can proxy (~4.5MB) and the direct upload to the backend was rejected. Split it into files under 4MB to import now, or enable credentialed CORS on the backend imports endpoint so large direct uploads authenticate.",
          { cause: error }
        );
      }
      throw error;
    }
  }

  const r = isJsonObject(res) ? res : {};
  const jobId =
    typeof r.jobId === "string" && r.jobId.length > 0
      ? r.jobId
      : typeof r.id === "string" && r.id.length > 0
        ? r.id
        : null;
  if (!jobId) throw new Error("Import job started but no jobId was returned");
  return { jobId };
}
