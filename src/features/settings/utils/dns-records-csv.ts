/**
 * Pure helpers for exporting a sender domain's DNS records as a CSV the user
 * can hand to whoever manages their DNS. No React, no DOM - unit-tested in
 * isolation (CLAUDE.md 15.4); the component only wires the download.
 */

/** One publishable DNS record: the three columns a DNS admin needs. */
export interface DnsCsvRecord {
  type: string;
  /**
   * The FULL record name (e.g. "bounce.mg.example.com"), not the relative host.
   * A full name is unambiguous in any zone, so the record can't be created one
   * level too high — the apex-vs-subdomain mistake that silently fails sender
   * verification.
   */
  name: string;
  value: string;
}

const CSV_HEADER = ["Type", "Name", "Value"] as const;

/**
 * Quote a single CSV field per RFC 4180: wrap in double quotes when it
 * contains a comma, quote, CR or LF, doubling any embedded quote. Values are
 * passed through verbatim otherwise - DNS records are backend-controlled and
 * must stay byte-exact (notably leading-"-" tokens such as SPF "-all"), so
 * no spreadsheet formula-injection munging is applied here.
 */
export function csvCell(value: string): string {
  const raw = value ?? "";
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/** Build the full CSV text (header + one row per record), CRLF line endings. */
export function buildDnsCsv(records: DnsCsvRecord[]): string {
  const rows = [
    CSV_HEADER as readonly string[],
    ...records.map((r) => [r.type, r.name, r.value]),
  ];
  return rows.map((cols) => cols.map(csvCell).join(",")).join("\r\n");
}

const slugify = (value: string | undefined | null) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

/**
 * Filename for the download, led by the organisation so the recipient knows
 * whose records these are: `<org>-<domain>-dns-records.csv`. Falls back to
 * "organization" when the org name is missing, and drops the domain segment
 * when no domain is given.
 */
export function dnsCsvFilename(
  orgName: string | undefined | null,
  domain?: string | null
): string {
  const org = slugify(orgName) || "organization";
  const domainSlug = slugify(domain);
  return domainSlug
    ? `${org}-${domainSlug}-dns-records.csv`
    : `${org}-dns-records.csv`;
}
