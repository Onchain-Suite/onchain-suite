import { describe, expect, it } from "vitest";

import type { ConsentView } from "../contracts/consent";
import {
  CONSENT_SOURCE_OPTIONS,
  consentDateLabel,
  consentDraftError,
  consentSourceLabel,
  EMPTY_CONSENT_DRAFT,
  toConsentDeclaration,
} from "./consent";

const NOW = new Date("2026-11-22T12:00:00Z");

const view = (over: Partial<ConsentView>): ConsentView => ({
  id: "c1",
  consentSource: "import",
  consentMethod: null,
  consentAt: "2024-03-01T00:00:00.000Z",
  consentAtKnown: true,
  consentText: null,
  consentProof: null,
  consentIp: null,
  doubleOptIn: false,
  originId: null,
  recordedAt: null,
  storedAs: "record",
  ...over,
});

describe("consent draft", () => {
  it("never offers a purchased list as a source", () => {
    const labels = CONSENT_SOURCE_OPTIONS.map((o) => o.label.toLowerCase());
    expect(labels.some((l) => /purchas|bought|rent|scrap/.test(l))).toBe(false);
  });

  it("requires a source, and a description for other", () => {
    expect(consentDraftError(EMPTY_CONSENT_DRAFT, NOW)).toMatch(/choose/i);
    expect(
      consentDraftError({ ...EMPTY_CONSENT_DRAFT, source: "other" }, NOW)
    ).toMatch(/describe/i);
    expect(
      consentDraftError(
        { ...EMPTY_CONSENT_DRAFT, source: "other", otherSource: "Discord" },
        NOW
      )
    ).toBeNull();
  });

  it("rejects a future or malformed date", () => {
    const base = { ...EMPTY_CONSENT_DRAFT, source: "event" as const };
    expect(
      consentDraftError({ ...base, obtainedAt: "2027-01-01" }, NOW)
    ).toMatch(/future/i);
    expect(
      consentDraftError({ ...base, obtainedAt: "01/02/2024" }, NOW)
    ).toMatch(/valid/i);
    expect(
      consentDraftError({ ...base, obtainedAt: "2024-01-02" }, NOW)
    ).toBeNull();
  });

  it("builds the wire declaration with only the fields given", () => {
    expect(
      toConsentDeclaration({ ...EMPTY_CONSENT_DRAFT, source: "website_form" })
    ).toEqual({ source: "A signup form on our website" });
    expect(
      toConsentDeclaration({
        source: "other",
        otherSource: "  Telegram bot  ",
        obtainedAt: "2024-03-01",
        proof: " https://example.com/form ",
        doubleOptIn: true,
      })
    ).toEqual({
      source: "Telegram bot",
      obtainedAt: "2024-03-01",
      proof: "https://example.com/form",
      doubleOptIn: true,
    });
  });
});

describe("consent view labels", () => {
  it("names integrations and known sources", () => {
    expect(
      consentSourceLabel(view({ consentSource: "integration:mailchimp" }))
    ).toBe("Migrated from Mailchimp");
    expect(consentSourceLabel(view({ consentSource: "api" }))).toBe(
      "Added through the API"
    );
    expect(
      consentSourceLabel(
        view({ consentSource: null, storedAs: "form_submission" })
      )
    ).toBe("Signup form");
  });

  it("says date unknown when the backend had no real date", () => {
    expect(consentDateLabel(view({ consentAtKnown: false }), "en-US")).toBe(
      "Date unknown"
    );
    expect(consentDateLabel(view({}), "en-US")).toBe("Mar 1, 2024");
  });
});
