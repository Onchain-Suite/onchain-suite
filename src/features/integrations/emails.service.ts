"use client";

import { isJsonObject } from "@/lib/utils";

/**
 * The transactional Email API log for a workspace: what was sent through
 * `POST /emails`, to whom, and what happened to it, plus rescheduling and
 * cancelling a scheduled send. Contract: onchain-backend
 * `src/modules/emails-api/API.md`.
 *
 * Two things the UI must not get wrong:
 *
 *  1. A wallet recipient's `address` is the wallet. The email it resolved to
 *     is never returned, and nothing here may try to show one.
 *  2. Reschedule and cancel race the release sweeper. A `409
 *     EMAIL_NOT_SCHEDULED` is a normal answer (it went out a moment ago), not
 *     a fault: callers refresh and say so.
 */
import type {
  CancelResult,
  EmailDetail,
  EmailEvent,
  EmailListFilters,
  EmailListPage,
  EmailRecipient,
  EmailSummary,
  EmailTag,
  RescheduleResult,
} from "./contracts/emails";
import { DeveloperApiError, developerRequest } from "./developer.service";
import {
  buildEmailListQuery,
  EMAIL_PAGE_SIZE,
  type EmailApiFailure,
} from "./utils/email-log";

export type {
  CancelResult,
  EmailDetail,
  EmailEvent,
  EmailListFilters,
  EmailListPage,
  EmailRecipient,
  EmailSummary,
  RescheduleResult,
} from "./contracts/emails";

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asNullableString = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const asCount = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;

const normalizeTags = (v: unknown): EmailTag[] => {
  if (Array.isArray(v)) {
    return v
      .filter(isJsonObject)
      .map((t) => ({ name: asString(t.name), value: asString(t.value) }))
      .filter((t) => t.name.length > 0);
  }
  // `{ name: value }` is accepted on send; tolerate it on read too.
  if (isJsonObject(v)) {
    return Object.entries(v)
      .filter((e): e is [string, string] => typeof e[1] === "string")
      .map(([name, value]) => ({ name, value }));
  }
  return [];
};

const normalizeSummary = (raw: unknown): EmailSummary | null => {
  if (!isJsonObject(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;
  return {
    id,
    environment: raw.environment === "test" ? "test" : "live",
    from: asString(raw.from),
    subject: asString(raw.subject),
    created_at: asString(raw.created_at),
    status: asString(raw.status) || "queued",
    scheduled_at: asNullableString(raw.scheduled_at),
    recipient_count: asCount(raw.recipient_count),
    tags: normalizeTags(raw.tags),
  };
};

const normalizeRecipient = (raw: unknown): EmailRecipient | null => {
  if (!isJsonObject(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;
  const kind = raw.kind === "cc" || raw.kind === "bcc" ? raw.kind : "to";
  return {
    id,
    kind,
    address: asString(raw.address),
    type: raw.type === "wallet" ? "wallet" : "email",
    status: asString(raw.status) || "queued",
    last_event_at: asNullableString(raw.last_event_at),
  };
};

const normalizeEvent = (raw: unknown): EmailEvent | null => {
  if (!isJsonObject(raw)) return null;
  const type = asString(raw.type);
  if (!type) return null;
  const event: EmailEvent = {
    type,
    recipient_id: asString(raw.recipient_id),
    created_at: asString(raw.created_at),
  };
  if (isJsonObject(raw.bounce)) {
    event.bounce = {
      type: asString(raw.bounce.type) || "undetermined",
      subtype: asNullableString(raw.bounce.subtype),
    };
  }
  return event;
};

/** The parts of a failed call that error copy is chosen from; null if not an API error. */
export const toEmailFailure = (err: unknown): EmailApiFailure | null =>
  err instanceof DeveloperApiError
    ? {
        status: err.status,
        code: err.code,
        details: err.details,
        message: err.message,
      }
    : null;

const isPresent = <T>(v: T | null): v is T => v !== null;

export const emailsService = {
  /**
   * `GET /emails` - one page, newest first. Pass the previous page's
   * `next_cursor` to get the next; there are no page numbers.
   */
  async list(
    filters: EmailListFilters,
    cursor?: string | null,
    orgId?: string,
    signal?: AbortSignal
  ): Promise<EmailListPage> {
    const query = buildEmailListQuery(filters, cursor, EMAIL_PAGE_SIZE);
    const root = await developerRequest<unknown>(
      { method: "GET", url: `/emails?${query.toString()}`, signal },
      orgId
    );
    const obj = isJsonObject(root) ? root : {};
    const rows = Array.isArray(root)
      ? root
      : Array.isArray(obj.data)
        ? obj.data
        : [];
    const nextCursor = asNullableString(obj.next_cursor);
    return {
      data: rows.map(normalizeSummary).filter(isPresent),
      // A cursor with no `has_more` still means there is more to read.
      has_more: obj.has_more === true && nextCursor !== null,
      next_cursor: nextCursor,
    };
  },

  /** `GET /emails/:id` - recipients with their status, and the event timeline. */
  async get(
    id: string,
    orgId?: string,
    signal?: AbortSignal
  ): Promise<EmailDetail> {
    const root = await developerRequest<unknown>(
      { method: "GET", url: `/emails/${encodeURIComponent(id)}`, signal },
      orgId
    );
    const summary = normalizeSummary(root);
    const obj = isJsonObject(root) ? root : {};
    const recipients = Array.isArray(obj.recipients)
      ? obj.recipients.map(normalizeRecipient).filter(isPresent)
      : [];
    const events = Array.isArray(obj.events)
      ? obj.events.map(normalizeEvent).filter(isPresent)
      : [];
    return {
      id: summary?.id ?? id,
      environment: summary?.environment ?? "live",
      from: summary?.from ?? "",
      subject: summary?.subject ?? "",
      created_at: summary?.created_at ?? "",
      status: summary?.status ?? "queued",
      scheduled_at: summary?.scheduled_at ?? null,
      tags: summary?.tags ?? [],
      recipients,
      events,
    };
  },

  /**
   * `PATCH /emails/:id` - move a scheduled send. `scheduledAt` must be an ISO
   * instant with an offset, from now to 72 hours ahead. `409
   * EMAIL_NOT_SCHEDULED` once it has been released or canceled.
   */
  async reschedule(
    id: string,
    scheduledAt: string,
    orgId?: string
  ): Promise<RescheduleResult> {
    const root = await developerRequest<unknown>(
      {
        method: "PATCH",
        url: `/emails/${encodeURIComponent(id)}`,
        data: { scheduled_at: scheduledAt },
      },
      orgId
    );
    const obj = isJsonObject(root) ? root : {};
    return {
      id: asString(obj.id) || id,
      status: "scheduled",
      scheduled_at: asString(obj.scheduled_at) || scheduledAt,
    };
  },

  /** `POST /emails/:id/cancel` - nothing is sent. `409 EMAIL_NOT_SCHEDULED` if too late. */
  async cancel(id: string, orgId?: string): Promise<CancelResult> {
    const root = await developerRequest<unknown>(
      { method: "POST", url: `/emails/${encodeURIComponent(id)}/cancel` },
      orgId
    );
    const obj = isJsonObject(root) ? root : {};
    return { id: asString(obj.id) || id, status: "canceled" };
  },
};
