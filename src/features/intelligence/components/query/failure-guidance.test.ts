import { describe, expect, it } from "vitest";

import { guidanceForAgentFailure } from "./index";

describe("agent failure guidance names the meter that ran out", () => {
  it("onchain credits", () => {
    for (const m of [
      "Onchain credit allowance exhausted for this billing period. Top up your wallet to continue usage-based, or upgrade your plan.",
      "CREDITS_EXCEEDED",
      "ONCHAIN_CREDITS_EXHAUSTED",
    ]) {
      expect(guidanceForAgentFailure(m, 402)).toMatch(/Onchain credits/);
    }
  });

  it("AI credits", () => {
    for (const m of [
      "AI credit allowance exhausted for this billing period.",
      "AI_CREDITS_EXCEEDED",
    ]) {
      expect(guidanceForAgentFailure(m, 402)).toMatch(/AI credit allowance/);
    }
  });
});
