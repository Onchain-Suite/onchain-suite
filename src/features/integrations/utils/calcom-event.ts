/**
 * Pure mapper: a Cal.com booking webhook payload -> the Custom Events ingest
 * body (`POST /api/v1/events`).
 *
 * No React, no network. Kept pure so it is unit-tested without mounting the
 * route (see calcom-event.test.ts). Tolerant of both the webhook payload shape
 * (startTime/endTime, responses) and the REST shape (start/end,
 * bookingFieldsResponses), and of custom-field answers that arrive as either a
 * scalar or a `{ label, value }` pair.
 *
 * Booking details are split per the Custom Events contract: contact traits
 * (name, company, timezone, the upcoming demo's time/link) go in `attributes`
 * so a list-joined automation can personalise with them; immutable event facts
 * go in `payload`.
 */
import type {
  CalcomBookingPayload,
  CalcomEventIngest,
  CalcomResponseValue,
} from "../contracts/calcom";

/** The list a booking joins, and the event name, unless overridden by env. */
export const DEFAULT_TARGET_LIST = "Booked a Demo/Walkthrough";
export const DEFAULT_EVENT_NAME = "cal_demo_booked";

/** Flatten a Cal response value (scalar or `{ label, value }`) to a string. */
const responseText = (v: CalcomResponseValue | undefined): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    const { value: inner } = v as { value?: unknown };
    return inner === null || inner === undefined ? "" : String(inner).trim();
  }
  return String(v).trim();
};

/** First non-empty trimmed string from the candidates. */
const firstText = (...candidates: Array<unknown>): string => {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return "";
};

/** Language can be a string or `{ locale }`. */
const languageText = (lang: unknown): string => {
  if (typeof lang === "string") return lang.trim();
  if (lang && typeof lang === "object") {
    const { locale } = lang as { locale?: unknown };
    if (typeof locale === "string") return locale.trim();
  }
  return "";
};

/**
 * Case/separator-insensitive lookup over a responses object, so "Company-Website",
 * "company_website" and "companyWebsite" all resolve. Returns "" when absent.
 */
const pickResponse = (
  responses: Record<string, CalcomResponseValue> | undefined,
  ...keys: string[]
): string => {
  if (!responses) return "";
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");
  const wanted = new Set(keys.map(norm));
  for (const [k, v] of Object.entries(responses)) {
    if (wanted.has(norm(k))) {
      const text = responseText(v);
      if (text.length > 0) return text;
    }
  }
  return "";
};

/** Add a string attribute only when non-empty (keeps us under the 50-key cap). */
const putIf = (
  target: Record<string, string | number | boolean>,
  key: string,
  value: string
) => {
  if (value.length > 0) target[key] = value;
};

/** "" -> null (our extractors return "" for absent; events payload wants null). */
const orNull = (value: string): string | null =>
  value.length > 0 ? value : null;

/**
 * Map a Cal.com booking to the Custom Events ingest body. `email` comes from the
 * first attendee (falling back to the `email` response); when none is present
 * the caller skips the booking (the events API needs an identifier).
 */
export function mapCalcomBookingToEvent(
  payload: CalcomBookingPayload | undefined,
  opts?: {
    trigger?: string;
    occurredAt?: string;
    listName?: string;
    eventName?: string;
  }
): CalcomEventIngest {
  const booking = payload ?? {};
  const attendee = booking.attendees?.[0] ?? {};
  const responses = booking.responses ?? booking.bookingFieldsResponses;

  const email = firstText(attendee.email, pickResponse(responses, "email"));

  const eventType = firstText(
    booking.eventType?.slug,
    booking.eventType?.title,
    booking.type
  );
  const title = firstText(booking.title, booking.eventTitle);
  const startsAt = firstText(booking.startTime, booking.start);
  const endsAt = firstText(booking.endTime, booking.end);
  const meetingUrl = firstText(booking.meetingUrl);
  const location = firstText(booking.location);
  const uid = firstText(booking.uid);
  const status = firstText(booking.status);
  const name = firstText(attendee.name, pickResponse(responses, "name"));
  const companyWebsite = pickResponse(
    responses,
    "company-website",
    "companyWebsite",
    "website",
    "company"
  );
  const duration =
    typeof booking.duration === "number"
      ? booking.duration
      : typeof booking.length === "number"
        ? booking.length
        : null;

  // Contact traits: merged onto the contact, so the list-joined automation has
  // them for personalisation.
  const attributes: Record<string, string | number | boolean> = {};
  putIf(attributes, "name", name);
  putIf(attributes, "companyWebsite", companyWebsite);
  putIf(attributes, "timeZone", firstText(attendee.timeZone));
  putIf(attributes, "language", languageText(attendee.language));
  putIf(attributes, "demoEventType", eventType);
  putIf(attributes, "demoEventTitle", title);
  putIf(attributes, "demoStartsAt", startsAt);
  putIf(attributes, "demoEndsAt", endsAt);
  putIf(attributes, "demoMeetingUrl", meetingUrl);
  putIf(attributes, "demoLocation", location);
  putIf(attributes, "lastDemoBookingUid", uid);
  putIf(attributes, "lastDemoStatus", status);
  if (duration !== null) attributes.demoDurationMinutes = duration;

  // Event facts: kept with the event (queryable in SQL), not on the contact.
  const eventPayload: Record<string, unknown> = {
    source: "cal.com",
    trigger: opts?.trigger ?? null,
    bookingUid: orNull(uid),
    eventType: orNull(eventType),
    title: orNull(title),
    startsAt: orNull(startsAt),
    endsAt: orNull(endsAt),
    durationMinutes: duration,
    meetingUrl: orNull(meetingUrl),
    location: orNull(location),
    status: orNull(status),
    attendeeEmail: orNull(email),
    attendeeName: orNull(name),
  };

  // Stable per booking so a Cal retry dedupes instead of double-firing.
  const idempotencyKey = uid
    ? `cal:booking:${uid}`
    : `cal:${opts?.trigger ?? "booking"}:${orNull(email) ?? "unknown"}:${startsAt}`;

  return {
    event: orNull(opts?.eventName ?? "") ?? DEFAULT_EVENT_NAME,
    contact: email ? { email } : {},
    attributes,
    payload: eventPayload,
    addToList: orNull(opts?.listName ?? "") ?? DEFAULT_TARGET_LIST,
    idempotencyKey,
    // The webhook fires at booking time, so "now" (the webhook's createdAt) is
    // within the accepted window; omit when unknown to default to now.
    ...(opts?.occurredAt ? { occurredAt: opts.occurredAt } : {}),
  };
}
