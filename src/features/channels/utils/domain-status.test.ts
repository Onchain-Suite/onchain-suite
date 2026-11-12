import { describe, expect, it } from "vitest";

import {
  hasVerifiedDomain,
  normalizeDomainStatus,
  toSenderDomains,
} from "./domain-status";

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

describe("toSenderDomains", () => {
  it("maps the rows of GET /domain to what the panel lists", () => {
    expect(
      toSenderDomains([
        { id: "d1", domain: "mail.acme.com", status: "VERIFIED" },
        { id: "d2", domain: " news.acme.com ", status: "PENDING_VERIFICATION" },
      ])
    ).toEqual([
      { id: "d1", domain: "mail.acme.com", status: "verified" },
      { id: "d2", domain: "news.acme.com", status: "pending" },
    ]);
  });

  it("drops a row with no domain, and keys one with no id by its name", () => {
    expect(
      toSenderDomains([
        { id: "d1" },
        { domain: "" },
        null,
        "junk",
        { domain: "mail.acme.com" },
      ])
    ).toEqual([
      { id: "mail.acme.com", domain: "mail.acme.com", status: "pending" },
    ]);
  });

  it("says the channel can send once one domain is verified", () => {
    const rows = toSenderDomains([
      { id: "a", domain: "a.com", status: "pending" },
      { id: "b", domain: "b.com", status: "verified" },
    ]);
    expect(hasVerifiedDomain(rows)).toBe(true);
    expect(hasVerifiedDomain(rows.slice(0, 1))).toBe(false);
    expect(hasVerifiedDomain([])).toBe(false);
  });
});
