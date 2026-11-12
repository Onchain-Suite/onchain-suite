/**
 * How a sending domain's DNS records are laid out for the person adding them.
 *
 * Records are a table, one row each, because that is how every DNS provider
 * lays them out and the job is copying across row by row. Everything here is
 * the arithmetic behind that table: which group a record belongs to, the host
 * as a provider wants it typed, how many have been found, and the same records
 * as a zone file most providers can import in one go.
 *
 * Pure, no React, no network.
 */
import type { DnsRecordRow } from "./domain-dns";

export type DnsGroupId = "dkim" | "bounce" | "dmarc" | "other";

export interface DnsGroup {
  id: DnsGroupId;
  title: string;
  /** What the group is for, in one line. */
  why: string;
}

export const DNS_GROUPS: readonly DnsGroup[] = [
  {
    id: "dkim",
    title: "Signing (DKIM)",
    why: "Proves the mail really came from you",
  },
  {
    id: "bounce",
    title: "Bounces (SPF)",
    why: "Where bounce and complaint reports go, and who may send for you",
  },
  {
    id: "dmarc",
    title: "Policy (DMARC)",
    why: "Tells inboxes what to do with mail that fails the checks",
  },
  { id: "other", title: "Other records", why: "" },
];

const clean = (value: string) => value.trim().toLowerCase().replace(/\.$/, "");

/**
 * The zone a domain's records are added to: its registrable domain. For
 * "mail.acme.com" that is "acme.com"; for "mail.acme.com.cn", "acme.com.cn".
 *
 * Where the registrable domain ends is a fact about the public suffix list,
 * not something the labels show: "com.cn" is a suffix and "acme.cn" is not.
 * A short list kept by hand got "com.cn" wrong, offered "bounce.mail.acme" as
 * the host, and a record added that way lands on the wrong name and never
 * verifies. So the answer comes from `registrable` (the list itself, see
 * `use-zone-of`), and without one there is no zone: the caller shows whole
 * names, which are right in any zone.
 */
export function zoneOf(
  domain: string,
  registrable: ((domain: string) => string | null) | null | undefined
): string | null {
  const full = clean(domain);
  if (!full || !registrable) return null;
  let zone: string | null;
  try {
    zone = registrable(full);
  } catch {
    return null;
  }
  if (!zone) return null;
  const z = clean(zone);
  // Only a zone the domain is actually in is any use to make a host relative.
  return z && (full === z || full.endsWith(`.${z}`)) ? z : null;
}

/** The host as most DNS providers want it typed: relative to the zone, "@" for the apex. */
export function relativeHost(name: string, zone: string): string {
  const full = clean(name);
  const z = clean(zone);
  if (!z) return full;
  if (full === z) return "@";
  return full.endsWith(`.${z}`) ? full.slice(0, -(z.length + 1)) : full;
}

/**
 * The record's full name: the one that is right whatever zone it is typed in.
 *
 * The backend sends it as `fqdn`. A record without one (the records shown
 * before a domain has a DNS report) carries a host relative to the SENDING
 * domain: "bounce" for mail.acme.com means bounce.mail.acme.com. Left bare, it
 * was exported in the zone file as "bounce.", a name at the root of DNS.
 */
export function recordName(
  record: Pick<DnsRecordRow, "fqdn" | "host">,
  domain: string
): string {
  if (record.fqdn) return clean(record.fqdn);
  const host = clean(record.host);
  const d = clean(domain);
  if (!d) return host;
  if (!host || host === "@") return d;
  return host === d || host.endsWith(`.${d}`) ? host : `${host}.${d}`;
}

/** The value to publish: the merged, always-safe one when the backend offers it. */
export const recordValue = (
  record: Pick<DnsRecordRow, "recommended" | "value">
) => record.recommended ?? record.value;

/** Which group a record belongs to, read from its name, type and value. */
export function dnsGroupOf(
  record: Pick<DnsRecordRow, "fqdn" | "host" | "type" | "value">
): DnsGroupId {
  // The group shows in the leading labels, so the bare host is enough.
  const name = clean(record.fqdn ?? record.host);
  const type = record.type.trim().toUpperCase();
  const value = record.value.trim().toLowerCase().replace(/^"/, "");
  if (name.includes("._domainkey") || name.startsWith("_domainkey")) {
    return "dkim";
  }
  if (name.startsWith("_dmarc") || value.startsWith("v=dmarc1")) return "dmarc";
  if (type === "MX" || value.startsWith("v=spf1")) return "bounce";
  return "other";
}

/** The records in display order, grouped, with empty groups left out. */
export function groupDnsRecords<
  T extends Pick<DnsRecordRow, "fqdn" | "host" | "type" | "value">,
>(records: readonly T[]): Array<{ group: DnsGroup; records: T[] }> {
  return DNS_GROUPS.map((group) => ({
    group,
    records: records.filter((r) => dnsGroupOf(r) === group.id),
  })).filter((g) => g.records.length > 0);
}

/** A record needs a fix when something already in DNS conflicts with it. */
export const needsFix = (record: Pick<DnsRecordRow, "conflict">) =>
  Boolean(record.conflict && !record.conflict.informational);

export interface DnsProgress {
  total: number;
  found: number;
  /** Records blocked by something already in the person's DNS. */
  conflicts: number;
  /** Still to find. */
  left: number;
  /** Nothing has been looked up yet for any record. */
  unchecked: boolean;
}

export function dnsProgress(
  records: ReadonlyArray<
    Pick<
      DnsRecordRow,
      "verified" | "verificationLabel" | "conflict" | "current"
    >
  >
): DnsProgress {
  const total = records.length;
  const found = records.filter((r) => r.verified === true).length;
  return {
    total,
    found,
    conflicts: records.filter(needsFix).length,
    left: total - found,
    unchecked:
      total > 0 &&
      records.every(
        (r) =>
          r.verified === undefined &&
          r.verificationLabel === undefined &&
          r.current === undefined
      ),
  };
}

/** Share of records found, 0 to 100, for the progress bar. */
export const progressPercent = (p: Pick<DnsProgress, "total" | "found">) =>
  p.total > 0 ? Math.round((p.found / p.total) * 100) : 0;

/** A TXT value as zone-file data: quoted, in strings of at most 255 characters. */
function txtData(value: string): string {
  const raw = value.trim().replace(/^"([\s\S]*)"$/, "$1");
  const chunks: string[] = [];
  for (let i = 0; i < raw.length || i === 0; i += 255) {
    chunks.push(raw.slice(i, i + 255));
  }
  return chunks
    .map((c) => `"${c.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(" ");
}

const dotted = (host: string) => (host.endsWith(".") ? host : `${host}.`);

/**
 * Every record as a BIND zone file. Cloudflare, Route 53 and most others can
 * import one, which turns six copy-and-pastes into one upload. Names are full
 * and end in a dot, so the file means the same thing in any zone.
 */
export function zoneFile(
  domain: string,
  records: ReadonlyArray<
    Pick<DnsRecordRow, "fqdn" | "host" | "type" | "value" | "recommended">
  >
): string {
  const lines = records.map((record) => {
    const type = record.type.trim().toUpperCase();
    const value = recordValue(record).trim();
    const data =
      type === "TXT"
        ? txtData(value)
        : type === "MX"
          ? value.replace(
              /^(\d+\s+)?(.+)$/,
              (_m, prio: string | undefined, host: string) =>
                (prio ?? "10 ") + dotted(host.trim())
            )
          : type === "CNAME"
            ? dotted(value)
            : value;
    return [dotted(recordName(record, domain)), "3600", "IN", type, data].join(
      "\t"
    );
  });
  return [
    `; Sending records for ${clean(domain)}, from OnchainSuite`,
    ...lines,
    "",
  ].join("\n");
}

/** "just now", "40s ago", "3 min ago": how long since the last look. */
export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${String(s)}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${String(m)} min ago`;
  return `${String(Math.round(m / 60))} h ago`;
}

/** A domain as typed, made into the bare host: no scheme, www, path or case. */
export function cleanDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

export const isDomain = (value: string) =>
  /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(value);

/** Providers whose records are not shown: customers publish one set, SES's. */
const HIDDEN_PROVIDERS = new Set(["sendgrid", "acs"]);

/**
 * The records to show before a domain has a DNS report: what provisioning
 * returned. They carry no live-DNS context, so nothing reads as checked.
 */
export function provisionedRecords(
  provision:
    | {
        providers: ReadonlyArray<{
          provider: string;
          records: ReadonlyArray<{ host: string; type: string; value: string }>;
        }>;
      }
    | undefined
): DnsRecordRow[] {
  return (provision?.providers ?? [])
    .filter((p) => !HIDDEN_PROVIDERS.has(p.provider.toLowerCase()))
    .flatMap((p) =>
      p.records
        .filter((r) => r.type && r.value)
        .map((r, index) => ({
          id: [p.provider, r.type, r.host, String(index)].join("-"),
          host: r.host || "@",
          type: r.type,
          value: r.value,
        }))
    );
}
