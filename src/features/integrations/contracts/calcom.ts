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
 * The capture body we forward to `POST /forms/:token/ingest`
 * ({@link SubmitCaptureDto} on the backend). `fields` is bounded server-side to
 * <=20 primitive keys and email-named keys are dropped, so we keep it flat,
 * primitive, and never put the email in `fields`.
 */
export interface FormCaptureIngest {
  email: string | null;
  fields: Record<string, string | number>;
  consent: boolean;
  consentText: string | null;
}
