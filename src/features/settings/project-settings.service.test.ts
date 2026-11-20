import { describe, expect, it, vi } from "vitest";

import {
  normalizeProjectSettings,
  type ProjectSettingsFormData,
  toSavePayload,
} from "./project-settings.service";

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
}));

const wire = {
  projectName: "Acme",
  billingEmail: "billing@acme.xyz",
  timezone: "UTC",
  tokenTicker: "ACME",
  primaryChains: ["base"],
  contractAddresses: [
    {
      chain: "base",
      address: "0xaaa",
      label: "Mint",
      icon: "https://cdn/x.png",
      feeBps: 10_000,
    },
    { chain: "ethereum", address: "0xbbb", feeBps: 30 },
    { chain: "ethereum", address: "0xccc", label: "No fee" },
  ],
  revenueEvents: [
    { eventName: "trade_settled" },
    { eventName: "loan_repaid", amountField: "interest_usd" },
  ],
};

describe("project settings: project value fields", () => {
  it("reads feeBps, icon and revenueEvents off the GET", () => {
    const settings = normalizeProjectSettings({ success: true, data: wire });
    expect(settings.contractAddresses).toEqual([
      {
        chain: "base",
        address: "0xaaa",
        label: "Mint",
        icon: "https://cdn/x.png",
        feeBps: 10_000,
      },
      { chain: "ethereum", address: "0xbbb", feeBps: 30 },
      { chain: "ethereum", address: "0xccc", label: "No fee" },
    ]);
    expect(settings.revenueEvents).toEqual(wire.revenueEvents);
  });

  it("a save of unrelated fields sends every contract field back unchanged", () => {
    const settings = normalizeProjectSettings(wire);
    const payload = toSavePayload({ ...settings, name: "Acme v2" });
    expect(payload.projectName).toBe("Acme v2");
    expect(payload.billingEmail).toBe("billing@acme.xyz");
    expect(payload.tokenTicker).toBe("ACME");
    expect(payload.primaryChains).toEqual(["base"]);
    expect(payload.contractAddresses).toEqual(wire.contractAddresses);
    expect(payload.revenueEvents).toEqual(wire.revenueEvents);
  });

  it("a revenue-events edit keeps contracts and the other settings", () => {
    const settings = normalizeProjectSettings(wire);
    const payload = toSavePayload({
      ...settings,
      revenueEvents: [{ eventName: " deposit ", amountField: "" }],
    });
    expect(payload.revenueEvents).toEqual([{ eventName: "deposit" }]);
    expect(payload.contractAddresses).toEqual(wire.contractAddresses);
    expect(payload.projectName).toBe("Acme");
  });

  it("[] clears revenue events, but a form without the field leaves them alone", () => {
    const settings = normalizeProjectSettings(wire);
    expect(
      toSavePayload({ ...settings, revenueEvents: [] }).revenueEvents
    ).toEqual([]);
    const withoutEvents: ProjectSettingsFormData = { ...settings };
    delete withoutEvents.revenueEvents;
    expect("revenueEvents" in toSavePayload(withoutEvents)).toBe(false);
  });

  it("clearing a fee rate omits feeBps instead of sending 0", () => {
    const settings = normalizeProjectSettings(wire);
    const [first, ...rest] = settings.contractAddresses;
    const cleared = { ...first };
    delete cleared.feeBps;
    const payload = toSavePayload({
      ...settings,
      contractAddresses: [cleared, ...rest],
    });
    const rows = payload.contractAddresses as Array<Record<string, unknown>>;
    expect("feeBps" in rows[0]).toBe(false);
    expect(rows[0].icon).toBe("https://cdn/x.png");
  });
});
