import { describe, expect, it } from "vitest";

import { goalById, goalIdFromAction, GOALS, goalToPayload } from "./goals";

describe("campaign goals catalog", () => {
  it("maps supported on-chain goals to an onchain_action payload", () => {
    expect(goalToPayload("mint")).toEqual({
      name: "Mint",
      conversionType: "onchain_action",
      conversionConfig: { action: "mint" },
      attributionWindowDays: 7,
    });
    // Purchase maps to the on-chain `swap` action.
    expect(goalToPayload("buy")?.conversionConfig).toEqual({ action: "swap" });
    expect(goalToPayload("stake")?.attributionWindowDays).toBe(14);
    expect(goalToPayload("bridge")?.conversionConfig).toEqual({
      action: "bridge",
    });
  });

  it("persists no goal for 'none' or an unsupported goal", () => {
    expect(goalToPayload("none")).toBeNull();
    // Return-to-app has no on-chain source yet.
    expect(goalToPayload("return")).toBeNull();
    expect(goalById("return").supported).toBe(false);
  });

  it("rehydrates the picked id from a saved action", () => {
    expect(goalIdFromAction("swap")).toBe("buy");
    expect(goalIdFromAction("mint")).toBe("mint");
    expect(goalIdFromAction("bridge")).toBe("bridge");
    expect(goalIdFromAction(undefined)).toBe("none");
    expect(goalIdFromAction("teleport")).toBe("none");
  });

  it("offers exactly the 2.7 goal set", () => {
    expect(GOALS.map((g) => g.id)).toEqual([
      "mint",
      "buy",
      "stake",
      "bridge",
      "return",
      "none",
    ]);
  });
});
