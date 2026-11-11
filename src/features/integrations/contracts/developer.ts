/*
 * Wire contracts for the Developer API family (`/developer/*`): server-side
 * secret keys and outbound webhook endpoints. Mirrors docs/backend.md
 * 5124-5270 and notes/product/developer-credentials-reference.md. Types only.
 */

export type KeyEnvironment = "live" | "test";
export type KeyScope = "read_write" | "read_only";
export type KeyStatus = "active" | "expiring" | "revoked";

/** A secret key as returned by list/create/roll (masked apart from `prefix`). */
export interface DeveloperKey {
  id: string;
  name: string;
  /** Masked leading segment shown after creation, e.g. `sk_live_a1b2…`. */
  prefix: string;
  environment: KeyEnvironment;
  scope: KeyScope;
  status: KeyStatus;
  /** Stamped on every successful call - null means the key was never used. */
  lastUsedAt: string | null;
  /**
   * Expiry INSTANT, not a boolean. A rolled key carries a future value and is
   * still accepting traffic until then. Never gate row state on this - use
   * `status`. Kept so the UI can surface the deadline.
   */
  revokedAt: string | null;
  createdAt: string | null;
}

export interface CreateKeyInput {
  environment: KeyEnvironment;
  name?: string;
  scope?: KeyScope;
}

/** Create/roll response: the row plus the full `token`, returned once. */
export interface DeveloperKeyWithToken extends DeveloperKey {
  token: string;
  /** Roll only: the key being retired and when it stops working. */
  replaced?: { id: string; expiresAt: string | null };
}

export interface RollKeyInput {
  /** 0 kills the outgoing key now (leak); 24-168 keeps it working (rotation). */
  expireInHours: number;
}

export type WebhookStatus = "active" | "paused" | "failing";

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  /** Masked signing secret, e.g. `whsec_••••1234`. */
  secretHint: string | null;
  lastDeliveryAt: string | null;
  /**
   * The HTTP status the endpoint last answered with. A NUMBER on the wire, and
   * null both before the first delivery and when the last attempt never got an
   * answer (a timeout or a refused connection).
   */
  lastDeliveryStatus: number | null;
  failureCount: number;
  createdAt: string | null;
}

export interface CreateWebhookInput {
  url: string;
  events: string[];
}

/** Create response: the row plus the full `whsec_…` secret, returned once. */
export interface WebhookEndpointWithSecret extends WebhookEndpoint {
  secret: string;
}

export interface UpdateWebhookInput {
  status?: WebhookStatus;
  events?: string[];
}

/** `POST /developer/webhooks/{id}/test`: how the endpoint answered the ping. */
export interface WebhookTestResult {
  ok: boolean;
  status: number;
}
