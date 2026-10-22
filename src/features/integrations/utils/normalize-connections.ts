import { isJsonObject } from "@/lib/utils";

import type {
  ConnectionSummary,
  DataSyncResult,
  DiscordImportResult,
  EventsCatalog,
  IdentitySyncResult,
  IterableJob,
  IterableJobState,
  IterableJobStatus,
  MigrationHeld,
  MigrationResult,
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

export function toWhatsAppSetup(raw: unknown): WhatsAppWebhookSetup {
  const o = obj(raw);
  return { webhookUrl: str(o.webhookUrl), verifyToken: str(o.verifyToken) };
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
