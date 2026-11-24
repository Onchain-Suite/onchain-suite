import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { parseDomainDns } from "../../utils/domain-dns";
import { ConflictBox } from "./dns-record-parts";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// The partner.surgence.io case: the full name was pasted into a provider that
// appends the zone, so the record sits at "<name>.surgence.io" twice over.
const payload = {
  records: [
    {
      type: "CNAME",
      host: "tok._domainkey",
      fqdn: "tok._domainkey.partner.surgence.io",
      value: "tok.dkim.amazonses.com",
      conflict: {
        reason:
          'This record was saved as "tok._domainkey.partner.surgence.io.surgence.io".',
        resolution:
          'In the DNS settings for surgence.io, change the record\'s name to just "tok._domainkey.partner".',
        actions: [
          {
            action: "edit",
            type: "CNAME",
            host: "tok._domainkey.partner.surgence.io.surgence.io",
            newHost: "tok._domainkey.partner",
          },
        ],
      },
    },
  ],
};

describe("ConflictBox rename action", () => {
  it("parses newHost and shows the wrong name, the name to type, and the instruction", () => {
    const { records } = parseDomainDns(payload);
    const conflict = records[0].conflict;
    expect(conflict?.actions[0].newHost).toBe("tok._domainkey.partner");

    render(<ConflictBox conflict={conflict!} />);
    expect(
      screen.getByText("tok._domainkey.partner.surgence.io.surgence.io")
    ).toBeTruthy();
    expect(screen.getByText("tok._domainkey.partner")).toBeTruthy();
    expect(screen.getByText(/change the record's name to just/)).toBeTruthy();
  });
});
