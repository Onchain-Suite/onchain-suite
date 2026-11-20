import { describe, expect, it } from "vitest";

import {
  bookingEventTypeKeys,
  bookingMatchesEventTypes,
  parseEventTypeFilter,
} from "./calcom-event-filter";

const demo = {
  type: "15min",
  eventTitle: "Demo | OnchainSuite",
  eventTypeId: 4242,
};
const datum = {
  type: "datumlabs",
  eventTitle: "Datum Labs | Connect",
  eventTypeId: 5151,
};

describe("bookingMatchesEventTypes", () => {
  it("lets every booking through when no filter is set (today's behaviour)", () => {
    expect(bookingMatchesEventTypes(datum, undefined)).toEqual({
      allowed: true,
    });
    expect(bookingMatchesEventTypes(datum, "  ,  ")).toEqual({ allowed: true });
  });

  it("keeps the demo link and skips other links on the same Cal.com account", () => {
    expect(bookingMatchesEventTypes(demo, "15min")).toEqual({ allowed: true });
    expect(bookingMatchesEventTypes(datum, "15min")).toEqual({
      allowed: false,
      seen: ["datumlabs", "datum labs | connect", "5151"],
    });
  });

  it("matches the slug, the title or the numeric id, ignoring case and spaces", () => {
    expect(bookingMatchesEventTypes(demo, " 15MIN ").allowed).toBe(true);
    expect(bookingMatchesEventTypes(demo, "demo | onchainsuite").allowed).toBe(
      true
    );
    expect(bookingMatchesEventTypes(demo, "4242").allowed).toBe(true);
    expect(bookingMatchesEventTypes(demo, "walkthrough, 15min").allowed).toBe(
      true
    );
  });

  it("reads the REST-shaped eventType object too", () => {
    expect(
      bookingMatchesEventTypes(
        { eventType: { slug: "15min", title: "Demo", id: 7 } },
        "15min"
      ).allowed
    ).toBe(true);
  });

  it("skips a booking that carries no event type when a filter is set", () => {
    expect(bookingMatchesEventTypes({}, "15min")).toEqual({
      allowed: false,
      seen: [],
    });
    expect(bookingMatchesEventTypes(undefined, "15min").allowed).toBe(false);
  });
});

describe("parseEventTypeFilter / bookingEventTypeKeys", () => {
  it("splits, trims, lowercases and drops blanks", () => {
    expect([...parseEventTypeFilter(" 15min ,, Demo | OnchainSuite ")]).toEqual(
      ["15min", "demo | onchainsuite"]
    );
  });

  it("ignores non-finite ids and empty strings", () => {
    expect(
      bookingEventTypeKeys({ type: "  ", eventTypeId: Number.NaN })
    ).toEqual([]);
  });
});
