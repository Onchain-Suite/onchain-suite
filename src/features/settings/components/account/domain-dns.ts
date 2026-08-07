import { isJsonObject } from "@/lib/utils";

/** A single registrar record the user must publish, with live-DNS context. */
export interface DnsRecordRow {
  id: string;
  host: string;
  type: string;
  value: string;
  /** true = passed, false = failed, undefined = not yet checked. */
  verified?: boolean;
  /** Live provider state that is neither pass nor fail (e.g. "In progress"). */
  verificationLabel?: string;
  /** What is live in the user's DNS right now ([] = nothing published). */
  current?: string[];
  /** The always-safe-to-paste value (e.g. a merged SPF record). */
  recommended?: string;
  conflict?: DnsConflict;
}

export interface DnsConflictAction {
  action: string;
  type?: string;
  host?: string;
  currentValue?: string;
  newValue?: string;
}

export interface DnsConflict {
  reason?: string;
  resolution?: string;
  informational: boolean;
  actions: DnsConflictAction[];
}

export type DomainPurpose = "transactional" | "marketing";

export interface DomainDnsData {
  records: DnsRecordRow[];
  sendReady?: boolean;
  verificationStates: { check: string; state: string }[];
  fixes: string[];
  /** Saved purpose — transactional → ACS, marketing → SES. */
  purpose?: DomainPurpose;
}

const unwrap = (payload: unknown): unknown =>
  isJsonObject(payload) && "data" in payload
    ? (payload.data ?? payload)
    : payload;

const str = (...values: unknown[]) => {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
};

const boolish = (...values: unknown[]) => {
  for (const v of values) {
    if (typeof v === "boolean") return v;
    if (typeof v === "number")
      return v === 1 ? true : v === 0 ? false : undefined;
    if (typeof v === "string") {
      const n = v.trim().toLowerCase();
      if (
        ["true", "1", "yes", "pass", "passed", "verified", "valid"].includes(n)
      )
        return true;
      if (["false", "0", "no", "fail", "failed", "invalid"].includes(n))
        return false;
    }
  }
  return undefined;
};

/** Records may be an array, nested under records/dns, or an object keyed by purpose. */
function collectEntries(payload: unknown): Record<string, unknown>[] {
  const root = unwrap(payload);
  const nested = isJsonObject(root)
    ? (root.records ?? root.verificationRecords ?? root.dns ?? root)
    : root;
  if (Array.isArray(nested)) return nested.filter(isJsonObject);
  if (isJsonObject(nested)) {
    return Object.entries(nested)
      .filter((pair): pair is [string, Record<string, unknown>] =>
        isJsonObject(pair[1])
      )
      .map(([purpose, record]) => ({ purpose, ...record }));
  }
  return [];
}

function parseConflict(raw: unknown): DnsConflict | undefined {
  if (!isJsonObject(raw)) return undefined;
  const actions = Array.isArray(raw.actions)
    ? raw.actions
        .filter(isJsonObject)
        .map((a): DnsConflictAction | null => {
          const action = str(a.action);
          if (!action) return null;
          return {
            action,
            type: str(a.type),
            host: str(a.host),
            currentValue: str(a.currentValue),
            newValue: str(a.newValue),
          };
        })
        .filter((a): a is DnsConflictAction => a !== null)
    : [];
  return {
    reason: str(raw.reason),
    resolution: str(raw.resolution),
    informational: boolish(raw.informational) === true,
    actions,
  };
}

export function parseDomainDns(payload: unknown): DomainDnsData {
  const root = unwrap(payload);

  const records = collectEntries(payload)
    .map((entry, index): DnsRecordRow | null => {
      const host =
        str(entry.host, entry.hostname, entry.name, entry.recordName) ?? "@";
      const type = str(entry.type, entry.recordType);
      const value = str(
        entry.value,
        entry.content,
        entry.target,
        entry.recordValue
      );
      if (!type || !value) return null;

      const state = str(entry.verification)?.toLowerCase();
      const verified =
        state === "verified"
          ? true
          : state === "verificationfailed"
            ? false
            : boolish(
                entry.verified,
                entry.isVerified,
                entry.valid,
                entry.status
              );
      const verificationLabel =
        verified === undefined
          ? state === "verificationinprogress"
            ? "In progress"
            : state === "notstarted"
              ? "Not started"
              : undefined
          : undefined;

      return {
        id: str(entry.id) ?? `${host}-${type}-${index}`,
        host,
        type,
        value,
        verified,
        verificationLabel,
        current: Array.isArray(entry.current)
          ? entry.current.filter((v): v is string => typeof v === "string")
          : undefined,
        recommended: str(entry.recommended),
        conflict: parseConflict(entry.conflict),
      };
    })
    .filter((r): r is DnsRecordRow => r !== null);

  const sendReady = isJsonObject(root) ? boolish(root.sendReady) : undefined;

  const verificationStates =
    isJsonObject(root) && isJsonObject(root.verificationStates)
      ? Object.entries(root.verificationStates)
          .filter(
            (p): p is [string, string] =>
              typeof p[1] === "string" && p[1].toLowerCase() !== "unknown"
          )
          .map(([check, state]) => ({ check, state }))
      : [];

  const fixes =
    isJsonObject(root) && Array.isArray(root.fixes)
      ? root.fixes.filter(
          (f): f is string => typeof f === "string" && f.length > 0
        )
      : [];

  // Saved purpose (or derive it from the routed provider: ses→marketing,
  // acs→transactional) so the UI can pre-select the toggle.
  const purposeRaw = isJsonObject(root)
    ? str(root.purpose)?.toLowerCase()
    : undefined;
  const providerRaw = isJsonObject(root)
    ? str(root.provider)?.toLowerCase()
    : undefined;
  // Default to SES (marketing) when the backend hasn't pinned a purpose, so SES
  // is the default DNS provider shown.
  const purpose: DomainPurpose =
    purposeRaw === "transactional" || purposeRaw === "marketing"
      ? purposeRaw
      : providerRaw === "acs"
        ? "transactional"
        : "marketing";

  return { records, sendReady, verificationStates, fixes, purpose };
}
