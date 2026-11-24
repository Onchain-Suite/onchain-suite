import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api-client";

import { emailsService, toEmailFailure } from "./emails.service";

vi.mock("@/lib/api-client", () => ({
  apiClient: { request: vi.fn() },
}));

const request = vi.mocked(apiClient.request);

const respond = (data: unknown) =>
  request.mockResolvedValueOnce({ data: { success: true, data } } as never);

/** The backend's error envelope: the exception body nests under `error.details`. */
const fail = (status: number, code: string, details: Record<string, unknown>) =>
  request.mockRejectedValueOnce({
    message: "Request failed",
    response: {
      status,
      data: {
        success: false,
        error: {
          code,
          message: `${code} message`,
          details: { code, message: `${code} message`, details },
        },
      },
    },
  });

const ROW = {
  id: "em_1",
  environment: "live",
  from: "receipts@acme.xyz",
  subject: "Your receipt",
  created_at: "2026-11-24T10:00:00.000Z",
  status: "delivered",
  scheduled_at: null,
  recipient_count: 2,
  tags: [{ name: "kind", value: "receipt" }],
};

const lastUrl = () => (request.mock.calls.at(-1)?.[0] as { url: string }).url;

describe("emailsService.list", () => {
  beforeEach(() => request.mockReset());

  it("builds the query from the filters and sends the workspace", async () => {
    respond({ data: [ROW], has_more: false, next_cursor: null });
    await emailsService.list(
      { status: "scheduled", environment: "test", wallet: "0xabc" },
      null,
      "org_1"
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "x-org-id": "org_1" }),
      })
    );
    const url = new URL(lastUrl(), "http://x");
    expect(url.pathname).toBe("/emails");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: "50",
      status: "scheduled",
      environment: "test",
      wallet: "0xabc",
    });
  });

  it("follows the cursor and reads the page", async () => {
    respond({ data: [ROW], has_more: true, next_cursor: "cur_2" });
    const page = await emailsService.list({}, "cur_1", "org_1");
    expect(new URL(lastUrl(), "http://x").searchParams.get("cursor")).toBe(
      "cur_1"
    );
    expect(page).toEqual({
      data: [ROW],
      has_more: true,
      next_cursor: "cur_2",
    });
  });

  it("stops when there is no cursor to follow, whatever has_more says", async () => {
    respond({ data: [], has_more: true, next_cursor: null });
    const page = await emailsService.list({}, null, "org_1");
    expect(page.has_more).toBe(false);
  });

  it("skips rows without an id and keeps an unknown status as sent", async () => {
    respond({
      data: [{ subject: "orphan" }, { ...ROW, status: "on_hold" }],
      has_more: false,
      next_cursor: null,
    });
    const page = await emailsService.list({}, null, "org_1");
    expect(page.data).toHaveLength(1);
    expect(page.data[0].status).toBe("on_hold");
  });

  it("carries a suspension's code and reason out of the nested envelope", async () => {
    fail(403, "SENDING_SUSPENDED", { reason: "hard_bounce_rate" });
    const err = await emailsService.list({}, null, "org_1").catch((e) => e);
    expect(toEmailFailure(err)).toMatchObject({
      status: 403,
      code: "SENDING_SUSPENDED",
      details: { reason: "hard_bounce_rate" },
    });
  });
});

describe("emailsService.get", () => {
  beforeEach(() => request.mockReset());

  it("shows a wallet recipient as the wallet, with its events", async () => {
    respond({
      ...ROW,
      status: "partially_failed",
      recipients: [
        {
          id: "r1",
          kind: "to",
          address: "0x00000000000000000000000000000000000000aa",
          type: "wallet",
          status: "delivered",
          last_event_at: "2026-11-24T10:00:04.000Z",
        },
        {
          id: "r2",
          kind: "cc",
          address: "bob@example.com",
          type: "email",
          status: "bounced",
          last_event_at: null,
        },
      ],
      events: [
        {
          type: "sent",
          recipient_id: "r1",
          created_at: "2026-11-24T10:00:01.000Z",
        },
        {
          type: "bounced",
          recipient_id: "r2",
          created_at: "2026-11-24T10:00:05.000Z",
          bounce: { type: "hard", subtype: "NoEmail" },
        },
      ],
    });
    const email = await emailsService.get("em_1", "org_1");
    expect(lastUrl()).toBe("/emails/em_1");
    expect(email.recipients[0]).toMatchObject({
      type: "wallet",
      address: "0x00000000000000000000000000000000000000aa",
    });
    expect(email.events[1].bounce).toEqual({
      type: "hard",
      subtype: "NoEmail",
    });
    expect(email.events[0].bounce).toBeUndefined();
  });
});

describe("reschedule and cancel", () => {
  beforeEach(() => request.mockReset());

  it("reschedules with scheduled_at as the only field", async () => {
    respond({
      id: "em_1",
      status: "scheduled",
      scheduled_at: "2026-11-25T12:00:00.000Z",
    });
    const res = await emailsService.reschedule(
      "em_1",
      "2026-11-25T12:00:00.000Z",
      "org_1"
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PATCH",
        url: "/emails/em_1",
        data: { scheduled_at: "2026-11-25T12:00:00.000Z" },
      })
    );
    expect(res.scheduled_at).toBe("2026-11-25T12:00:00.000Z");
  });

  it("cancels through POST /emails/:id/cancel", async () => {
    respond({ id: "em_1", status: "canceled" });
    await expect(emailsService.cancel("em_1", "org_1")).resolves.toEqual({
      id: "em_1",
      status: "canceled",
    });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST", url: "/emails/em_1/cancel" })
    );
  });

  it("reports a lost race with the sweeper as EMAIL_NOT_SCHEDULED and the status it found", async () => {
    fail(409, "EMAIL_NOT_SCHEDULED", { status: "queued" });
    const err = await emailsService.cancel("em_1", "org_1").catch((e) => e);
    expect(err).toMatchObject({
      name: "DeveloperApiError",
      status: 409,
      code: "EMAIL_NOT_SCHEDULED",
      details: { status: "queued" },
    });
  });

  it("escapes the id into the path", async () => {
    respond({ id: "a/b", status: "canceled" });
    await emailsService.cancel("a/b", "org_1");
    expect(lastUrl()).toBe("/emails/a%2Fb/cancel");
  });
});
