import { isJsonObject } from "@/lib/utils";

import type {
  AvailableSmsNumber,
  ConnectionSummary,
  ConsentImportResult,
  DataSyncResult,
  DiscordImportResult,
  EventsCatalog,
  IdentitySyncResult,
  IterableJob,
  IterableJobState,
  IterableJobStatus,
  MigrationHeld,
  MigrationResult,
  SmsA2pStatus,
  SmsManagedSetup,
  SmsManagedStatus,
  SmsOptInLink,
  SmsWebhookSetup,
  WhatsAppEmbeddedResult,
  WhatsAppEmbeddedSettings,
  WhatsAppOptInLink,
  WhatsAppWebhookSetup,
} from "../contracts/connections";

/*
 * Coercion for connection and integration responses (already unwrapped from
 * the envelope), so a missing field becomes an honest zero or null rather than
 * a crash. Pure.
 */

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (isJsonObject(v) ? v : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const nullableStr = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const n = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;
const strings = (v: unknown): string[] =>
  arr(v).filter((s): s is string => typeof s === "string");

export function toConnection(raw: unknown): ConnectionSummary | null {
  if (!isJsonObject(raw)) return null;
  const connector = str(raw.connector);
  if (!connector) return null;
  const verifiedAt = nullableStr(raw.verifiedAt);
  return {
    connector,
    kind: raw.kind === "channel" ? "channel" : "source",
    config: obj(raw.config),
    fingerprint: str(raw.fingerprint),
    verified: raw.verified === true || verifiedAt !== null,
    verifiedAt,
    lastError: nullableStr(raw.lastError),
    updatedAt: str(raw.updatedAt),
  };
}

/** The list route returns an array; older builds wrapped it in `connections`. */
export function toConnectionList(raw: unknown): ConnectionSummary[] {
  const list = Array.isArray(raw) ? raw : arr(obj(raw).connections);
  return list
    .map(toConnection)
    .filter((c): c is ConnectionSummary => c !== null);
}

const toHeld = (v: unknown): MigrationHeld => {
  const h = obj(v);
  return {
    unsubscribed: n(h.unsubscribed),
    unconfirmed: n(h.unconfirmed),
    invalid: n(h.invalid),
    unreachable: n(h.unreachable),
  };
};

export function toMigrationResult(raw: unknown): MigrationResult {
  const o = obj(raw);
  return {
    scanned: n(o.scanned),
    created: n(o.created),
    alreadyMigrated: n(o.alreadyMigrated),
    held: toHeld(o.held),
    skipped: n(o.skipped),
    pages: n(o.pages),
    hasMore: o.hasMore === true,
    nextCursor: nullableStr(o.nextCursor),
    nextPage: typeof o.nextPage === "number" ? o.nextPage : null,
    ...(typeof o.listName === "string" ? { listName: o.listName } : {}),
    ...(typeof o.audiences === "number" ? { audiences: o.audiences } : {}),
    ...(typeof o.lists === "number" ? { lists: o.lists } : {}),
    warnings: strings(o.warnings),
  };
}

export function toIdentitySync(raw: unknown): IdentitySyncResult {
  const o = obj(raw);
  return {
    scanned: n(o.scanned),
    created: n(o.created),
    alreadySynced: n(o.alreadySynced),
    skipped: n(o.skipped),
    pages: n(o.pages),
    hasMore: o.hasMore === true,
    nextCursor: nullableStr(o.nextCursor),
    ...(o.truncatedAtCap === true ? { truncatedAtCap: true } : {}),
    warnings: strings(o.warnings),
  };
}

export function toDataSync(raw: unknown): DataSyncResult {
  const o = obj(raw);
  return {
    rows: n(o.rows),
    created: n(o.created),
    alreadySynced: n(o.alreadySynced),
    skipped: n(o.skipped),
  };
}

export function toIterableJob(raw: unknown): IterableJob {
  const o = obj(raw);
  return {
    jobId: str(o.jobId),
    status: "queued",
    listName: str(o.listName) || "Imported from Iterable",
  };
}

const JOB_STATES: IterableJobState[] = [
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
  "unknown",
];

export function toIterableStatus(raw: unknown): IterableJobStatus {
  const o = obj(raw);
  const state = JOB_STATES.includes(o.state as IterableJobState)
    ? (o.state as IterableJobState)
    : "unknown";
  const r = isJsonObject(o.result) ? o.result : null;
  return {
    jobId: str(o.jobId),
    state,
    ...(r
      ? {
          result: {
            scanned: n(r.scanned),
            created: n(r.created),
            alreadyMigrated: n(r.alreadyMigrated),
            held: toHeld(r.held),
            skipped: n(r.skipped),
            listName: str(r.listName),
          },
        }
      : {}),
    ...(typeof o.failedReason === "string"
      ? { failedReason: o.failedReason }
      : {}),
  };
}

export function toWhatsAppOptInLink(raw: unknown): WhatsAppOptInLink {
  const o = obj(raw);
  return { url: str(o.url), expiresInSeconds: n(o.expiresInSeconds) };
}

export function toWhatsAppSetup(raw: unknown): WhatsAppWebhookSetup {
  const o = obj(raw);
  return { webhookUrl: str(o.webhookUrl), verifyToken: str(o.verifyToken) };
}

export function toSmsSetup(raw: unknown): SmsWebhookSetup {
  return { webhookUrl: str(obj(raw).webhookUrl) };
}

export function toSmsOptInLink(raw: unknown): SmsOptInLink {
  const o = obj(raw);
  return {
    url: str(o.url),
    smsNumber: str(o.smsNumber),
    body: str(o.body),
    expiresInSeconds: n(o.expiresInSeconds),
  };
}

export function toSmsManagedStatus(raw: unknown): SmsManagedStatus {
  const o = obj(raw);
  return {
    enabled: o.enabled === true,
    managed: o.managed === true,
    connected: o.connected === true,
  };
}

export function toAvailableSmsNumbers(raw: unknown): AvailableSmsNumber[] {
  const list = obj(raw).numbers;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const o = obj(item);
      return {
        phoneNumber: str(o.phoneNumber),
        friendlyName: str(o.friendlyName) || str(o.phoneNumber),
        locality: str(o.locality) || null,
        region: str(o.region) || null,
        isoCountry: str(o.isoCountry),
        sms: o.sms === true,
        mms: o.mms === true,
      };
    })
    .filter((n) => n.phoneNumber !== "");
}

export function toConsentImport(raw: unknown): ConsentImportResult {
  const o = obj(raw);
  return {
    received: n(o.received),
    imported: n(o.imported),
    alreadyConsented: n(o.alreadyConsented),
    suppressed: n(o.suppressed),
    duplicate: n(o.duplicate),
    invalid: n(o.invalid),
    errors: arr(o.errors).map((e) => {
      const x = obj(e);
      return { row: n(x.row), reason: str(x.reason) };
    }),
  };
}

export function toSmsA2pStatus(raw: unknown): SmsA2pStatus {
  const o = obj(raw);
  const opt = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    available: o.available === true,
    stage: opt(o.stage),
    hint: opt(o.hint),
    brandType: opt(o.brandType),
    lastError: opt(o.lastError),
    updatedAt: opt(o.updatedAt),
    completedAt: opt(o.completedAt),
  };
}

export function toWhatsAppEmbeddedSettings(
  raw: unknown
): WhatsAppEmbeddedSettings {
  const o = obj(raw);
  const appId = str(o.appId);
  const configId = str(o.configId);
  return {
    enabled: o.enabled === true && Boolean(appId && configId),
    appId: appId || null,
    configId: configId || null,
    graphVersion: str(o.graphVersion) || "v23.0",
  };
}

export function toWhatsAppEmbeddedResult(raw: unknown): WhatsAppEmbeddedResult {
  const o = obj(raw);
  return {
    verified: o.verified === true,
    label: str(o.label) || null,
    registered: o.registered === true,
    warning: str(o.warning) || null,
  };
}

export function toSmsManagedSetup(raw: unknown): SmsManagedSetup {
  const o = obj(raw);
  return {
    phoneNumber: str(o.phoneNumber),
    reused: o.reused === true,
    verified: o.verified === true,
  };
}

export function toDiscordImport(raw: unknown): DiscordImportResult {
  const o = obj(raw);
  return {
    guildId: str(o.guildId),
    scanned: n(o.scanned),
    created: n(o.created),
    alreadyImported: n(o.alreadyImported),
    skipped: n(o.skipped),
    pages: n(o.pages),
    hasMore: o.hasMore === true,
    nextCursor: nullableStr(o.nextCursor),
  };
}

export function toEventsCatalog(raw: unknown): EventsCatalog {
  const o = obj(raw);
  return {
    events: arr(o.events)
      .map((e) => ({ event: str(obj(e).event), count: n(obj(e).count) }))
      .filter((e) => e.event),
    windowDays: n(o.windowDays) || 30,
  };
}
