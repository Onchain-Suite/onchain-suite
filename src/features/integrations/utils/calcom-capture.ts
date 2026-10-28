/**
 * Pure mapper: a Cal.com booking webhook payload -> the form-capture ingest body.
 *
 * No React, no network. Kept pure so it is unit-tested without mounting the
 * route (see calcom-capture.test.ts). Tolerant of both the webhook payload shape
 * (startTime/endTime, responses) and the REST shape (start/end,
 * bookingFieldsResponses), and of custom-field answers that arrive as either a
 * scalar or a `{ label, value }` pair.
 */
import type {
  CalcomBookingPayload,
  CalcomResponseValue,
  FormCaptureIngest,
} from "../contracts/calcom";

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

/** Add a field only when it has a non-empty value (keeps us under the 20-key cap). */
const putIf = (
  target: Record<string, string | number>,
  key: string,
  value: string
) => {
  if (value.length > 0) target[key] = value;
};

/**
 * Map a Cal.com booking to the capture ingest body. `email` comes from the
 * first attendee (falling back to the `email` response); every other detail is
 * carried as a primitive `fields` entry. `email` is never placed in `fields`
 * (the backend sanitizer drops email-named keys).
 */
export function mapCalcomBookingToCapture(
  payload: CalcomBookingPayload | undefined,
  opts?: { trigger?: string; capturedAt?: string }
): FormCaptureIngest {
  const booking = payload ?? {};
  const attendee = booking.attendees?.[0] ?? {};
  const responses = booking.responses ?? booking.bookingFieldsResponses;

  const email =
    firstText(attendee.email, pickResponse(responses, "email")) || null;

  const fields: Record<string, string | number> = {};
  putIf(
    fields,
    "name",
    firstText(attendee.name, pickResponse(responses, "name"))
  );
  putIf(
    fields,
    "companyWebsite",
    pickResponse(
      responses,
      "company-website",
      "companyWebsite",
      "website",
      "company"
    )
  );
  putIf(fields, "timeZone", firstText(attendee.timeZone));
  putIf(fields, "language", languageText(attendee.language));
  putIf(
    fields,
    "eventType",
    firstText(booking.eventType?.slug, booking.eventType?.title, booking.type)
  );
  putIf(fields, "eventTitle", firstText(booking.title, booking.eventTitle));
  putIf(fields, "demoStartsAt", firstText(booking.startTime, booking.start));
  putIf(fields, "demoEndsAt", firstText(booking.endTime, booking.end));
  putIf(fields, "location", firstText(booking.location));
  putIf(fields, "meetingUrl", firstText(booking.meetingUrl));
  putIf(fields, "calBookingUid", firstText(booking.uid));
  putIf(fields, "calStatus", firstText(booking.status));
  putIf(fields, "source", "cal.com");
  if (opts?.trigger) putIf(fields, "calTrigger", opts.trigger);

  const duration =
    typeof booking.duration === "number"
      ? booking.duration
      : typeof booking.length === "number"
        ? booking.length
        : null;
  if (duration !== null) fields.durationMinutes = duration;

  const when = firstText(opts?.capturedAt) || new Date().toISOString();
  const consentText = `Booked a demo/walkthrough via Cal.com on ${when}`;

  return { email, fields, consent: true, consentText };
}
