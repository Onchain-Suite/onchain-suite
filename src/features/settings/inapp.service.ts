"use client";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId } from "@/lib/utils";

import {
  type InAppOrigin,
  type InAppStatus,
  normalizeInAppOrigins,
  normalizeInAppStatus,
} from "./utils/inapp-status";

/**
 * Read-only client for the in-app (web SDK) integration status and allow-listed
 * origins. The settings panel owns the full read/write surface; this is the lean
 * read the campaign wizard uses to tell whether web in-app push is set up.
 *
 * `x-onchain-silent-error` keeps a 403 (non-admin) from raising a global toast -
 * the caller treats an error as "readiness unknown" rather than "not ready".
 */
const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const get = async (url: string, orgId?: string): Promise<unknown> => {
  const resolved = pickOrgId(orgId);
  const res = await apiClient.request<unknown>({
    method: "GET",
    url,
    headers: {
      ...(resolved ? { "x-org-id": resolved } : {}),
      "x-onchain-silent-error": "1",
    },
  });
  return res.data;
};

export const inAppService = {
  /** `GET /integrations/inapp/status` - publishable keys + live session count. */
  async getStatus(orgId?: string): Promise<InAppStatus> {
    return normalizeInAppStatus(await get("/integrations/inapp/status", orgId));
  },

  /** `GET /integrations/inapp/origins` - the allow-listed web origins. */
  async listOrigins(orgId?: string): Promise<InAppOrigin[]> {
    return normalizeInAppOrigins(
      await get("/integrations/inapp/origins", orgId)
    );
  },
};
