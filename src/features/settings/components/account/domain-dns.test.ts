import { describe, expect, it } from "vitest";

import { dnsRecordStage, parseDomainDns } from "./domain-dns";

describe("dnsRecordStage", () => {
  it("reports a verified record as done", () => {
    const stage = dnsRecordStage({ verified: true });
    expect(stage.label).toBe("Verified");
    expect(stage.tone).toBe("success");
    expect(stage.hint).toMatch(/nothing to do/i);
  });

  it("reports a failed record as actionable", () => {
    const stage = dnsRecordStage({ verified: false });
    expect(stage.label).toBe("Failed");
    expect(stage.tone).toBe("danger");
    expect(stage.hint).toMatch(/update it/i);
  });

  it("explains an in-progress record as published and waiting", () => {
    const stage = dnsRecordStage({ verificationLabel: "In progress" });
    expect(stage.label).toBe("In progress");
    expect(stage.tone).toBe("pending");
    expect(stage.hint).toMatch(/waiting for the provider/i);
  });

  it("tells the user a not-started record is not in DNS yet", () => {
    const stage = dnsRecordStage({ verificationLabel: "Not started" });
    expect(stage.label).toBe("Not started");
    expect(stage.tone).toBe("pending");
    expect(stage.hint).toMatch(/not added to your dns/i);
  });

  it("falls back to a neutral pending stage when nothing is known", () => {
    const stage = dnsRecordStage({});
    expect(stage.label).toBe("Pending");
    expect(stage.tone).toBe("pending");
  });
});

describe("parseDomainDns conflict partitioning", () => {
  it("marks a non-informational conflict so the UI can expand it", () => {
    const parsed = parseDomainDns({
      records: [
        {
          host: "bounce",
          type: "TXT",
          value: "v=spf1 include:amazonses.com ~all",
          verification: "notstarted",
          conflict: {
            reason: "An SPF record already exists.",
            informational: false,
            actions: [
              {
                action: "EDIT",
                currentValue: "v=spf1 include:zohomail.com ~all",
                newValue:
                  "v=spf1 include:zohomail.com include:amazonses.com ~all",
              },
            ],
          },
        },
      ],
    });

    expect(parsed.records).toHaveLength(1);
    const [row] = parsed.records;
    expect(row.conflict?.informational).toBe(false);
    expect(row.conflict?.actions[0]?.action).toBe("EDIT");
    expect(row.verificationLabel).toBe("Not started");
  });
});
