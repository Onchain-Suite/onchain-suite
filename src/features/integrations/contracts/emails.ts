/*
 * Wire contracts for the transactional Email API log (`/emails`): the list,
 * one email with its recipients and events, and the reschedule/cancel answers.
 * Mirrors onchain-backend `src/modules/emails-api/API.md` (2026-11-24). Types
 * only.
 */

/** `live` keys send real mail; `test` keys run every check and send nothing. */
export type EmailEnvironment = "live" | "test";

/**
 * The email as a whole. `scheduled` until released (then `queued`) or
 * `canceled`. `sent` while any recipient is in flight; once all have settled,
 * `delivered`, `failed` or `partially_failed`. A late bounce can turn
 * `delivered` into `partially_failed`.
 */
export type EmailStatus =
  | "queued"
  | "scheduled"
  | "sending"
  | "sent"
  | "delivered"
  | "partially_failed"
  | "failed"
  | "canceled";

/** One recipient. Only moves forward: delivered after complained stays complained. */
export type RecipientStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed"
  | "canceled";

export type RecipientKind = "to" | "cc" | "bcc";

/** `wallet` recipients carry the wallet in `address`, never the email it resolved to. */
export type RecipientType = "email" | "wallet";

export type EmailEventType =
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed";

/** `hard` is permanent (the address is suppressed), `soft` the provider gave up retrying. */
export type BounceType = "hard" | "soft" | "undetermined";

export interface EmailTag {
  name: string;
  value: string;
}

/** A row of `GET /emails`. The body is never returned. */
export interface EmailSummary {
  id: string;
  environment: EmailEnvironment;
  from: string;
  subject: string;
  created_at: string;
  /** Kept as the backend sent it: an unknown future status still renders. */
  status: EmailStatus | (string & {});
  /** The release time for a scheduled email (kept after release), else null. */
  scheduled_at: string | null;
  recipient_count: number;
  tags: EmailTag[];
}

/** `GET /emails` → `data`. Cursor pagination: pass `next_cursor` back as `cursor`. */
export interface EmailListPage {
  data: EmailSummary[];
  has_more: boolean;
  next_cursor: string | null;
}

/** Query of `GET /emails`. Every field is optional; dates are ISO 8601. */
export interface EmailListFilters {
  status?: EmailStatus;
  environment?: EmailEnvironment;
  created_after?: string;
  created_before?: string;
  /** `name:value`. */
  tag?: string;
  /** An EVM or Solana wallet the email was addressed to. */
  wallet?: string;
}

export interface EmailRecipient {
  id: string;
  kind: RecipientKind;
  /** What was addressed: for `type: "wallet"`, the wallet. */
  address: string;
  type: RecipientType;
  status: RecipientStatus | (string & {});
  last_event_at: string | null;
}

export interface EmailEvent {
  type: EmailEventType | (string & {});
  recipient_id: string;
  /** When the provider says it happened. */
  created_at: string;
  /** `bounced` only. */
  bounce?: { type: BounceType | (string & {}); subtype: string | null };
}

/** `GET /emails/:id`. `events` are oldest first, one per recipient per type. */
export interface EmailDetail extends Omit<EmailSummary, "recipient_count"> {
  recipients: EmailRecipient[];
  events: EmailEvent[];
}

/** `PATCH /emails/:id` → `data`. */
export interface RescheduleResult {
  id: string;
  status: "scheduled";
  scheduled_at: string;
}

/** `POST /emails/:id/cancel` → `data`. */
export interface CancelResult {
  id: string;
  status: "canceled";
}

/** `403 SENDING_SUSPENDED` → `details.reason`. Lifted by support. */
export type SuspensionReason =
  "complaint_rate" | "hard_bounce_rate" | "manual" | (string & {});
