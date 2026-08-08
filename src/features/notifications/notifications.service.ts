import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
}

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
    const data = err.response?.data;
    const dataObj = isJsonObject(data) ? data : undefined;
    const nestedError = isJsonObject(dataObj?.error)
      ? dataObj.error
      : undefined;
    const message =
      (isJsonObject(nestedError) ? nestedError.message : undefined) ??
      (isJsonObject(dataObj) ? dataObj.message : undefined) ??
      err.message ??
      "Notifications request failed";
    throw new Error(String(message), { cause: e });
  }
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

const normalizeNotification = (raw: unknown): NotificationItem => {
  const obj = isJsonObject(raw) ? raw : {};
  // Spread first so the normalized fields below always win - the backend row
  // may use isRead/readAt instead of read, and body instead of message.
  return {
    ...obj,
    id: String(obj.id ?? ""),
    title: obj.title ? String(obj.title) : undefined,
    message: obj.message
      ? String(obj.message)
      : obj.body
        ? String(obj.body)
        : undefined,
    type: obj.type ? String(obj.type) : undefined,
    read:
      obj.read !== undefined
        ? Boolean(obj.read)
        : obj.isRead !== undefined
          ? Boolean(obj.isRead)
          : obj.readAt !== undefined && obj.readAt !== null
            ? true
            : undefined,
    createdAt: obj.createdAt ? String(obj.createdAt) : undefined,
  };
};

export const notificationsService = {
  list(params?: ListNotificationsParams, orgId?: string) {
    return request<unknown>(
      { method: "GET", url: "/notifications", params },
      orgId
    ).then((d) => {
      return extractList(d).map(normalizeNotification);
    });
  },

  markRead(id: string, orgId?: string) {
    return request<{ success?: boolean }>(
      { method: "PUT", url: `/notifications/${id}/read` },
      orgId
    );
  },

  markAllRead(orgId?: string) {
    return request<{ success?: boolean }>(
      { method: "PUT", url: "/notifications/read-all" },
      orgId
    );
  },
};
