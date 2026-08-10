import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import {
  extractEmailContent,
  getSelectedOrganizationId,
  isJsonObject,
} from "@/lib/utils";

import {
  buildTemplateSeedPayload,
  LIBRARY_EMAIL_TEMPLATES,
  type LibraryEmailTemplate,
} from "./library-templates";

export interface SeedTemplatesResult {
  created: string[];
  skipped: string[];
  failed: { name: string; error: string }[];
}

export interface TemplateItem {
  id: string;
  name: string;
  folder?: string;
  updatedAt?: string;
  createdAt?: string;
  previewUrl?: string;
  [key: string]: unknown;
}

export interface ListTemplatesParams {
  search?: string;
  sort?: string;
  page?: number;
  folder?: string;
  limit?: number;
  /**
   * Delivery channel the template targets - "email" | "inapp"
   * (docs/backend.md: GET /templates?channel= filters exactly).
   */
  channel?: "email" | "inapp";
}

/** In-app template content shape: { channel: "inapp", title, body, ctaLabel?, ctaUrl? }. */
export interface TemplatePushContent {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

/**
 * Extract the push payload from an in-app template (`content.channel ===
 * "inapp"`). Returns null for email templates or empty content.
 */
export const extractTemplatePushContent = (
  raw: unknown
): TemplatePushContent | null => {
  const obj = isJsonObject(raw) ? raw : {};
  const content = isJsonObject(obj.content) ? obj.content : {};
  if (content.channel !== "inapp") return null;
  const title = typeof content.title === "string" ? content.title : "";
  const body = typeof content.body === "string" ? content.body : "";
  if (title.trim().length === 0 && body.trim().length === 0) return null;
  return {
    title,
    body,
    ctaLabel:
      typeof content.ctaLabel === "string" ? content.ctaLabel : undefined,
    ctaUrl: typeof content.ctaUrl === "string" ? content.ctaUrl : undefined,
  };
};

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const extractData = <T>(payload: unknown): T => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

const request = async <T>(
  config: AxiosRequestConfig,
  orgId?: string
): Promise<T> => {
  const resolvedOrgId = pickOrgId(orgId);
  const headers = {
    ...(config.headers ?? {}),
    ...(resolvedOrgId ? { "x-org-id": resolvedOrgId } : {}),
    "x-onchain-silent-error": "1",
  };

  try {
    const res = await apiClient.request<T>({ ...config, headers });
    return extractData<T>(res.data);
  } catch (e) {
    const err = e as AxiosError<unknown>;
    const status = err.response?.status;
    const data = err.response?.data;
    const dataObj = isJsonObject(data) ? data : undefined;
    const nestedError = isJsonObject(dataObj?.error)
      ? dataObj.error
      : undefined;
    const message =
      (isJsonObject(nestedError) ? nestedError.message : undefined) ??
      (isJsonObject(dataObj) ? dataObj.message : undefined) ??
      err.message ??
      "Templates request failed";
    throw new Error(
      status ? `[HTTP ${status}] ${String(message)}` : String(message),
      { cause: e }
    );
  }
};

const isHttpStatus = (err: unknown, code: number) => {
  if (!(err instanceof Error)) return false;
  return err.message.startsWith(`[HTTP ${code}]`);
};

const extractList = (payload: unknown): unknown[] => {
  const root =
    isJsonObject(payload) && "data" in payload
      ? (payload.data ?? payload)
      : payload;
  if (Array.isArray(root)) return root;
  if (isJsonObject(root) && Array.isArray(root.items)) return root.items;
  if (isJsonObject(root) && Array.isArray(root.data)) return root.data;
  return [];
};

const normalizeTemplate = (raw: unknown): TemplateItem => {
  const obj = isJsonObject(raw) ? raw : {};
  const extracted = extractEmailContent(obj);

  return {
    id: String(obj.id ?? ""),
    name: String(obj.name ?? obj.title ?? "Untitled"),
    folder: obj.folder ? String(obj.folder) : undefined,
    updatedAt: obj.updatedAt ? String(obj.updatedAt) : undefined,
    createdAt: obj.createdAt ? String(obj.createdAt) : undefined,
    previewUrl: extracted.previewUrl,
    ...obj,
  };
};

export const templatesService = {
  list(params?: ListTemplatesParams, orgId?: string) {
    return request<unknown>({ method: "GET", url: "/templates", params }, orgId)
      .then((d) => extractList(d).map(normalizeTemplate))
      .catch((e) => {
        if (!isHttpStatus(e, 404)) throw e;

        if (params?.folder && params.folder.trim().length > 0) {
          const folder = params.folder.trim();
          const nextParams: Record<string, unknown> = { ...params };
          delete nextParams.folder;
          if (folder === "saved") nextParams.access = "private";
          return request<unknown>(
            { method: "GET", url: "/email-templates", params: nextParams },
            orgId
          ).then((d) => extractList(d).map(normalizeTemplate));
        }

        return request<unknown>(
          { method: "GET", url: "/templates/public", params },
          orgId
        ).then((d) => extractList(d).map(normalizeTemplate));
      });
  },

  create(
    body: { name: string; folder?: string; content?: unknown },
    orgId?: string
  ) {
    return request<unknown>(
      { method: "POST", url: "/templates", data: body },
      orgId
    )
      .then(normalizeTemplate)
      .catch((e) => {
        if (!isHttpStatus(e, 404)) throw e;
        return request<unknown>(
          { method: "POST", url: "/email-templates", data: body },
          orgId
        ).then(normalizeTemplate);
      });
  },

  get(id: string, orgId?: string) {
    return request<unknown>({ method: "GET", url: `/templates/${id}` }, orgId)
      .then(normalizeTemplate)
      .catch((e) => {
        if (!isHttpStatus(e, 404)) throw e;
        return request<unknown>(
          { method: "GET", url: `/email-templates/${id}` },
          orgId
        )
          .then(normalizeTemplate)
          .catch((e2) => {
            if (!isHttpStatus(e2, 404)) throw e2;
            return request<unknown>(
              { method: "GET", url: `/templates/public/${id}` },
              orgId
            ).then(normalizeTemplate);
          });
      });
  },

  update(
    id: string,
    body: { name?: string; folder?: string; content?: unknown },
    orgId?: string
  ) {
    return request<unknown>(
      { method: "PUT", url: `/templates/${id}`, data: body },
      orgId
    )
      .then(normalizeTemplate)
      .catch((e) => {
        if (!isHttpStatus(e, 404)) throw e;
        return request<unknown>(
          { method: "PUT", url: `/email-templates/${id}`, data: body },
          orgId
        ).then(normalizeTemplate);
      });
  },

  remove(id: string, orgId?: string) {
    return request<{ success?: boolean }>(
      { method: "DELETE", url: `/templates/${id}` },
      orgId
    ).catch((e) => {
      if (!isHttpStatus(e, 404)) throw e;
      return request<{ success?: boolean }>(
        { method: "DELETE", url: `/email-templates/${id}` },
        orgId
      );
    });
  },

  /** Duplicate a template by id into a new editable copy. */
  async duplicate(id: string, orgId?: string) {
    const full = await templatesService.get(id, orgId);
    const baseName =
      typeof full.name === "string" && full.name.trim().length > 0
        ? full.name.trim()
        : "Template";
    const content = extractEmailContent(full);
    return templatesService.create(
      {
        name: `${baseName} (copy)`,
        content: {
          html: content.html ?? "",
          json: content.json,
          previewUrl: content.previewUrl,
          source: "duplicate",
        },
      },
      orgId
    );
  },

  /**
   * Seed the built-in Email Library templates into the backend as public
   * templates. Idempotent: any template whose name already exists (case-
   * insensitive) is skipped, so re-running is safe. Runs sequentially to keep
   * ordering stable and avoid hammering the API, and reports per-template
   * outcomes via `onProgress` for live UI feedback.
   */
  async seedLibraryTemplates(
    options: {
      templates?: LibraryEmailTemplate[];
      orgId?: string;
      onProgress?: (done: number, total: number, name: string) => void;
    } = {}
  ): Promise<SeedTemplatesResult> {
    const templates = options.templates ?? LIBRARY_EMAIL_TEMPLATES;
    const result: SeedTemplatesResult = {
      created: [],
      skipped: [],
      failed: [],
    };

    let existingNames = new Set<string>();
    try {
      const existing = await templatesService.list(
        { limit: 100 },
        options.orgId
      );
      existingNames = new Set(
        existing
          .map((t) => (typeof t.name === "string" ? t.name.toLowerCase() : ""))
          .filter((n) => n.length > 0)
      );
    } catch {
      // If listing fails, proceed optimistically - the backend can still reject
      // duplicates on its own.
    }

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    let done = 0;
    for (const template of templates) {
      done += 1;
      options.onProgress?.(done, templates.length, template.name);
      if (existingNames.has(template.name.toLowerCase())) {
        result.skipped.push(template.name);
        continue;
      }

      // Up to 3 attempts with exponential backoff - many partial-seed failures
      // are transient (rate limits / cold backend), so a retry recovers them.
      let lastError = "Unknown error";
      let created = false;
      for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
        if (attempt > 0) await sleep(400 * attempt);
        try {
          await templatesService.create(
            buildTemplateSeedPayload(template),
            options.orgId
          );
          created = true;
        } catch (e) {
          lastError = e instanceof Error ? e.message : "Unknown error";
        }
      }

      if (created) {
        result.created.push(template.name);
      } else {
        result.failed.push({ name: template.name, error: lastError });
      }
      // Gentle spacing between templates to avoid hammering the API.
      await sleep(150);
    }

    return result;
  },
};
