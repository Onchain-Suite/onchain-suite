import { describe, expect, it } from "vitest";

import {
  buildDnsCsv,
  csvCell,
  dnsCsvFilename,
  type DnsCsvRecord,
} from "./dns-records-csv";

describe("csvCell", () => {
  it("leaves simple values untouched", () => {
    expect(csvCell("CNAME")).toBe("CNAME");
    expect(csvCell("selector1._domainkey.acme.xyz")).toBe(
      "selector1._domainkey.acme.xyz"
    );
  });

  it("quotes and escapes commas, quotes and newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("passes DNS-critical values through byte-exact", () => {
    // The apex host "@" and leading-"-" tokens must not be mangled.
    expect(csvCell("@")).toBe("@");
    expect(csvCell("-all")).toBe("-all");
    expect(csvCell("v=spf1 include:acme.net -all")).toBe(
      "v=spf1 include:acme.net -all"
    );
  });
});

describe("buildDnsCsv", () => {
  it("emits a header and one CRLF-terminated row per record", () => {
    // Names are FULL record names (fqdn), so a DNS admin can't place them one
    // zone level too high — the subdomain-vs-apex mistake this export prevents.
    const records: DnsCsvRecord[] = [
      {
        type: "TXT",
        name: "mg.acme.xyz",
        value: "v=spf1 include:acme.net -all",
      },
      {
        type: "CNAME",
        name: "s1._domainkey.mg.acme.xyz",
        value: "s1.dkim.acme.net",
      },
    ];
    expect(buildDnsCsv(records)).toBe(
      [
        "Type,Name,Value",
        "TXT,mg.acme.xyz,v=spf1 include:acme.net -all",
        "CNAME,s1._domainkey.mg.acme.xyz,s1.dkim.acme.net",
      ].join("\r\n")
    );
  });

  it("emits just the header for an empty record set", () => {
    expect(buildDnsCsv([])).toBe("Type,Name,Value");
  });

  it("quotes a value containing a comma", () => {
    const csv = buildDnsCsv([
      { type: "TXT", name: "mg.acme.xyz", value: "a, b, c" },
    ]);
    expect(csv).toBe('Type,Name,Value\r\nTXT,mg.acme.xyz,"a, b, c"');
  });
});

describe("dnsCsvFilename", () => {
  it("leads with a slugified organisation name and includes the domain", () => {
    expect(dnsCsvFilename("Acme Labs", "acme.xyz")).toBe(
      "acme-labs-acme-xyz-dns-records.csv"
    );
  });

  it("drops the domain segment when no domain is given", () => {
    expect(dnsCsvFilename("Acme Labs")).toBe("acme-labs-dns-records.csv");
  });

  it("falls back to 'organization' when the name is missing or empty", () => {
    expect(dnsCsvFilename(undefined, "acme.xyz")).toBe(
      "organization-acme-xyz-dns-records.csv"
    );
    expect(dnsCsvFilename("   ", "acme.xyz")).toBe(
      "organization-acme-xyz-dns-records.csv"
    );
  });
});
