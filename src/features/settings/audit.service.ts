"use client";

import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Typed service for the org audit log (`GET /organization/audit`). Owner/admin
 * only (the backend 403s otherwise). Cursor-paginated, newest first.
 */

export interface AuditTarget {
  kind: string | null;
  id?: string | null;
  label: string;
}

export interface AuditEntry {
  id: string;
  /** ISO timestamp. */
  at: string;
  /** Snapshot of who acted (name or email). */
  actorLabel: string;
  area: string;
  /** Subject-less sentence, e.g. "invited a teammate to the workspace". */
  action: string;
  target: AuditTarget | null;
}

export interface AuditPage {
  items: AuditEntry[];
  nextCursor: string | null;
  /** The areas the backend groups by, for the filter chips. */
  areas: string[];
}

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const extractData = <T>(payload: unknown): T =>
  isJsonObject(payload) && "data" in payload
    ? (payload.data as T)
    : (payload as T);

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
    const data = err.response?.data;
    const nested =
      isJsonObject(data) && isJsonObject(data.error) ? data.error : undefined;
    const message = isJsonObject(nested)
      ? nested.message
      : isJsonObject(data)
        ? data.message
        : typeof data === "string"
          ? data
          : (err.message ?? "Audit request failed");
    throw new Error(String(message), { cause: e });
  }
};

function normalizeEntry(raw: unknown): AuditEntry | null {
  if (!isJsonObject(raw) || typeof raw.id !== "string") return null;
  const target =
    isJsonObject(raw.target) && typeof raw.target.label === "string"
      ? {
          kind: typeof raw.target.kind === "string" ? raw.target.kind : null,
          id: typeof raw.target.id === "string" ? raw.target.id : null,
          label: raw.target.label,
        }
      : null;
  return {
    id: raw.id,
    at: typeof raw.at === "string" ? raw.at : new Date().toISOString(),
    actorLabel: typeof raw.actorLabel === "string" ? raw.actorLabel : "Someone",
    area: typeof raw.area === "string" ? raw.area : "settings",
    action: typeof raw.action === "string" ? raw.action : "made a change",
    target,
  };
}

export const auditService = {
  async list(
    params: { area?: string; cursor?: string; limit?: number } = {},
    orgId?: string
  ): Promise<AuditPage> {
    const payload = await request<unknown>(
      {
        method: "GET",
        url: "/organization/audit",
        params: {
          ...(params.area ? { area: params.area } : {}),
          ...(params.cursor ? { cursor: params.cursor } : {}),
          ...(params.limit ? { limit: params.limit } : {}),
        },
      },
      orgId
    );
    const root = isJsonObject(payload) ? payload : {};
    const items = Array.isArray(root.items)
      ? root.items
          .map(normalizeEntry)
          .filter((e): e is AuditEntry => e !== null)
      : [];
    return {
      items,
      nextCursor: typeof root.nextCursor === "string" ? root.nextCursor : null,
      areas: Array.isArray(root.areas)
        ? root.areas.filter((a): a is string => typeof a === "string")
        : [],
    };
  },
};
