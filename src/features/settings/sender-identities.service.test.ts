import { describe, expect, it, vi } from "vitest";

import {
  extractDomainAuthMap,
  normalizeSenderIdentities,
  resolveExplicitStatus,
} from "./sender-identities.service";

// The service imports the axios api client at module load; stub it so the
// pure helpers can be imported without a real HTTP client.
vi.mock("@/lib/api-client", () => ({
  apiClient: { request: vi.fn() },
}));

describe("resolveExplicitStatus", () => {
  it("treats explicit success tokens as verified", () => {
    for (const raw of ["VERIFIED", "verified", "Verification succeeded"]) {
      expect(resolveExplicitStatus(raw)).toBe("verified");
    }
  });

  it("keeps in-progress verification as pending (not verified)", () => {
    for (const raw of [
      "VERIFICATION_IN_PROGRESS",
      "VerificationInProgress",
      "verification-in-progress",
      "PENDING_VERIFICATION",
      "pending",
      "unverified",
    ]) {
      expect(resolveExplicitStatus(raw)).toBe("pending");
    }
  });

  it("keeps a not-started verification as pending", () => {
    expect(resolveExplicitStatus("VERIFICATION_NOT_STARTED")).toBe("pending");
    expect(resolveExplicitStatus("NotStarted")).toBe("pending");
  });

  it("classifies other in-flight states as pending", () => {
    for (const raw of ["checking", "queued", "processing", "awaiting_dns"]) {
      expect(resolveExplicitStatus(raw)).toBe("pending");
    }
  });

  it("classifies failures", () => {
    expect(resolveExplicitStatus("VERIFICATION_FAILED")).toBe("failed");
    expect(resolveExplicitStatus("failed")).toBe("failed");
  });

  it("returns undefined for unrecognized input so callers can fall back", () => {
    expect(resolveExplicitStatus()).toBeUndefined();
    expect(resolveExplicitStatus(42, null, {})).toBeUndefined();
    expect(resolveExplicitStatus("", "   ")).toBeUndefined();
    expect(resolveExplicitStatus("something-else")).toBeUndefined();
  });

  it("uses the first recognized value and skips non-strings", () => {
    expect(resolveExplicitStatus(undefined, 7, "VERIFIED")).toBe("verified");
    expect(resolveExplicitStatus("pending", "VERIFIED")).toBe("pending");
  });
});

describe("extractDomainAuthMap with mid-verification status", () => {
  it("does not mark an in-progress domain's rollup status as verified", () => {
    const map = extractDomainAuthMap([
      { domain: "acme.xyz", status: "VERIFICATION_IN_PROGRESS" },
    ]);
    expect(map.get("acme.xyz")?.status).toBe("pending");
  });
});

describe("normalizeSenderIdentities dkim/spf fallback", () => {
  it("does not flip dkim/spf to true for a mid-verification identity", () => {
    // No explicit dkim/spf booleans on the row or rollup, and the status is an
    // intermediate state: the `dkim ?? status === 'verified'` fallback must
    // resolve to false, not true.
    const rows = normalizeSenderIdentities([
      {
        id: "s_1",
        email: "team@acme.xyz",
        status: "VERIFICATION_NOT_STARTED",
      },
    ]);
    expect(rows[0]?.status).toBe("pending");
    expect(rows[0]?.dkim).toBe(false);
    expect(rows[0]?.spf).toBe(false);
  });

  it("still renders a VERIFIED identity's checks as passed", () => {
    const rows = normalizeSenderIdentities([
      { id: "s_2", email: "team@acme.xyz", status: "VERIFIED" },
    ]);
    expect(rows[0]?.status).toBe("verified");
    expect(rows[0]?.dkim).toBe(true);
    expect(rows[0]?.spf).toBe(true);
  });
});
