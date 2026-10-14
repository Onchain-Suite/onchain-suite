"use client";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * X (Twitter) channel connection. The X send backend (OAuth with dm.write, the
 * follower sync) is net-new and not deployed yet, so `getStatus` reads
 * defensively and treats a missing endpoint as "not connected" rather than an
 * error. The connect flow is a real OAuth redirect once the backend ships; until
 * then the panel stubs it. `x-onchain-silent-error` keeps a 404/403 quiet.
 *
 * X has a shape email and push do not: connecting is the easy half, the audience
 * is the hard half. X only permits a DM to someone who follows you, so
 * `reachableFollowers` (followers with a linked wallet) is the ceiling on reach,
 * not the segment size. The status reflects both: `pending` = authorised but
 * nobody reachable yet.
 */

/** Query key for the X connection status, shared by the panel and the
 *  channel-readiness hook so the status is read once. */
export const X_STATUS_KEY = (orgId: string | null) =>
  ["channels", "x", "status", orgId] as const;

export type XConnectionStatus = "none" | "pending" | "connected";

export interface XConnection {
  handle: string | null;
  status: XConnectionStatus;
  authorized: boolean;
  /** Followers whose wallet is linked - the only people a DM can reach. */
  reachableFollowers: number;
  /** A follower sync has run at least once. */
  checked: boolean;
}

export const X_DISCONNECTED: XConnection = {
  handle: null,
  status: "none",
  authorized: false,
  reachableFollowers: 0,
  checked: false,
};

function normalizeXConnection(input: unknown): XConnection {
  const data =
    isJsonObject(input) && "data" in input && isJsonObject(input.data)
      ? input.data
      : input;
  if (!isJsonObject(data)) return X_DISCONNECTED;

  const authorized = data.authorized === true;
  const reachableFollowers =
    typeof data.reachableFollowers === "number" && data.reachableFollowers > 0
      ? data.reachableFollowers
      : 0;
  const rawStatus = typeof data.status === "string" ? data.status : "";
  const status: XConnectionStatus = ["connected", "pending", "none"].includes(
    rawStatus
  )
    ? (rawStatus as XConnectionStatus)
    : authorized
      ? reachableFollowers > 0
        ? "connected"
        : "pending"
      : "none";

  return {
    handle: typeof data.handle === "string" ? data.handle : null,
    status,
    authorized,
    reachableFollowers,
    checked: data.checked === true,
  };
}

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

export const xService = {
  /** `GET /channels/x/status`. Returns disconnected when the backend is absent. */
  async getStatus(orgId?: string): Promise<XConnection> {
    const resolved = pickOrgId(orgId);
    try {
      const res = await apiClient.request<unknown>({
        method: "GET",
        url: "/channels/x/status",
        headers: {
          ...(resolved ? { "x-org-id": resolved } : {}),
          "x-onchain-silent-error": "1",
        },
      });
      return normalizeXConnection(res.data);
    } catch {
      // No X backend yet: treat as not connected rather than failing the tab.
      return X_DISCONNECTED;
    }
  },
};
