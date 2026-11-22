import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type { AutomationSunsetSetting } from "./contracts/sunset";

export type { AutomationSunsetSetting } from "./contracts/sunset";

const headers = () => {
  const orgId = getSelectedOrganizationId();
  return {
    ...(orgId ? { "x-org-id": orgId } : {}),
    "x-onchain-silent-error": "1",
  };
};

/** Unwrap `{ success, data }` and default anything missing to the backend default (on). */
export function toSunsetSetting(
  payload: unknown,
  automationId: string
): AutomationSunsetSetting {
  const root =
    isJsonObject(payload) && "data" in payload ? payload.data : payload;
  const o = isJsonObject(root) ? root : {};
  return {
    automationId:
      typeof o.automationId === "string" ? o.automationId : automationId,
    sunset: o.sunset !== false,
    default: o.default !== false,
  };
}

export const automationSunsetService = {
  async get(automationId: string): Promise<AutomationSunsetSetting> {
    const res = await apiClient.get(
      `/automations/${encodeURIComponent(automationId)}/settings/sunset`,
      { headers: headers() }
    );
    return toSunsetSetting(res.data, automationId);
  },

  async set(
    automationId: string,
    sunset: boolean
  ): Promise<AutomationSunsetSetting> {
    const res = await apiClient.put(
      `/automations/${encodeURIComponent(automationId)}/settings/sunset`,
      { sunset },
      { headers: headers() }
    );
    return toSunsetSetting(res.data, automationId);
  },
};
