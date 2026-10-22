import { describe, expect, it } from "vitest";

import { SETUP_STEPS } from "../data/setup-steps";
import {
  hasSynced,
  hasVerifiedDomain,
  isVerifiedStatus,
  setupNudge,
} from "./setup";
import type { DomainAuthMap } from "@/features/settings/sender-identities.service";

describe("SETUP_STEPS", () => {
  it("runs contacts, channels, then on-chain, ending with a dashboard", () => {
    expect(SETUP_STEPS.map((s) => s.id)).toEqual([
      "contacts",
      "domain",
      "push",
      "contract",
      "sync",
      "dashboard",
    ]);
  });

  it("deep-links the channel steps to their channel", () => {
    const href = (id: string) => SETUP_STEPS.find((s) => s.id === id)?.href;
    expect(href("domain")).toBe("/integrations?tab=channels&channel=email");
    expect(href("push")).toBe("/integrations?tab=channels&channel=push");
  });
});

describe("isVerifiedStatus", () => {
  it("never reads pending or failed as verified", () => {
    expect(isVerifiedStatus("VERIFIED")).toBe(true);
    expect(isVerifiedStatus("PENDING_VERIFICATION")).toBe(false);
    expect(isVerifiedStatus("verification_failed")).toBe(false);
    expect(isVerifiedStatus(undefined)).toBe(false);
  });
});

describe("hasVerifiedDomain", () => {
  const map = (v: [string, object][]) => new Map(v) as unknown as DomainAuthMap;

  it("accepts a verified row or DKIM plus SPF", () => {
    expect(hasVerifiedDomain([{ status: "verified" } as never], map([]))).toBe(
      true
    );
    expect(
      hasVerifiedDomain([], map([["a.xyz", { dkim: true, spf: true }]]))
    ).toBe(true);
    expect(
      hasVerifiedDomain([], map([["a.xyz", { dkim: true, spf: false }]]))
    ).toBe(false);
  });
});

describe("hasSynced", () => {
  it("counts only a completed sync", () => {
    expect(hasSynced({ state: "completed" })).toBe(true);
    expect(hasSynced({ state: "processing" })).toBe(false);
    expect(hasSynced({ state: "failed" })).toBe(false);
    expect(hasSynced(null)).toBe(false);
  });
});

describe("setupNudge", () => {
  it("encourages, then stops", () => {
    expect(setupNudge(0, 6)).toBe("Let’s go!");
    expect(setupNudge(2, 6)).toBe("Keep it up!");
    expect(setupNudge(5, 6)).toBe("Almost there!");
    expect(setupNudge(6, 6)).toBe("All done.");
  });
});
