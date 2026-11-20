/**
 * Which Cal.com bookings the relay acts on.
 *
 * A Cal.com webhook set at ACCOUNT level fires for every booking link on the
 * account, not just the demo. Without a filter, a "Datum Labs | Connect" or
 * "Secret meeting" booking joins "Booked a Demo/Walkthrough" and receives the
 * OnchainSuite welcome sequence. `CALCOM_EVENT_TYPES` names the booking links
 * that count; everything else is acknowledged and skipped.
 *
 * An entry matches a booking's link slug (`15min`), its event-type title
 * ("Demo | OnchainSuite") or its numeric event-type id, case-insensitively, so
 * whoever sets the variable can copy whichever of the three Cal.com shows them.
 * Unset or blank keeps today's behaviour: every booking counts.
 *
 * Pure: no env reads, no network. The route passes the env value in.
 */
import type { CalcomBookingPayload } from "../contracts/calcom";

/** Parse `CALCOM_EVENT_TYPES` ("15min, Demo | OnchainSuite, 123") to a set. */
export function parseEventTypeFilter(raw: string | undefined): Set<string> {
  const out = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const v = part.trim().toLowerCase();
    if (v.length > 0) out.add(v);
  }
  return out;
}

/** Every identifier the booking carries for its event type, normalised. */
export function bookingEventTypeKeys(
  booking: CalcomBookingPayload | undefined
): string[] {
  const b = booking ?? {};
  const candidates: unknown[] = [
    b.type,
    b.eventType?.slug,
    b.eventType?.title,
    b.eventTitle,
    b.eventTypeId,
    b.eventType?.id,
  ];
  const keys: string[] = [];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) keys.push(String(c));
    else if (typeof c === "string" && c.trim().length > 0)
      keys.push(c.trim().toLowerCase());
  }
  return keys;
}

export type EventTypeDecision =
  { allowed: true } | { allowed: false; seen: string[] };

/**
 * Whether the relay should act on this booking. With no filter configured,
 * always. With one, only when one of the booking's identifiers is listed; a
 * booking that carries no identifier at all is skipped rather than guessed at.
 */
export function bookingMatchesEventTypes(
  booking: CalcomBookingPayload | undefined,
  rawFilter: string | undefined
): EventTypeDecision {
  const filter = parseEventTypeFilter(rawFilter);
  if (filter.size === 0) return { allowed: true };
  const seen = bookingEventTypeKeys(booking);
  return seen.some((k) => filter.has(k))
    ? { allowed: true }
    : { allowed: false, seen };
}
