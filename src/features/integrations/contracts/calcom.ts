/**
 * Cal.com webhook contracts (inbound).
 *
 * Mirrors the Cal.com webhook envelope for booking events. Types only - no
 * runtime code. The webhook payload shape differs from the v2 REST bookings
 * shape (webhooks use `startTime`/`endTime` + `responses`; REST uses
 * `start`/`end` + `bookingFieldsResponses`), and custom-field responses arrive
 * either as a scalar or as `{ label, value }`. The mapper is deliberately
 * tolerant of both; these types document what we read, not an exhaustive
 * Cal schema.
 *
 * Docs: https://cal.com/docs/core-features/webhooks (payload per triggerEvent).
 */

/** The booking triggers we act on; others are acknowledged and ignored. */
export type CalcomBookingTrigger =
  | "BOOKING_CREATED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REQUESTED";

/** One attendee (the booker is attendees[0] in Cal's payload). */
export interface CalcomAttendee {
  name?: string;
  email?: string;
  timeZone?: string;
  language?: string | { locale?: string };
}

/**
 * A custom booking-field answer. Cal sends either the bare value or a
 * `{ label, value }` pair depending on the field type / API version.
 */
export type CalcomResponseValue =
  | string
  | number
  | boolean
  | null
  | { label?: string; value?: string | number | boolean | null };

/** The booking object carried inside the webhook envelope's `payload`. */
export interface CalcomBookingPayload {
  uid?: string;
  bookingId?: number;
  createdAt?: string;
  title?: string;
  eventTitle?: string;
  type?: string;
  /** Webhook uses startTime/endTime; REST uses start/end. We read either. */
  startTime?: string;
  endTime?: string;
  start?: string;
  end?: string;
  length?: number;
  duration?: number;
  location?: string;
  meetingUrl?: string;
  status?: string;
  attendees?: CalcomAttendee[];
  /** Webhook custom-field answers. */
  responses?: Record<string, CalcomResponseValue>;
  /** REST custom-field answers (fallback). */
  bookingFieldsResponses?: Record<string, CalcomResponseValue>;
  eventType?: { slug?: string; title?: string } | null;
}

/** The full webhook envelope Cal.com POSTs to the subscriber URL. */
export interface CalcomWebhookEnvelope {
  triggerEvent?: string;
  createdAt?: string;
  payload?: CalcomBookingPayload;
}

/**
 * The body we POST to the Custom Events ingest API
 * (`POST /api/v1/events`, docs.onchainsuite.com/integrations/custom-events).
 *
 * The event creates/updates the contact, merges `attributes` onto that contact
 * (so a list-joined automation can personalise with them), and `addToList`
 * both adds the membership AND fires the list's "List joined" trigger. No form
 * or form token is involved - the sk_live key is the only credential.
 *
 * - `attributes`: contact traits, <=50 keys, values string|number|boolean,
 *   <=1KB each. Persisted on the contact (last write wins).
 * - `payload`: event-specific facts, kept with the event (<=16KB), not the
 *   contact.
 * - `idempotencyKey`: stable per booking (the Cal `uid`) so a webhook retry is
 *   accepted-but-not-reprocessed and never double-fires the automation.
 */
export interface CalcomEventIngest {
  event: string;
  contact: {
    email?: string;
    walletAddress?: string;
    externalId?: string;
  };
  attributes: Record<string, string | number | boolean>;
  payload: Record<string, unknown>;
  /** List name or id; an unknown name is created as a tag-backed list. */
  addToList: string;
  idempotencyKey: string;
  /** ISO 8601; must be within [now-7d, now+5m]. Omit to default to now. */
  occurredAt?: string;
}
