import { type NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/public-forms-backend";

import type { CalcomWebhookEnvelope } from "@/features/integrations/contracts/calcom";
import { mapCalcomBookingToCapture } from "@/features/integrations/utils/calcom-capture";
import { verifyCalcomSignature } from "@/features/integrations/utils/calcom-signature";

// Needs Node crypto (HMAC) and must read the raw body for signature checking,
// so pin the Node runtime (not Edge) and opt out of any caching.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Triggers that create a "Booked a Demo/Walkthrough" contact. */
const CREATE_TRIGGERS = new Set(["BOOKING_CREATED"]);

/**
 * Cal.com -> OnchainSuite relay.
 *
 * Receives a Cal.com booking webhook, verifies its HMAC signature, maps the
 * booking's full details to a capture, and forwards it to the backend's secret-
 * key form-ingest (`POST /forms/:token/ingest`). That ingest creates/updates the
 * contact with every detail, adds it to the list the form is bound to ("Booked a
 * Demo/Walkthrough"), and fires the list-joined trigger - the 5-minute automation
 * runs from there. Stateless: Cal's at-least-once delivery + the ingest's
 * upsert-by-email keep re-deliveries idempotent for the contact.
 *
 * Config (server-only env):
 *  - CALCOM_WEBHOOK_SECRET  secret shared with the Cal webhook (signature key)
 *  - CALCOM_FORM_TOKEN      public token of the capture form bound to the list
 *  - CALCOM_INGEST_API_KEY  sk_live secret key (resolves the org, write scope)
 *  - BACKEND_URL            backend base (defaults to api.onchainsuite.com/api/v1)
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  const formToken = process.env.CALCOM_FORM_TOKEN;
  const apiKey = process.env.CALCOM_INGEST_API_KEY;

  if (!secret || !formToken || !apiKey) {
    // Misconfiguration, not a bad request: fail closed and make it visible.
    console.error("[calcom] relay not configured", {
      hasSecret: Boolean(secret),
      hasFormToken: Boolean(formToken),
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

  const capture = mapCalcomBookingToCapture(envelope.payload, {
    trigger,
    capturedAt: envelope.createdAt,
  });
  if (!capture.email) {
    // No address to key a contact on; acknowledge (retrying won't help).
    console.warn("[calcom] booking without attendee email, skipped", {
      uid: capture.fields.calBookingUid,
    });
    return NextResponse.json({ ok: true, skipped: "no-email" });
  }

  const targetUrl = `${backendBaseUrl()}/forms/${encodeURIComponent(formToken)}/ingest`;
  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email: capture.email,
        fields: capture.fields,
        consent: capture.consent,
        consentText: capture.consentText,
      }),
    });
  } catch (err) {
    console.error("[calcom] ingest unreachable", err);
    // Transient: let Cal retry.
    return NextResponse.json({ error: "ingest-unreachable" }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[calcom] ingest rejected", { status: res.status, detail });
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

  return NextResponse.json({ ok: true });
}
