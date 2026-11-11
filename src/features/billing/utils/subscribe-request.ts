import type { SubscribeRequest } from "../billing.service";
import { clampExtraSeats } from "../seat-pricing";

/** A slider size worth sending: a positive whole number, else nothing. */
export function chosenSize(contacts: unknown): number | undefined {
  return typeof contacts === "number" &&
    Number.isFinite(contacts) &&
    contacts > 0
    ? Math.round(contacts)
    : undefined;
}

/**
 * The body for `POST /billing/subscribe` (the card path).
 *
 * It carries the two things the picker put a price on: the size on the slider
 * and any extra seats. Both must reach the backend or the charge is not the
 * price shown. The size was once left out as "informational", on the idea that
 * the subscription bills the list as it is; the result was a quote for 5,000
 * contacts and a checkout for the 20 the workspace held.
 */
export function subscribeRequestFor(
  plan: string,
  organizationId: string,
  options?: { contacts?: number; extraSeats?: number }
): SubscribeRequest {
  const contacts = chosenSize(options?.contacts);
  const seats = clampExtraSeats(options?.extraSeats);
  return {
    plan,
    organizationId,
    ...(contacts ? { contacts } : {}),
    ...(seats > 0 ? { extraSeats: seats } : {}),
  };
}

/**
 * Whether the URL a subscribe call returned is one of our own pages.
 *
 * A new subscription returns Stripe's checkout page. A workspace that already
 * subscribes has its plan changed on the spot and is sent back to its billing
 * tab, since a second checkout would be a second subscription. The two are
 * told apart by where the URL points, so the picker can say "updated" instead
 * of "opening checkout" and stay in this tab.
 */
export function isOwnPage(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}
