import { describe, expect, it } from "vitest";

import type { CalcomBookingPayload } from "../contracts/calcom";
import {
  DEFAULT_EVENT_NAME,
  DEFAULT_TARGET_LIST,
  mapCalcomBookingToEvent,
} from "./calcom-event";

describe("mapCalcomBookingToEvent", () => {
  it("maps a webhook-shape booking into the events body", () => {
    const payload: CalcomBookingPayload = {
      uid: "i3KDVTWePQ",
      title: "Demo with Acme",
      startTime: "2026-11-01T15:00:00.000Z",
      endTime: "2026-11-01T15:30:00.000Z",
      length: 30,
      location: "Google Meet",
      meetingUrl: "https://meet.google.com/abc",
      status: "ACCEPTED",
      type: "demo-walkthrough",
      eventType: { slug: "demo-walkthrough", title: "Demo / Walkthrough" },
      attendees: [
        {
          name: "Ada Lovelace",
          email: "ada@acme.io",
          timeZone: "Europe/London",
          language: { locale: "en" },
        },
      ],
      responses: {
        name: "Ada Lovelace",
        email: "ada@acme.io",
        "Company-Website": { label: "Company Website", value: "acme.io" },
      },
    };

    const out = mapCalcomBookingToEvent(payload, {
      trigger: "BOOKING_CREATED",
      occurredAt: "2026-10-28T00:00:00.000Z",
    });

    expect(out.event).toBe(DEFAULT_EVENT_NAME);
    expect(out.addToList).toBe(DEFAULT_TARGET_LIST);
    expect(out.contact).toEqual({ email: "ada@acme.io" });
    expect(out.idempotencyKey).toBe("cal:booking:i3KDVTWePQ");
    expect(out.occurredAt).toBe("2026-10-28T00:00:00.000Z");
    // contact traits land in attributes
    expect(out.attributes).toMatchObject({
      name: "Ada Lovelace",
      companyWebsite: "acme.io",
      timeZone: "Europe/London",
      language: "en",
      demoEventType: "demo-walkthrough",
      demoStartsAt: "2026-11-01T15:00:00.000Z",
      demoMeetingUrl: "https://meet.google.com/abc",
      lastDemoBookingUid: "i3KDVTWePQ",
      demoDurationMinutes: 30,
    });
    // every attribute value is primitive (events API rejects non-primitives)
    for (const v of Object.values(out.attributes)) {
      expect(["string", "number", "boolean"]).toContain(typeof v);
    }
    // event facts land in payload
    expect(out.payload).toMatchObject({
      source: "cal.com",
      trigger: "BOOKING_CREATED",
      bookingUid: "i3KDVTWePQ",
      meetingUrl: "https://meet.google.com/abc",
      attendeeEmail: "ada@acme.io",
    });
  });

  it("maps a REST-shape booking (start/end + bookingFieldsResponses)", () => {
    const out = mapCalcomBookingToEvent({
      uid: "xyz",
      start: "2026-12-02T10:00:00.000Z",
      end: "2026-12-02T10:45:00.000Z",
      duration: 45,
      attendees: [{ name: "Grace", email: "grace@h.dev", timeZone: "UTC" }],
      bookingFieldsResponses: { company_website: "hopper.dev" },
    });
    expect(out.contact.email).toBe("grace@h.dev");
    expect(out.attributes.demoStartsAt).toBe("2026-12-02T10:00:00.000Z");
    expect(out.attributes.demoDurationMinutes).toBe(45);
    expect(out.attributes.companyWebsite).toBe("hopper.dev");
  });

  it("honours overridden list and event names", () => {
    const out = mapCalcomBookingToEvent(
      { uid: "u", attendees: [{ email: "a@b.io" }] },
      { listName: "VIP Demos", eventName: "vip_booked" }
    );
    expect(out.addToList).toBe("VIP Demos");
    expect(out.event).toBe("vip_booked");
  });

  it("leaves contact empty when there is no email (caller skips it)", () => {
    const out = mapCalcomBookingToEvent({
      uid: "u",
      attendees: [{ name: "X" }],
    });
    expect(out.contact).toEqual({});
    // still produces a stable idempotency key from the uid
    expect(out.idempotencyKey).toBe("cal:booking:u");
  });

  it("falls back to a composite idempotency key when there is no uid", () => {
    const out = mapCalcomBookingToEvent(
      {
        start: "2026-12-02T10:00:00.000Z",
        attendees: [{ email: "a@b.io" }],
      },
      { trigger: "BOOKING_CREATED" }
    );
    expect(out.idempotencyKey).toBe(
      "cal:BOOKING_CREATED:a@b.io:2026-12-02T10:00:00.000Z"
    );
  });
});
