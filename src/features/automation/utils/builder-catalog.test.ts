import { describe, expect, it } from "vitest";

import {
  buildCatalog,
  COSMOS_SOVREN_TRIGGER_TYPES,
  CURATED_TRIGGER_COPY,
  FIXED_TRIGGERS,
  humanizeNodeType,
  isSolanaChain,
  nodeIsTrigger,
  NON_ONCHAIN_TRIGGER_TYPES,
  ON_CHAIN_TRIGGER_TYPES,
  solanaVerdict,
  type SvmSupport,
} from "./builder-catalog";

describe("humanizeNodeType", () => {
  it("turns a snake/kebab type into Title Case words", () => {
    expect(humanizeNodeType("holder_acquired")).toBe("Holder Acquired");
    expect(humanizeNodeType("defi-health-factor")).toBe("Defi Health Factor");
    expect(humanizeNodeType("swap")).toBe("Swap");
  });
});

describe("buildCatalog", () => {
  const curated = CURATED_TRIGGER_COPY;
  const fallback = FIXED_TRIGGERS;
  const supported = new Set(FIXED_TRIGGERS.map((t) => t.type));

  it("prefers curated copy over the backend's own label", () => {
    const out = buildCatalog(
      [
        {
          type: "holder_acquired",
          label: "Raw backend label",
          description: "",
        },
      ],
      curated,
      fallback,
      supported
    );
    expect(out).toEqual([
      {
        type: "holder_acquired",
        label: "Token acquired",
        description: "A wallet acquires your token or NFT",
      },
    ]);
  });

  it("falls back to the backend label, then a humanized type, when uncurated", () => {
    const out = buildCatalog(
      [
        { type: "brand_new_trigger", label: "Fresh Label", description: "d" },
        { type: "another_new_one", label: "", description: "" },
      ],
      curated,
      fallback,
      supported
    );
    expect(out[0]).toEqual({
      type: "brand_new_trigger",
      label: "Fresh Label",
      description: "d",
    });
    // Empty backend label must fall through to the humanized type, not win.
    expect(out[1].label).toBe("Another New One");
  });

  it("renders the curated fallback filtered to supported types when live is empty", () => {
    const out = buildCatalog(
      [],
      curated,
      fallback,
      new Set(["holder_acquired", "swap_completed"])
    );
    expect(out.map((e) => e.type)).toEqual([
      "holder_acquired",
      "swap_completed",
    ]);
  });
});

describe("nodeIsTrigger", () => {
  it("recognizes the generic trigger card, a canonical type, and a data-only type", () => {
    expect(nodeIsTrigger("trigger")).toBe(true);
    expect(nodeIsTrigger("holder_acquired")).toBe(true);
    expect(nodeIsTrigger("email", "email_opened")).toBe(true);
  });

  it("is false for action nodes", () => {
    expect(nodeIsTrigger("send_email")).toBe(false);
    expect(nodeIsTrigger(undefined, undefined)).toBe(false);
  });

  it("recognizes Custom Event + Sovren preset triggers loaded from a saved flow", () => {
    // A node loaded from a saved automation carries its canonical type (no
    // "trigger" renderer key). If these were not recognized, the go-live gate
    // would falsely report MISSING_TRIGGER on a configured Sovren/custom flow.
    for (const type of [
      "custom_event",
      "sovren_license_assigned",
      "sovren_license_reserve_issued",
      "sovren_license_activated",
      "sovren_rewards_claimed",
    ]) {
      expect(nodeIsTrigger(type)).toBe(true);
    }
  });
});

describe("trigger classification sets", () => {
  it("keeps the DeFi lending trigger on-chain and the score trigger off-chain", () => {
    expect(ON_CHAIN_TRIGGER_TYPES.has("defi_health_factor")).toBe(true);
    expect(NON_ONCHAIN_TRIGGER_TYPES.has("health_threshold")).toBe(true);
    // The two must never both classify the DeFi trigger.
    expect(NON_ONCHAIN_TRIGGER_TYPES.has("defi_health_factor")).toBe(false);
  });

  it("classifies Custom Event + Sovren triggers as non-on-chain (no contract nudge, generic panel)", () => {
    // They carry no contract/event address and must route to the generic
    // schema panel, not the EVM OnchainTriggerFields. So they are NON-on-chain
    // (suppresses the "save a contract" nudge) and NOT in ON_CHAIN_TRIGGER_TYPES
    // (which would route them to the contract panel).
    for (const type of [
      "custom_event",
      "sovren_license_assigned",
      "sovren_license_activated",
      "sovren_rewards_claimed",
    ]) {
      expect(NON_ONCHAIN_TRIGGER_TYPES.has(type)).toBe(true);
      expect(ON_CHAIN_TRIGGER_TYPES.has(type)).toBe(false);
    }
  });

  it("gives Cosmos/Sovren triggers their own palette group, disjoint from on-chain", () => {
    // The group drives a dedicated "Cosmos / Sovren" section in the builder
    // palette. It must be exactly the custom-event family and must not overlap
    // the on-chain group (which routes to the EVM contract panel).
    expect([...COSMOS_SOVREN_TRIGGER_TYPES].sort()).toEqual(
      [
        "custom_event",
        "sovren_license_activated",
        "sovren_license_assigned",
        "sovren_license_reserve_issued",
        "sovren_rewards_claimed",
      ].sort()
    );
    for (const type of COSMOS_SOVREN_TRIGGER_TYPES) {
      expect(ON_CHAIN_TRIGGER_TYPES.has(type)).toBe(false);
    }
  });
});

describe("solanaVerdict", () => {
  const jupiter: SvmSupport = {
    supported: true,
    programIds: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"],
    defaultConfig: {
      contractAddress: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    },
    source: "Jupiter Aggregator v6",
  };
  const noArm: SvmSupport = { supported: false, reason: "protocol-specific" };

  it("says nothing on an EVM chain", () => {
    expect(solanaVerdict(noArm, "eth-mainnet")).toBeNull();
    expect(solanaVerdict(jupiter, "base-mainnet")).toBeNull();
  });

  it("blocks an unsupported trigger on any Solana cluster", () => {
    for (const chain of ["solana-mainnet", "solana-devnet", "SOLANA-Devnet"]) {
      expect(solanaVerdict(noArm, chain)).toEqual(noArm);
    }
  });

  it("returns the program id for a supported trigger", () => {
    expect(solanaVerdict(jupiter, "solana-mainnet")).toEqual(jupiter);
  });

  it("treats a missing svm block as unknown, not unsupported", () => {
    // An older backend sends no `svm`. Greying out every trigger against it
    // would be a worse failure than letting the publish-time check catch one.
    expect(solanaVerdict(undefined, "solana-mainnet")).toBeNull();
  });
});

describe("isSolanaChain", () => {
  it("matches every cluster and nothing else", () => {
    expect(isSolanaChain("solana-mainnet")).toBe(true);
    expect(isSolanaChain("solana-devnet")).toBe(true);
    expect(isSolanaChain("eth-mainnet")).toBe(false);
    expect(isSolanaChain("")).toBe(false);
    expect(isSolanaChain(undefined)).toBe(false);
  });
});
