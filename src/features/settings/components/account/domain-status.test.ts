import { describe, expect, it } from "vitest";

import { normalizeDomainStatus } from "./domain-status";

describe("normalizeDomainStatus", () => {
  it("treats explicit success tokens as verified", () => {
    for (const raw of [
      "VERIFIED",
      "verified",
      "Success",
      "ACTIVE",
      "complete",
    ]) {
      expect(normalizeDomainStatus(raw)).toBe("verified");
    }
  });

  it("keeps in-progress verification as pending (not verified)", () => {
    for (const raw of [
      "VERIFICATION_IN_PROGRESS",
      "VerificationInProgress",
      "PENDING_VERIFICATION",
      "pending",
      "unverified",
    ]) {
      expect(normalizeDomainStatus(raw)).toBe("pending");
    }
  });

  it("keeps a not-started verification as pending", () => {
    expect(normalizeDomainStatus("VERIFICATION_NOT_STARTED")).toBe("pending");
    expect(normalizeDomainStatus("NotStarted")).toBe("pending");
  });

  it("classifies failures", () => {
    for (const raw of [
      "VERIFICATION_FAILED",
      "failed",
      "invalid",
      "rejected",
    ]) {
      expect(normalizeDomainStatus(raw)).toBe("failed");
    }
  });

  it("defaults to pending for empty or unknown input", () => {
    expect(normalizeDomainStatus(undefined)).toBe("pending");
    expect(normalizeDomainStatus("")).toBe("pending");
    expect(normalizeDomainStatus(42)).toBe("pending");
    expect(normalizeDomainStatus("something-else")).toBe("pending");
  });
});
