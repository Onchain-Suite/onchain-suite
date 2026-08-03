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

function collectEntries(
  payload: unknown,
  purpose?: DomainPurpose
): Record<string, unknown>[] {
  const root = unwrap(payload);
  const rootObj = isJsonObject(root) ? root : null;
  const purposeNode =
    rootObj && purpose && isJsonObject(rootObj[purpose])
      ? rootObj[purpose]
      : null;

  const nested =
    purposeNode ??
    (rootObj
      ? (rootObj.records ?? rootObj.verificationRecords ?? rootObj.dns)
      : null) ??
    root;

  if (Array.isArray(nested)) return nested.filter(isJsonObject);

  if (isJsonObject(nested)) {
    const arr =
      Array.isArray(nested.records) ||
      Array.isArray(nested.verificationRecords) ||
      Array.isArray(nested.dns)
        ? (nested.records ?? nested.verificationRecords ?? nested.dns)
        : null;
    if (Array.isArray(arr)) return arr.filter(isJsonObject);

    return Object.entries(nested)
      .filter(([key]) => (!purpose ? true : key === purpose))
      .flatMap(([key, value]) => {
        if (Array.isArray(value)) {
          return value
            .filter(isJsonObject)
            .map((rec) => ({ purpose: key, ...rec }));
        }
        if (!isJsonObject(value)) return [];
        const inner =
          value.records ?? value.verificationRecords ?? value.dns ?? value;
        if (Array.isArray(inner)) {
          return inner
            .filter(isJsonObject)
            .map((rec) => ({ purpose: key, ...rec }));
        }
        return [{ purpose: key, ...value }];
      });
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

  const purposeRaw = isJsonObject(root)
    ? str(root.purpose)?.toLowerCase()
    : undefined;
  const providerRaw = isJsonObject(root)
    ? str(root.provider)?.toLowerCase()
    : undefined;
  const purpose: DomainPurpose | undefined =
    purposeRaw === "transactional" || purposeRaw === "marketing"
      ? purposeRaw
      : providerRaw === "ses"
        ? "marketing"
        : providerRaw === "acs"
          ? "transactional"
          : undefined;
  const purposeNode = isJsonObject(root) && purpose ? root[purpose] : undefined;

  const records = collectEntries(payload, purpose)
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

  const sendReady =
    isJsonObject(root) && "sendReady" in root
      ? boolish(root.sendReady)
      : isJsonObject(purposeNode)
        ? boolish(purposeNode.sendReady)
        : undefined;

  const verificationStates =
    isJsonObject(root) && isJsonObject(root.verificationStates)
      ? Object.entries(root.verificationStates)
          .filter(
            (p): p is [string, string] =>
              typeof p[1] === "string" && p[1].toLowerCase() !== "unknown"
          )
          .map(([check, state]) => ({ check, state }))
      : isJsonObject(purposeNode) &&
          isJsonObject(purposeNode.verificationStates)
        ? Object.entries(purposeNode.verificationStates)
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
      : isJsonObject(purposeNode) && Array.isArray(purposeNode.fixes)
        ? purposeNode.fixes.filter(
            (f): f is string => typeof f === "string" && f.length > 0
          )
        : [];

  return { records, sendReady, verificationStates, fixes, purpose };
}
