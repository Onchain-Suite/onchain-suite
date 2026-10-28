import { describe, expect, it } from "vitest";

import type { CalcomBookingPayload } from "../contracts/calcom";
import { mapCalcomBookingToCapture } from "./calcom-capture";

describe("mapCalcomBookingToCapture", () => {
  it("maps a webhook-shape booking (startTime/endTime + responses)", () => {
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
          email: "ADA@acme.io",
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

    const out = mapCalcomBookingToCapture(payload, {
      trigger: "BOOKING_CREATED",
      capturedAt: "2026-10-28T00:00:00.000Z",
    });

    expect(out.email).toBe("ADA@acme.io");
    expect(out.consent).toBe(true);
    expect(out.consentText).toContain("2026-10-28");
    expect(out.fields).toMatchObject({
      name: "Ada Lovelace",
      companyWebsite: "acme.io",
      timeZone: "Europe/London",
      language: "en",
      eventType: "demo-walkthrough",
      eventTitle: "Demo with Acme",
      demoStartsAt: "2026-11-01T15:00:00.000Z",
      demoEndsAt: "2026-11-01T15:30:00.000Z",
      location: "Google Meet",
      meetingUrl: "https://meet.google.com/abc",
      calBookingUid: "i3KDVTWePQ",
      calStatus: "ACCEPTED",
      source: "cal.com",
      calTrigger: "BOOKING_CREATED",
      durationMinutes: 30,
    });
    // email must never leak into fields (backend drops email-named keys anyway)
    expect(Object.keys(out.fields)).not.toContain("email");
  });

  it("maps a REST-shape booking (start/end + bookingFieldsResponses, scalar values)", () => {
    const payload: CalcomBookingPayload = {
      uid: "xyz",
      start: "2026-12-02T10:00:00.000Z",
      end: "2026-12-02T10:45:00.000Z",
      duration: 45,
      attendees: [{ name: "Grace", email: "grace@h.dev", timeZone: "UTC" }],
      bookingFieldsResponses: {
        name: "Grace",
        email: "grace@h.dev",
        company_website: "hopper.dev",
      },
    };

    const out = mapCalcomBookingToCapture(payload);

    expect(out.email).toBe("grace@h.dev");
    expect(out.fields.demoStartsAt).toBe("2026-12-02T10:00:00.000Z");
    expect(out.fields.demoEndsAt).toBe("2026-12-02T10:45:00.000Z");
    expect(out.fields.durationMinutes).toBe(45);
    expect(out.fields.companyWebsite).toBe("hopper.dev");
    expect(out.fields.timeZone).toBe("UTC");
  });

  it("falls back to the email response when the attendee has none", () => {
    const out = mapCalcomBookingToCapture({
      attendees: [{ name: "No Email" }],
      responses: { email: "fromresponse@x.io" },
    });
    expect(out.email).toBe("fromresponse@x.io");
  });

  it("returns null email and omits empty fields when nothing usable is present", () => {
    const out = mapCalcomBookingToCapture({ attendees: [{ name: "Anon" }] });
    expect(out.email).toBeNull();
    expect(out.fields.name).toBe("Anon");
    expect(out.fields).not.toHaveProperty("companyWebsite");
    expect(out.fields).not.toHaveProperty("meetingUrl");
    // source is always stamped
    expect(out.fields.source).toBe("cal.com");
  });

  it("tolerates a missing payload", () => {
    const out = mapCalcomBookingToCapture(undefined);
    expect(out.email).toBeNull();
    expect(out.fields.source).toBe("cal.com");
  });
});
