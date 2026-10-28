import { type NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/public-forms-backend";

import type { CalcomWebhookEnvelope } from "@/features/integrations/contracts/calcom";
import { mapCalcomBookingToEvent } from "@/features/integrations/utils/calcom-event";
import { verifyCalcomSignature } from "@/features/integrations/utils/calcom-signature";

// Needs Node crypto (HMAC) and must read the raw body for signature checking,
// so pin the Node runtime (not Edge) and opt out of any caching.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Triggers that record a demo/walkthrough booking. */
const CREATE_TRIGGERS = new Set(["BOOKING_CREATED"]);

/**
 * Cal.com -> OnchainSuite relay.
 *
 * Receives a Cal.com booking webhook, verifies its HMAC signature, maps the
 * booking's full details, and forwards it to the Custom Events ingest
 * (`POST /api/v1/events`) with the sk_live key. That event creates/updates the
 * contact (email + `attributes`), and `addToList` adds it to "Booked a
 * Demo/Walkthrough" AND fires the list-joined trigger - the 5-minute automation
 * runs from there. No capture form is involved. Stateless: the booking `uid` is
 * sent as the idempotency key, so Cal's at-least-once delivery never
 * double-fires the automation.
 *
 * Config (server-only env):
 *  - CALCOM_WEBHOOK_SECRET  secret shared with the Cal webhook (signature key)
 *  - CALCOM_INGEST_API_KEY  sk_live secret key (resolves the org, write scope)
 *  - CALCOM_TARGET_LIST     list name/id to add to (default below) [optional]
 *  - CALCOM_EVENT_NAME      custom event name (default below) [optional]
 *  - BACKEND_URL            backend base (defaults to api.onchainsuite.com/api/v1)
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  const apiKey = process.env.CALCOM_INGEST_API_KEY;

  if (!secret || !apiKey) {
    // Misconfiguration, not a bad request: fail closed and make it visible.
    console.error("[calcom] relay not configured", {
      hasSecret: Boolean(secret),
      hasApiKey: Boolean(apiKey),
    });
    return NextResponse.json(
      { error: "relay-not-configured" },
      { status: 500 }
    );
  }

  // Read the RAW body: the signature is over the exact bytes Cal sent.
  const raw = await req.text();
  const sig = verifyCalcomSignature(
    raw,
    req.headers.get("x-cal-signature-256"),
    secret
  );
  if (!sig.ok) {
    return NextResponse.json(
      { error: "invalid-signature", reason: sig.reason },
      { status: 401 }
    );
  }

  let envelope: CalcomWebhookEnvelope;
  try {
    envelope = JSON.parse(raw) as CalcomWebhookEnvelope;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const trigger = envelope.triggerEvent ?? "";
  if (!CREATE_TRIGGERS.has(trigger)) {
    // Acknowledge so Cal doesn't retry an event we intentionally ignore.
    return NextResponse.json({ ok: true, skipped: trigger || "no-trigger" });
  }

  const event = mapCalcomBookingToEvent(envelope.payload, {
    trigger,
    occurredAt: envelope.createdAt,
    listName: process.env.CALCOM_TARGET_LIST,
    eventName: process.env.CALCOM_EVENT_NAME,
  });
  if (!event.contact.email) {
    // The events API needs an identifier; Cal bookings carry an attendee email,
    // so a missing one is a malformed payload - ack it (retrying won't help).
    console.warn("[calcom] booking without attendee email, skipped", {
      uid: event.payload.bookingUid,
    });
    return NextResponse.json({ ok: true, skipped: "no-email" });
  }

  const targetUrl = `${backendBaseUrl()}/events`;
  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.error("[calcom] events ingest unreachable", err);
    // Transient: let Cal retry.
    return NextResponse.json({ error: "ingest-unreachable" }, { status: 502 });
  }

  const detail = await res.text().catch(() => "");
  if (!res.ok) {
    console.error("[calcom] events ingest rejected", {
      status: res.status,
      detail,
    });
    // 5xx is transient (retry); a 4xx is a config/mapping problem where retries
    // only storm - acknowledge it so Cal stops, and rely on the log.
    if (res.status >= 500) {
      return NextResponse.json({ error: "ingest-failed" }, { status: 502 });
    }
    return NextResponse.json(
      { ok: false, ingestStatus: res.status },
      { status: 200 }
    );
  }

  // 202 Accepted may carry warnings (e.g. a consent-gated list skipped the add).
  if (detail.includes('"warnings"')) {
    console.warn("[calcom] events ingest warnings", { detail });
  }
  return NextResponse.json({ ok: true });
}
