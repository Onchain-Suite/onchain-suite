import { describe, expect, it } from "vitest";

import {
  buildEmailListQuery,
  EMAIL_STATUSES,
  emailErrorCopy,
  emailStatusBadge,
  EMPTY_FILTERS,
  eventLabel,
  hasFilters,
  isActionable,
  recipientStatusBadge,
  toListFilters,
  toLocalInputValue,
  validateReschedule,
} from "./email-log";

describe("buildEmailListQuery", () => {
  it("always sends a limit, and nothing else when unfiltered", () => {
    expect(buildEmailListQuery({}).toString()).toBe("limit=50");
  });

  it("passes the cursor and every filter in the API's own names", () => {
    const q = buildEmailListQuery(
      {
        status: "scheduled",
        environment: "test",
        created_after: "2026-11-01T00:00:00.000Z",
        created_before: "2026-11-02T00:00:00.000Z",
        tag: "kind:receipt",
        wallet: "0xAbC",
      },
      "cur_2",
      25
    );
    expect(Object.fromEntries(q)).toEqual({
      limit: "25",
      cursor: "cur_2",
      status: "scheduled",
      environment: "test",
      created_after: "2026-11-01T00:00:00.000Z",
      created_before: "2026-11-02T00:00:00.000Z",
      tag: "kind:receipt",
      wallet: "0xAbC",
    });
  });

  it("leaves out blank values instead of sending them empty", () => {
    const q = buildEmailListQuery({ wallet: "   ", tag: "" }, null);
    expect(q.has("wallet")).toBe(false);
    expect(q.has("tag")).toBe(false);
    expect(q.has("cursor")).toBe(false);
  });

  it("is the same URL for the same filters, whatever order they were set in", () => {
    const a = buildEmailListQuery({ wallet: "w", status: "failed" });
    const b = buildEmailListQuery({ status: "failed", wallet: "w" });
    expect(a.toString()).toBe(b.toString());
  });
});

describe("toListFilters", () => {
  it("is empty for an empty filter bar", () => {
    expect(toListFilters(EMPTY_FILTERS)).toEqual({});
    expect(hasFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("spans whole local days for the date range", () => {
    const f = toListFilters({
      ...EMPTY_FILTERS,
      from: "2026-11-03",
      to: "2026-11-05",
    });
    expect(f.created_after).toBe(
      new Date(2026, 10, 3, 0, 0, 0, 0).toISOString()
    );
    expect(f.created_before).toBe(
      new Date(2026, 10, 5, 23, 59, 59, 999).toISOString()
    );
  });

  it("drops a day that does not exist rather than rolling it over", () => {
    expect(
      toListFilters({ ...EMPTY_FILTERS, from: "2026-02-30" }).created_after
    ).toBeUndefined();
  });

  it("trims the wallet and keeps its casing (Solana is case-sensitive)", () => {
    const f = toListFilters({
      ...EMPTY_FILTERS,
      wallet: "  7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV  ",
      status: "partially_failed",
      environment: "live",
    });
    expect(f).toEqual({
      wallet: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
      status: "partially_failed",
      environment: "live",
    });
  });
});

describe("status mapping", () => {
  it("has a word and a colour for every email status", () => {
    for (const s of EMAIL_STATUSES) {
      expect(emailStatusBadge(s).label).not.toBe("");
    }
    expect(emailStatusBadge("scheduled")).toEqual({
      tone: "info",
      label: "Scheduled",
    });
    expect(emailStatusBadge("delivered").tone).toBe("success");
    expect(emailStatusBadge("partially_failed")).toEqual({
      tone: "warning",
      label: "Partially failed",
    });
    expect(emailStatusBadge("failed").tone).toBe("error");
    expect(emailStatusBadge("canceled")).toEqual({
      tone: "neutral",
      label: "Canceled",
    });
  });

  it("renders a status it does not know yet, neutral and readable", () => {
    expect(emailStatusBadge("on_hold")).toEqual({
      tone: "neutral",
      label: "On hold",
    });
  });

  it("colours recipient outcomes by what they mean", () => {
    expect(recipientStatusBadge("delivered").tone).toBe("success");
    expect(recipientStatusBadge("bounced").tone).toBe("error");
    expect(recipientStatusBadge("complained").label).toBe("Marked as spam");
    expect(recipientStatusBadge("suppressed").tone).toBe("warning");
  });

  it("only offers actions on a scheduled email", () => {
    expect(isActionable("scheduled")).toBe(true);
    for (const s of EMAIL_STATUSES.filter((x) => x !== "scheduled")) {
      expect(isActionable(s)).toBe(false);
    }
  });

  it("names the bounce type on a bounce event", () => {
    expect(
      eventLabel({
        type: "bounced",
        bounce: { type: "hard", subtype: "NoEmail" },
      })
    ).toBe("Bounced (permanent, NoEmail)");
    expect(eventLabel({ type: "delivered" })).toBe("Delivered");
    expect(eventLabel({ type: "delivery_delayed" })).toBe(
      "Delivery delayed, still retrying"
    );
  });
});

describe("validateReschedule", () => {
  const now = new Date(2026, 10, 24, 10, 0);

  it("accepts a time inside the 72-hour window as an ISO instant", () => {
    const at = new Date(2026, 10, 25, 9, 30);
    expect(validateReschedule(toLocalInputValue(at), now)).toEqual({
      ok: true,
      iso: at.toISOString(),
    });
  });

  it("refuses a time in the past", () => {
    const r = validateReschedule("2026-11-24T09:59", now);
    expect(r.ok).toBe(false);
  });

  it("refuses a time more than 72 hours ahead", () => {
    const r = validateReschedule("2026-11-27T10:01", now);
    expect(r).toEqual({
      ok: false,
      error: "An email can be scheduled at most 72 hours ahead.",
    });
    expect(validateReschedule("2026-11-27T10:00", now).ok).toBe(true);
  });

  it("refuses an empty or impossible value", () => {
    expect(validateReschedule("", now).ok).toBe(false);
    expect(validateReschedule("2026-02-30T10:00", now).ok).toBe(false);
  });
});

describe("emailErrorCopy", () => {
  it("explains a suspension with its reason", () => {
    const copy = emailErrorCopy({
      status: 403,
      code: "SENDING_SUSPENDED",
      details: { reason: "complaint_rate" },
    });
    expect(copy.title).toBe("Sending is suspended for this workspace");
    expect(copy.body).toMatch(/reported recent mail as spam/);
    expect(copy.body).toMatch(/Contact support/);
  });

  it("says what a too-late reschedule or cancel found", () => {
    const copy = emailErrorCopy({
      status: 409,
      code: "EMAIL_NOT_SCHEDULED",
      details: { status: "queued" },
    });
    expect(copy.title).toBe("This email is no longer scheduled");
    expect(copy.body).toMatch(/already queued/);
  });

  it("falls back on the HTTP status, then on a generic line", () => {
    expect(emailErrorCopy({ status: 403 }).title).toBe("No access");
    expect(emailErrorCopy({ status: 404 }).title).toBe("Email not found");
    expect(emailErrorCopy(null).title).toBe("Something went wrong");
  });
});
