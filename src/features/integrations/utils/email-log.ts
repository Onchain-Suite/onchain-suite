import type {
  EmailEnvironment,
  EmailListFilters,
  EmailStatus,
  SuspensionReason,
} from "../contracts/emails";
import type { HealthTone } from "./developer";

/* Pure rules behind the Email logs tab: query building, status words, errors. */

export type Tone = HealthTone | "info";

/** Query keys, scoped to the workspace so a switch never shows another's mail. */
export const emailLogKeys = {
  all: (orgId: string | null) => ["emails-api", "log", orgId] as const,
  list: (orgId: string | null, filters: EmailListFilters) =>
    ["emails-api", "log", orgId, "list", filters] as const,
  detail: (orgId: string | null, id: string | null) =>
    ["emails-api", "log", orgId, "detail", id] as const,
};

/** Rows per page. The backend caps `limit`; 50 fills a screen without a long wait. */
export const EMAIL_PAGE_SIZE = 50;

/** How far ahead a send can be scheduled, and so rescheduled (API.md). */
export const MAX_SCHEDULE_AHEAD_MS = 72 * 60 * 60 * 1000;

export const EMAIL_STATUSES: EmailStatus[] = [
  "scheduled",
  "queued",
  "sending",
  "sent",
  "delivered",
  "partially_failed",
  "failed",
  "canceled",
];

export const EMAIL_ENVIRONMENTS: EmailEnvironment[] = ["live", "test"];

/** What the filter bar holds: plain strings straight from its inputs. */
export interface EmailLogFilterInput {
  status: EmailStatus | "";
  environment: EmailEnvironment | "";
  /** `YYYY-MM-DD` from a date input, in the viewer's timezone. */
  from: string;
  to: string;
  wallet: string;
}

export const EMPTY_FILTERS: EmailLogFilterInput = {
  status: "",
  environment: "",
  from: "",
  to: "",
  wallet: "",
};

/** A `YYYY-MM-DD` day as a local Date at the given clock time, or null. */
function localDay(day: string, endOfDay: boolean): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  if (!m) return null;
  const d = endOfDay
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999)
    : new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  // `new Date(2026, 1, 30)` rolls into March: a day that does not exist is no
  // filter at all rather than a different one.
  if (d.getDate() !== Number(m[3])) return null;
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The filter bar as the API's filters. Days are the viewer's own: "from the
 * 3rd" starts at their midnight and "to the 5th" runs to the end of their
 * 5th, sent as UTC instants. Empty fields are left out, never sent blank.
 */
export function toListFilters(input: EmailLogFilterInput): EmailListFilters {
  const filters: EmailListFilters = {};
  if (input.status) filters.status = input.status;
  if (input.environment) filters.environment = input.environment;
  const from = input.from ? localDay(input.from, false) : null;
  const to = input.to ? localDay(input.to, true) : null;
  if (from) filters.created_after = from.toISOString();
  if (to) filters.created_before = to.toISOString();
  const wallet = input.wallet.trim();
  if (wallet) filters.wallet = wallet;
  return filters;
}

/** True when any filter narrows the list (so "nothing here" means "no match"). */
export const hasFilters = (input: EmailLogFilterInput): boolean =>
  Object.keys(toListFilters(input)).length > 0;

/**
 * The query string of `GET /emails` for one page. Keys follow the API's own
 * snake_case, in a fixed order so the same filters are the same URL.
 */
export function buildEmailListQuery(
  filters: EmailListFilters,
  cursor?: string | null,
  limit: number = EMAIL_PAGE_SIZE
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const keys: (keyof EmailListFilters)[] = [
    "status",
    "environment",
    "created_after",
    "created_before",
    "tag",
    "wallet",
  ];
  for (const k of keys) {
    const v = filters[k]?.trim();
    if (v) params.set(k, v);
  }
  return params;
}

const EMAIL_STATUS: Record<EmailStatus, { tone: Tone; label: string }> = {
  scheduled: { tone: "info", label: "Scheduled" },
  queued: { tone: "neutral", label: "Queued" },
  sending: { tone: "info", label: "Sending" },
  sent: { tone: "info", label: "Sent" },
  delivered: { tone: "success", label: "Delivered" },
  partially_failed: { tone: "warning", label: "Partially failed" },
  failed: { tone: "error", label: "Failed" },
  canceled: { tone: "neutral", label: "Canceled" },
};

const RECIPIENT_STATUS: Record<string, { tone: Tone; label: string }> = {
  queued: { tone: "neutral", label: "Queued" },
  sent: { tone: "info", label: "Sent" },
  delivered: { tone: "success", label: "Delivered" },
  bounced: { tone: "error", label: "Bounced" },
  complained: { tone: "error", label: "Marked as spam" },
  failed: { tone: "error", label: "Failed" },
  suppressed: { tone: "warning", label: "Suppressed" },
  canceled: { tone: "neutral", label: "Canceled" },
};

/** `partially_failed` → "Partially failed": a status the UI has no word for yet still reads. */
const humanize = (s: string): string => {
  const t = s.replace(/_/g, " ").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "Unknown";
};

/** An email's status as a coloured word. Unknown statuses render neutral, as sent. */
export function emailStatusBadge(status: string): {
  tone: Tone;
  label: string;
} {
  return (
    EMAIL_STATUS[status as EmailStatus] ?? {
      tone: "neutral",
      label: humanize(status),
    }
  );
}

/** A recipient's status as a coloured word. */
export function recipientStatusBadge(status: string): {
  tone: Tone;
  label: string;
} {
  return (
    RECIPIENT_STATUS[status] ?? { tone: "neutral", label: humanize(status) }
  );
}

const EVENT_LABEL: Record<string, string> = {
  sent: "Handed to the provider",
  delivered: "Delivered",
  delivery_delayed: "Delivery delayed, still retrying",
  bounced: "Bounced",
  complained: "Marked as spam",
  failed: "Failed",
  suppressed: "Suppressed, not sent",
};

const BOUNCE_LABEL: Record<string, string> = {
  hard: "permanent",
  soft: "temporary, provider gave up",
  undetermined: "undetermined",
};

/** One timeline line: "Bounced (permanent, NoEmail)". */
export function eventLabel(event: {
  type: string;
  bounce?: { type: string; subtype: string | null };
}): string {
  const base = EVENT_LABEL[event.type] ?? humanize(event.type);
  if (event.type !== "bounced" || !event.bounce) return base;
  const kind = BOUNCE_LABEL[event.bounce.type] ?? event.bounce.type;
  const parts = [kind, event.bounce.subtype].filter(Boolean);
  return parts.length ? `${base} (${parts.join(", ")})` : base;
}

/** Only a `scheduled` email can be moved or called off. */
export const isActionable = (status: string): boolean => status === "scheduled";

/** `Date` as the value of a `datetime-local` input, in the viewer's timezone. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Check a new send time from a `datetime-local` input before it is sent:
 * it must parse, be in the future, and be within 72 hours of now. The backend
 * checks again against its own clock (and allows 60 s of skew); this catches
 * the obvious mistakes before a round trip.
 */
export function validateReschedule(
  localValue: string,
  now: Date = new Date()
): { ok: true; iso: string } | { ok: false; error: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue.trim());
  if (!m) return { ok: false, error: "Pick a date and time." };
  const at = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5])
  );
  if (Number.isNaN(at.getTime()) || at.getDate() !== Number(m[3])) {
    return { ok: false, error: "That date does not exist." };
  }
  if (at.getTime() <= now.getTime()) {
    return {
      ok: false,
      error: "Pick a time in the future. To send now, cancel and send again.",
    };
  }
  if (at.getTime() - now.getTime() > MAX_SCHEDULE_AHEAD_MS) {
    return {
      ok: false,
      error: "An email can be scheduled at most 72 hours ahead.",
    };
  }
  return { ok: true, iso: at.toISOString() };
}

const SUSPENSION_REASON: Record<string, string> = {
  complaint_rate:
    "too many recipients reported recent mail as spam for transactional mail",
  hard_bounce_rate:
    "too many recent messages hard-bounced for transactional mail",
  manual: "our team paused it for review",
};

/** Why sending is suspended, in a sentence fragment. */
export const suspensionReasonText = (reason: SuspensionReason | null): string =>
  (reason && SUSPENSION_REASON[reason]) ?? "of a review on our side";

/** The fields of an API failure that copy is chosen from. */
export interface EmailApiFailure {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
  message?: string;
}

/**
 * What to tell someone when an Email API call failed, by code first and
 * status second. Never echoes an address: the API puts none in errors.
 */
export function emailErrorCopy(err: EmailApiFailure | null | undefined): {
  title: string;
  body: string;
} {
  const code = err?.code;
  if (code === "SENDING_SUSPENDED") {
    const reason =
      typeof err?.details?.reason === "string" ? err.details.reason : null;
    return {
      title: "Sending is suspended for this workspace",
      body: `API sending is paused because ${suspensionReasonText(reason)}. Contact support to review and lift it.`,
    };
  }
  if (code === "EMAIL_NOT_SCHEDULED") {
    const now =
      typeof err?.details?.status === "string" ? err.details.status : null;
    return {
      title: "This email is no longer scheduled",
      body: now
        ? `It is already ${emailStatusBadge(now).label.toLowerCase()}, so it can't be changed. The log has been refreshed.`
        : "It was released for sending or canceled a moment ago, so it can't be changed. The log has been refreshed.",
    };
  }
  if (code === "SCHEDULED_AT_TOO_FAR") {
    return {
      title: "Too far ahead",
      body: "An email can be scheduled at most 72 hours ahead.",
    };
  }
  if (code === "SCHEDULED_AT_IN_PAST") {
    return {
      title: "That time has passed",
      body: "Pick a time in the future. To send now, cancel and send again.",
    };
  }
  if (code === "SCHEDULED_AT_INVALID") {
    return { title: "That time isn't valid", body: "Pick a date and time." };
  }
  if (err?.status === 404 || code === "NOT_FOUND") {
    return {
      title: "Email not found",
      body: "It isn't in this workspace. It may belong to another workspace.",
    };
  }
  if (err?.status === 403) {
    return {
      title: "No access",
      body: "You don't have access to the email log in this workspace. Ask an owner or admin.",
    };
  }
  return {
    title: "Something went wrong",
    body: "Couldn't reach the email log. Try again in a moment.",
  };
}
