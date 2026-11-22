import { describe, expect, it } from "vitest";

import { toContactConsent } from "./consent.service";

describe("toContactConsent", () => {
  it("unwraps the envelope and keeps current + history", () => {
    const c = toContactConsent(
      {
        success: true,
        data: {
          contactId: "ct_1",
          current: {
            id: "r1",
            consentSource: "import",
            consentMethod: "Website form",
            consentAt: "2024-03-01T00:00:00.000Z",
            consentAtKnown: true,
            doubleOptIn: true,
            storedAs: "record",
          },
          records: [
            { id: "r1", consentSource: "import", consentAtKnown: true },
            { id: "r0", consentSource: "form", storedAs: "form_submission" },
            "garbage",
          ],
        },
      },
      "ct_1"
    );
    expect(c.current?.consentMethod).toBe("Website form");
    expect(c.current?.doubleOptIn).toBe(true);
    expect(c.records.map((r) => r.id)).toEqual(["r1", "r0"]);
    expect(c.records[1].storedAs).toBe("form_submission");
    expect(c.records[1].consentAtKnown).toBe(false);
  });

  it("returns an empty history for a contact with none", () => {
    expect(
      toContactConsent(
        { data: { contactId: "x", current: null, records: [] } },
        "x"
      )
    ).toEqual({
      contactId: "x",
      current: null,
      records: [],
    });
  });
});
