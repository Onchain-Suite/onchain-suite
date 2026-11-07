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

/** `POST /organization/connections/whatsapp/opt-in-link` - a wa.me link that
 *  opens WhatsApp with the opt-in token pre-filled for the contact to send. */
export interface WhatsAppOptInLink {
  url: string;
  expiresInSeconds: number;
}

/** `GET /organization/connections/sms/webhook-setup`. Pasted into Twilio.
 *  No verify token: the provider authenticates with a request signature. */
export interface SmsWebhookSetup {
  webhookUrl: string;
}

/** `POST /organization/connections/sms/opt-in-link` - an sms: deep link a wallet
 *  texts back to opt in. `body` is the pre-filled message carrying the token. */
export interface SmsOptInLink {
  url: string;
  smsNumber: string;
  body: string;
  expiresInSeconds: number;
}

/** `GET /organization/connections/sms/managed` - can we set SMS up for this
 *  workspace? `enabled` is false on a server without our Twilio account. */
export interface SmsManagedStatus {
  enabled: boolean;
  /** The current SMS connection is one we set up. */
  managed: boolean;
  /** Any SMS connection exists (theirs or ours). */
  connected: boolean;
}

export type SmsNumberType = "local" | "mobile" | "tollfree";

/** One number for sale, from `GET /organization/connections/sms/managed/numbers`. */
export interface AvailableSmsNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
  isoCountry: string;
  sms: boolean;
  mms: boolean;
}

/** `POST /organization/connections/sms/managed` - the number now connected.
 *  `reused` means the workspace already owned one, so nothing new was bought. */
export interface SmsManagedSetup {
  phoneNumber: string;
  reused: boolean;
  verified: boolean;
}

/** One chunk's answer from `POST /organization/consents/:channel/import`.
 *  `errors[].row` is the index within that chunk. */
export interface ConsentImportResult {
  received: number;
  imported: number;
  alreadyConsented: number;
  suppressed: number;
  duplicate: number;
  invalid: number;
  errors: Array<{ row: number; reason: string }>;
}

/** `GET /organization/connections/sms/a2p` - US 10DLC registration of a
 *  managed number. `available` is false for a customer's own Twilio account or
 *  a server without our Primary profile. `stage` is null before submitting. */
export interface SmsA2pStatus {
  available: boolean;
  stage: string | null;
  hint: string | null;
  brandType: string | null;
  lastError: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}

/** `POST /organization/connections/sms/a2p` body. */
export interface SmsA2pSubmission {
  email: string;
  brandType: "LOW_VOLUME_STANDARD" | "STANDARD";
  business: {
    name: string;
    type: string;
    industry: string;
    idType: string;
    idNumber: string;
    regions: string[];
    websiteUrl: string;
    companyType: string;
    stockExchange?: string;
    stockTicker?: string;
  };
  representative: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title: string;
    jobPosition: string;
  };
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  campaign: {
    description: string;
    messageFlow: string;
    samples: string[];
    hasEmbeddedLinks: boolean;
    hasEmbeddedPhone: boolean;
  };
}

/** `GET /organization/connections/whatsapp/embedded` - what opens Meta's
 *  Embedded Signup popup. `enabled` is false until the Meta app is set up. */
export interface WhatsAppEmbeddedSettings {
  enabled: boolean;
  appId: string | null;
  configId: string | null;
  graphVersion: string;
}

/** `POST /organization/connections/whatsapp/embedded` result. `warning` is set
 *  when the number connected but Meta would not register it for sending. */
export interface WhatsAppEmbeddedResult {
  verified: boolean;
  label: string | null;
  registered: boolean;
  warning: string | null;
}

/** `GET /organization/connections/sms/managed/usage` - texting usage on a
 *  number OnChain Suite set up, billed monthly. Counts only, no unit prices. */
export interface SmsManagedUsage {
  managed: boolean;
  currentPeriod: {
    period: string;
    /** Null when it can't be priced yet (e.g. a non-USD account without a rate). */
    estimatedUsd: number | null;
    items: Array<{ description: string; count: string }>;
  } | null;
  history: Array<{
    period: string;
    amountUsd: number;
    status: string;
    dueInvoiceId: string | null;
  }>;
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
