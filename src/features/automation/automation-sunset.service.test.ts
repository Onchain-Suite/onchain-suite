import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  automationSunsetService,
  toSunsetSetting,
} from "./automation-sunset.service";

const get = vi.fn();
const put = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    put: (...a: unknown[]) => put(...a),
  },
}));
vi.mock("@/lib/utils", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getSelectedOrganizationId: () => "org_1",
}));

describe("automationSunsetService", () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
  });

  it("reads the switch through the envelope", async () => {
    get.mockResolvedValue({
      data: {
        success: true,
        data: { automationId: "a1", sunset: false, default: true },
      },
    });
    const s = await automationSunsetService.get("a1");
    expect(s).toEqual({ automationId: "a1", sunset: false, default: true });
    expect(get.mock.calls[0][0]).toBe("/automations/a1/settings/sunset");
    expect(get.mock.calls[0][1].headers["x-org-id"]).toBe("org_1");
  });

  it("writes { sunset } with PUT", async () => {
    put.mockResolvedValue({
      data: { data: { automationId: "a1", sunset: true } },
    });
    const s = await automationSunsetService.set("a1", true);
    expect(put.mock.calls[0][1]).toEqual({ sunset: true });
    expect(s.sunset).toBe(true);
  });

  it("defaults to on when the body is missing the field", () => {
    expect(toSunsetSetting({}, "a2")).toEqual({
      automationId: "a2",
      sunset: true,
      default: true,
    });
  });
});
