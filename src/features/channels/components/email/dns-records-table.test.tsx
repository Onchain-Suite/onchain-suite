import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DnsRecordRow } from "../../utils/domain-dns";
import { DnsRecordsTable } from "./dns-records-table";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const records: DnsRecordRow[] = [
  {
    id: "1",
    host: "abc._domainkey",
    fqdn: "abc._domainkey.mail.acme.com",
    type: "CNAME",
    value: "abc.dkim.amazonses.com",
    verified: true,
  },
  {
    id: "2",
    host: "bounce",
    fqdn: "bounce.mail.acme.com",
    type: "TXT",
    value: "v=spf1 include:amazonses.com ~all",
    recommended: "v=spf1 include:_spf.google.com include:amazonses.com ~all",
    current: ["v=spf1 include:_spf.google.com ~all"],
    conflict: {
      reason: "This host already has an SPF record.",
      informational: false,
      actions: [],
      resolution: "Merge the two.",
    },
  },
  {
    id: "3",
    host: "_dmarc",
    fqdn: "_dmarc.mail.acme.com",
    type: "TXT",
    value: "v=DMARC1; p=none;",
    verificationLabel: "Not started",
  },
];

function renderTable(
  over: { full?: boolean; checked?: boolean; zone?: string | null } = {}
) {
  const onFullChange = vi.fn();
  render(
    <DnsRecordsTable
      domain="mail.acme.com"
      records={records}
      zone={over.zone === undefined ? "acme.com" : over.zone}
      full={over.full ?? false}
      onFullChange={onFullChange}
      checked={over.checked ?? true}
    />
  );
  return { onFullChange };
}

describe("DnsRecordsTable", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("groups the records under what each group is for", () => {
    renderTable();
    expect(screen.getByText("Signing (DKIM)")).toBeTruthy();
    expect(screen.getByText("Bounces (SPF)")).toBeTruthy();
    expect(screen.getByText("Policy (DMARC)")).toBeTruthy();
  });

  // Typed as the full name into a provider that adds the zone itself, a record
  // lands one level too deep and never verifies.
  it("shows the host relative to the zone, and the whole name on request", () => {
    renderTable();
    expect(screen.getByText("abc._domainkey.mail")).toBeTruthy();
    expect(screen.queryByText("abc._domainkey.mail.acme.com")).toBeNull();
  });

  it("shows whole names for providers that want them", () => {
    const { onFullChange } = renderTable({ full: true });
    expect(screen.getByText("abc._domainkey.mail.acme.com")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Short host" }));
    expect(onFullChange).toHaveBeenCalledWith(false);
  });

  // The zone comes from the public suffix list. Until it is known, a short
  // host would be a guess, and a wrong one puts the record on the wrong name.
  it("shows whole names, and offers no short host, while the zone is unknown", () => {
    renderTable({ zone: null });
    expect(screen.getByText("abc._domainkey.mail.acme.com")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Short host" })).toBeNull();
    expect(screen.getByText(/shown as whole names/)).toBeTruthy();
  });

  it("says where each record stands, in the words of someone adding it", () => {
    renderTable();
    expect(screen.getByText("Found")).toBeTruthy();
    expect(screen.getByText("Needs a fix")).toBeTruthy();
    expect(screen.getByText("Not found")).toBeTruthy();
  });

  it("says Not checked before DNS has been looked up at all", () => {
    renderTable({ checked: false });
    // The one the provider already confirmed still reads as found.
    expect(screen.getByText("Found")).toBeTruthy();
    expect(screen.getAllByText("Not checked").length).toBeGreaterThan(0);
  });

  it("puts the fix under the record it blocks", () => {
    renderTable();
    expect(screen.getByText("Conflicting record - update it")).toBeTruthy();
    expect(
      screen.getByText("This host already has an SPF record.")
    ).toBeTruthy();
  });

  // The value to publish is the merged one, never the one that would add a
  // second SPF record to the host.
  it("copies the merged value when the backend recommends one", async () => {
    renderTable();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy value for TXT bounce.mail.acme.com",
      })
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "v=spf1 include:_spf.google.com include:amazonses.com ~all"
      )
    );
    expect(
      await screen.findByRole("button", {
        name: "Copied value for TXT bounce.mail.acme.com",
      })
    ).toBeTruthy();
  });

  it("copies the host as it is shown", async () => {
    renderTable();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy host for CNAME abc._domainkey.mail.acme.com",
      })
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("abc._domainkey.mail")
    );
  });
});
