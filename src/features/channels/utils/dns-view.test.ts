import { getDomain } from "tldts";
import { describe, expect, it } from "vitest";

import {
  ago,
  cleanDomain,
  dnsGroupOf,
  dnsProgress,
  groupDnsRecords,
  isDomain,
  needsFix,
  progressPercent,
  provisionedRecords,
  recordName,
  relativeHost,
  zoneFile,
  zoneOf,
} from "./dns-view";

const DOMAIN = "mail.acme.com";

/** The record set SES asks for: three signing keys, a bounce host, a policy. */
const records = [
  {
    id: "1",
    host: "abc._domainkey",
    fqdn: "abc._domainkey.mail.acme.com",
    type: "CNAME",
    value: "abc.dkim.amazonses.com",
  },
  {
    id: "2",
    host: "def._domainkey",
    fqdn: "def._domainkey.mail.acme.com",
    type: "CNAME",
    value: "def.dkim.amazonses.com",
  },
  {
    id: "3",
    host: "bounce",
    fqdn: "bounce.mail.acme.com",
    type: "MX",
    value: "10 feedback-smtp.us-east-1.amazonses.com",
  },
  {
    id: "4",
    host: "bounce",
    fqdn: "bounce.mail.acme.com",
    type: "TXT",
    value: "v=spf1 include:amazonses.com ~all",
  },
  {
    id: "5",
    host: "_dmarc",
    fqdn: "_dmarc.mail.acme.com",
    type: "TXT",
    value: "v=DMARC1; p=none;",
  },
];

/** The public suffix list, as the app loads it. */
const registrable = (domain: string) =>
  getDomain(domain, { allowPrivateDomains: false });

describe("zoneOf", () => {
  it("is the registrable domain, which is where records are added", () => {
    expect(zoneOf("mail.acme.com", registrable)).toBe("acme.com");
    expect(zoneOf("acme.com", registrable)).toBe("acme.com");
    expect(zoneOf("a.b.mail.acme.com", registrable)).toBe("acme.com");
  });

  // A list kept by hand had co.uk and not com.cn: the zone came out as
  // "com.cn", the short host as "bounce.mail.acme", and a record added that
  // way sits on the wrong name and never verifies.
  it("knows a two-label suffix from the public suffix list, not from a guess", () => {
    expect(zoneOf("mail.acme.com.cn", registrable)).toBe("acme.com.cn");
    expect(zoneOf("mail.acme.co.uk", registrable)).toBe("acme.co.uk");
    expect(zoneOf("acme.com.ng", registrable)).toBe("acme.com.ng");
    expect(zoneOf("mail.acme.kyoto.jp", registrable)).toBe("acme.kyoto.jp");
    // And does not invent one: .co is a top-level domain of its own.
    expect(zoneOf("mail.acme.co", registrable)).toBe("acme.co");
  });

  it("ignores case, spaces and a trailing dot", () => {
    expect(zoneOf(" Mail.Acme.COM. ", registrable)).toBe("acme.com");
  });

  // No zone means whole names are shown, which are right in any zone.
  it("is unknown until the list is there, and when it cannot place the domain", () => {
    expect(zoneOf("mail.acme.com", null)).toBeNull();
    expect(zoneOf("mail.acme.com", undefined)).toBeNull();
    expect(zoneOf("mail.acme.com", () => null)).toBeNull();
    expect(zoneOf("", registrable)).toBeNull();
    expect(zoneOf("localhost", registrable)).toBeNull();
    expect(
      zoneOf("mail.acme.com", () => {
        throw new Error("boom");
      })
    ).toBeNull();
  });

  it("refuses a zone the domain is not in", () => {
    expect(zoneOf("mail.acme.com", () => "other.io")).toBeNull();
    expect(zoneOf("notacme.com", () => "acme.com")).toBeNull();
  });
});

describe("recordName", () => {
  it("is the full name the backend sent", () => {
    expect(
      recordName({ host: "bounce", fqdn: "Bounce.Mail.Acme.com." }, DOMAIN)
    ).toBe("bounce.mail.acme.com");
  });

  // Records shown before a domain has a DNS report carry a host relative to
  // the sending domain and no full name.
  it("puts a relative host under the sending domain", () => {
    expect(recordName({ host: "bounce" }, DOMAIN)).toBe("bounce.mail.acme.com");
    expect(recordName({ host: "abc._domainkey" }, DOMAIN)).toBe(
      "abc._domainkey.mail.acme.com"
    );
  });

  it("is the sending domain itself for @ or an empty host", () => {
    expect(recordName({ host: "@" }, DOMAIN)).toBe(DOMAIN);
    expect(recordName({ host: "" }, DOMAIN)).toBe(DOMAIN);
  });

  it("does not add the domain to a host that already ends in it", () => {
    expect(recordName({ host: "bounce.mail.acme.com" }, DOMAIN)).toBe(
      "bounce.mail.acme.com"
    );
    expect(recordName({ host: "mail.acme.com" }, DOMAIN)).toBe(DOMAIN);
    // "xmail.acme.com" ends in the same letters but is not under it.
    expect(recordName({ host: "xmail.acme.com" }, DOMAIN)).toBe(
      "xmail.acme.com.mail.acme.com"
    );
  });
});

describe("relativeHost", () => {
  // Typed as the full name into a provider that adds the zone itself, a record
  // lands at bounce.mail.acme.com.acme.com and never verifies.
  it("drops the zone, which most providers add for you", () => {
    expect(relativeHost("bounce.mail.acme.com", "acme.com")).toBe(
      "bounce.mail"
    );
    expect(relativeHost("_dmarc.acme.com", "acme.com")).toBe("_dmarc");
  });

  it("is @ for the zone itself", () => {
    expect(relativeHost("acme.com", "acme.com")).toBe("@");
  });

  it("leaves a name outside the zone alone", () => {
    expect(relativeHost("bounce.other.io", "acme.com")).toBe("bounce.other.io");
    // "notacme.com" ends in "acme.com" but is not under it.
    expect(relativeHost("notacme.com", "acme.com")).toBe("notacme.com");
  });
});

describe("grouping", () => {
  it("reads the group from the name, type and value", () => {
    expect(records.map(dnsGroupOf)).toEqual([
      "dkim",
      "dkim",
      "bounce",
      "bounce",
      "dmarc",
    ]);
  });

  it("puts a record it does not recognise under Other", () => {
    expect(
      dnsGroupOf({ host: "em123", type: "CNAME", value: "u1.wl.sendgrid.net" })
    ).toBe("other");
  });

  it("reads a quoted SPF value, and a DMARC policy on any host", () => {
    expect(
      dnsGroupOf({ host: "bounce", type: "TXT", value: '"v=spf1 -all"' })
    ).toBe("bounce");
    expect(
      dnsGroupOf({ host: "policy", type: "TXT", value: "v=DMARC1; p=none" })
    ).toBe("dmarc");
  });

  it("lists groups in the order they are explained, without empty ones", () => {
    const grouped = groupDnsRecords(records);
    expect(grouped.map((g) => g.group.id)).toEqual(["dkim", "bounce", "dmarc"]);
    expect(grouped.map((g) => g.records.length)).toEqual([2, 2, 1]);
    expect(groupDnsRecords([])).toEqual([]);
  });
});

describe("dnsProgress", () => {
  it("counts what has been found and what is left", () => {
    const p = dnsProgress([
      { verified: true },
      { verified: true },
      { verified: false },
      { verificationLabel: "In progress" },
      {},
    ]);
    expect(p).toMatchObject({ total: 5, found: 2, left: 3, unchecked: false });
    expect(progressPercent(p)).toBe(40);
  });

  it("knows when nothing has been looked up yet", () => {
    expect(dnsProgress([{}, {}]).unchecked).toBe(true);
    // An empty "current" means DNS was read and nothing was there.
    expect(dnsProgress([{ current: [] }, {}]).unchecked).toBe(false);
    expect(dnsProgress([]).unchecked).toBe(false);
  });

  it("counts a record blocked by something already in DNS, not a note about one", () => {
    const blocked = { conflict: { informational: false, actions: [] } };
    const note = { conflict: { informational: true, actions: [] } };
    expect(needsFix(blocked)).toBe(true);
    expect(needsFix(note)).toBe(false);
    expect(dnsProgress([blocked, note, {}]).conflicts).toBe(1);
  });

  it("is zero percent with no records, not a division by zero", () => {
    expect(progressPercent(dnsProgress([]))).toBe(0);
  });
});

describe("zoneFile", () => {
  const file = zoneFile(DOMAIN, records);
  const lines = file.split("\n");

  it("writes one line per record under a comment naming the domain", () => {
    expect(lines[0]).toBe(
      "; Sending records for mail.acme.com, from OnchainSuite"
    );
    expect(lines).toHaveLength(records.length + 2);
    expect(file.endsWith("\n")).toBe(true);
  });

  // A name without the final dot is relative: imported into acme.com it would
  // become abc._domainkey.mail.acme.com.acme.com.
  it("ends every name and target in a dot, so it means the same in any zone", () => {
    expect(lines[1]).toBe(
      "abc._domainkey.mail.acme.com.\t3600\tIN\tCNAME\tabc.dkim.amazonses.com."
    );
    expect(lines[3]).toBe(
      "bounce.mail.acme.com.\t3600\tIN\tMX\t10 feedback-smtp.us-east-1.amazonses.com."
    );
  });

  // Exported as "bounce.", a relative host became a name at the root of DNS
  // and the imported file published nothing useful.
  it("qualifies a record that has only a relative host", () => {
    const out = zoneFile(DOMAIN, [
      { host: "bounce", type: "MX", value: "10 feedback-smtp.amazonses.com" },
      { host: "@", type: "TXT", value: "v=spf1 -all" },
    ]);
    expect(out.split("\n")[1]?.split("\t")[0]).toBe("bounce.mail.acme.com.");
    expect(out.split("\n")[2]?.split("\t")[0]).toBe("mail.acme.com.");
  });

  it("quotes TXT data", () => {
    expect(lines[4]).toBe(
      'bounce.mail.acme.com.\t3600\tIN\tTXT\t"v=spf1 include:amazonses.com ~all"'
    );
  });

  it("does not double the quotes of a value that came quoted", () => {
    const out = zoneFile(DOMAIN, [
      { host: "bounce", type: "TXT", value: '"v=spf1 -all"' },
    ]);
    expect(out.split("\n")[1]).toBe(
      'bounce.mail.acme.com.\t3600\tIN\tTXT\t"v=spf1 -all"'
    );
  });

  it("splits TXT data longer than one string may be", () => {
    const long = `k=rsa; p=${"A".repeat(400)}`;
    const out = zoneFile(DOMAIN, [{ host: "x", type: "TXT", value: long }]);
    const data = out.split("\n")[1]?.split("\t")[4] ?? "";
    const parts = data.split('" "');
    expect(parts).toHaveLength(2);
    expect(data.replace(/" "/g, "").replace(/^"|"$/g, "")).toBe(long);
  });

  it("gives an MX record a priority when the value has none", () => {
    const out = zoneFile(DOMAIN, [
      { host: "bounce", type: "mx", value: "feedback-smtp.amazonses.com" },
    ]);
    expect(out.split("\n")[1]).toBe(
      "bounce.mail.acme.com.\t3600\tIN\tMX\t10 feedback-smtp.amazonses.com."
    );
  });

  it("publishes the merged value when the backend recommends one", () => {
    const out = zoneFile(DOMAIN, [
      {
        host: "bounce",
        type: "TXT",
        value: "v=spf1 include:amazonses.com ~all",
        recommended:
          "v=spf1 include:_spf.google.com include:amazonses.com ~all",
      },
    ]);
    expect(out).toContain("include:_spf.google.com include:amazonses.com");
  });
});

describe("ago", () => {
  it("says how long since the last look", () => {
    expect(ago(0)).toBe("just now");
    expect(ago(9_000)).toBe("just now");
    expect(ago(40_000)).toBe("40s ago");
    expect(ago(3 * 60_000)).toBe("3 min ago");
    expect(ago(2 * 3_600_000)).toBe("2 h ago");
    expect(ago(-5)).toBe("just now");
  });
});

describe("cleanDomain", () => {
  it("makes what was typed into a bare host", () => {
    expect(cleanDomain(" https://www.Acme.com/pricing?x=1 ")).toBe("acme.com");
    expect(cleanDomain("mail.acme.com.")).toBe("mail.acme.com");
  });

  it("is checked as a domain before anything is generated", () => {
    expect(isDomain("mail.acme.com")).toBe(true);
    expect(isDomain("acme.co.uk")).toBe(true);
    for (const bad of [
      "",
      "acme",
      "acme.",
      "-acme.com",
      "ac me.com",
      "a@b.c",
    ]) {
      expect(isDomain(bad), bad).toBe(false);
    }
  });
});

describe("provisionedRecords", () => {
  it("shows one provider's set, the one customers publish", () => {
    const rows = provisionedRecords({
      providers: [
        {
          provider: "ACS",
          records: [
            { host: "@", type: "TXT", value: "ms-domain-verification=x" },
          ],
        },
        {
          provider: "ses",
          records: [
            {
              host: "abc._domainkey.mail.acme.com",
              type: "CNAME",
              value: "abc.dkim.amazonses.com",
            },
            {
              host: "",
              type: "TXT",
              value: "v=spf1 include:amazonses.com ~all",
            },
            { host: "broken", type: "", value: "x" },
          ],
        },
        {
          provider: "sendgrid",
          records: [
            { host: "em1", type: "CNAME", value: "u1.wl.sendgrid.net" },
          ],
        },
      ],
    });
    expect(rows.map((r) => [r.host, r.type])).toEqual([
      ["abc._domainkey.mail.acme.com", "CNAME"],
      ["@", "TXT"],
    ]);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);
    // Nothing has been looked up for them.
    expect(dnsProgress(rows).unchecked).toBe(true);
  });

  it("is empty before anything was provisioned", () => {
    expect(provisionedRecords(undefined)).toEqual([]);
    expect(provisionedRecords({ providers: [] })).toEqual([]);
  });
});
