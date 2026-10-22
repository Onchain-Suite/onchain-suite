/**
 * Backend contracts for connections and integrations (staging, 2026-10-22).
 * Types only. Mirrors `/organization/connections/*`, `/organization/integrations/*`
 * and `/events/catalog`. Every route except the events catalog is OWNER/ADMIN.
 */

export type ConnectionKind = "channel" | "source";

/**
 * One saved connection. A `PUT` always answers 200, even when the provider
 * rejected the credential: then `verified` is false, `config` is `{}` and
 * `lastError` says why. No secret is ever returned.
 */
export interface ConnectionSummary {
  connector: string;
  kind: ConnectionKind;
  /** The verifier's non-secret output (bot name, app name, ...) plus `label`. */
  config: Record<string, unknown>;
  /** First 16 hex chars of a sha256 of the credential, to tell two apart. */
  fingerprint: string;
  verified: boolean;
  verifiedAt: string | null;
  /** Provider's reason the credential failed, verbatim. */
  lastError: string | null;
  updatedAt: string;
}

/** `PUT /organization/connections/:connector` body: the connector's fields. */
export type ConnectionCredentials = Record<string, string>;

/** `POST /organization/integrations/{privy,clerk,dynamic}/sync`. Cursor-paged:
 *  re-send `nextCursor` while `hasMore`. */
export interface IdentitySyncResult {
  scanned: number;
  created: number;
  alreadySynced: number;
  skipped: number;
  pages: number;
  hasMore: boolean;
  nextCursor: string | null;
  /** Dynamic only: its API stops at offset 10,000. */
  truncatedAtCap?: boolean;
  warnings?: string[];
}

/** `POST /organization/integrations/{dune,google-sheets}/sync`. One call. */
export interface DataSyncResult {
  rows: number;
  created: number;
  alreadySynced: number;
  skipped: number;
}

/** Contacts the server deliberately did not import. Consent is applied
 *  server-side: only confirmed, subscribed contacts come across. */
export interface MigrationHeld {
  unsubscribed: number;
  unconfirmed: number;
  invalid: number;
  unreachable: number;
}

/**
 * `POST /organization/integrations/:tool/migrate`. Each call does a bounded
 * slice. Mailchimp and EmailOctopus have no cursor (re-run while `hasMore`),
 * beehiiv pages by `nextPage`, the rest by `nextCursor`.
 */
export interface MigrationResult {
  scanned: number;
  created: number;
  alreadyMigrated: number;
  held: MigrationHeld;
  skipped: number;
  pages: number;
  hasMore: boolean;
  nextCursor?: string | null;
  nextPage?: number | null;
  /** The list contacts land in, e.g. "Imported from HubSpot". */
  listName?: string;
  /** Mailchimp: audiences read. EmailOctopus: lists read. */
  audiences?: number;
  lists?: number;
  warnings: string[];
}

/** Iterable runs as a background job. `jobId` is stable per org
 *  ("iterable:<orgId>"), so starting twice is a no-op. */
export interface IterableJob {
  jobId: string;
  status: "queued";
  listName: string;
}

export type IterableJobState =
  "waiting" | "active" | "completed" | "failed" | "delayed" | "unknown";

export interface IterableJobStatus {
  jobId: string;
  state: IterableJobState;
  result?: {
    scanned: number;
    created: number;
    alreadyMigrated: number;
    held: MigrationHeld;
    skipped: number;
    listName: string;
  };
  failedReason?: string;
}

/** `GET /organization/connections/whatsapp/webhook-setup`. Pasted into Meta. */
export interface WhatsAppWebhookSetup {
  webhookUrl: string;
  verifyToken: string;
}

/** `POST /organization/integrations/discord/import-members`. */
export interface DiscordImportResult {
  guildId: string;
  scanned: number;
  created: number;
  alreadyImported: number;
  skipped: number;
  pages: number;
  hasMore: boolean;
  nextCursor: string | null;
}

/** `GET /events/catalog`: non-test product events seen in the last 30 days,
 *  by count, at most 200. */
export interface EventsCatalog {
  events: Array<{ event: string; count: number }>;
  windowDays: number;
}
