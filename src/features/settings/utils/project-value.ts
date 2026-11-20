/**
 * Pure helpers for the "project value" settings (backend 2026-11-20): a fee
 * rate per contract (`contractAddresses[].feeBps`) and the list of custom
 * events that carry revenue (`revenueEvents`). Together they are how Estimated
 * LTV measures what a contact is worth to the project; with neither set, LTV
 * has no number. No React, no network, so the rules are unit-testable.
 */

/** 10000 bps = 100%. Mirrors `MAX_FEE_BPS` on the backend. */
export const MAX_FEE_BPS = 10_000;
/** Mirrors `MAX_REVENUE_EVENTS` on the backend DTO (`@ArrayMaxSize`). */
export const MAX_REVENUE_EVENTS = 50;
/** What the backend reads when `amountField` is omitted. */
export const DEFAULT_REVENUE_AMOUNT_FIELD = "revenue_usd";
/** Mirrors `REVENUE_EVENT_NAME_PATTERN`; a mismatch is a 400 on save. */
export const REVENUE_EVENT_NAME_PATTERN = /^[a-zA-Z0-9_.:-]{1,64}$/;
/** Mirrors `REVENUE_AMOUNT_FIELD_PATTERN`: a top-level payload key. */
export const REVENUE_AMOUNT_FIELD_PATTERN = /^[A-Za-z0-9_]{1,64}$/;

export type PercentParse =
  { ok: true; feeBps: number | undefined } | { ok: false; error: string };

/**
 * Parse what a person typed as a percent into integer basis points.
 * "" means "no fee rate" (the field is omitted on save, not sent as 0, since
 * 0 says "this contract earns nothing" and absent says "not configured").
 * At most two decimals, because 0.01% is 1 bp and anything finer cannot be
 * stored as an integer.
 */
export function percentToBps(input: string): PercentParse {
  const raw = input.trim().replace(/%$/, "").trim();
  if (raw === "") return { ok: true, feeBps: undefined };
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(raw)) {
    return { ok: false, error: "Enter a number between 0 and 100" };
  }
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  if (decimals > 2) {
    return { ok: false, error: "Use at most 2 decimal places (0.01%)" };
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { ok: false, error: "Enter a number between 0 and 100" };
  }
  // Math.round, not floor: 0.29 * 100 is 28.999999999999996 in floats.
  const feeBps = Math.round(value * 100);
  return { ok: true, feeBps: Math.min(MAX_FEE_BPS, feeBps) };
}

/** Basis points back to the percent string the input shows ("" when unset). */
export function bpsToPercent(feeBps: number | undefined | null): string {
  if (typeof feeBps !== "number" || !Number.isFinite(feeBps)) return "";
  const clamped = Math.min(MAX_FEE_BPS, Math.max(0, Math.round(feeBps)));
  // Two decimals at most, without trailing zeros: 30 -> "0.3", 10000 -> "100".
  return String(Number((clamped / 100).toFixed(2)));
}

/** Read an untrusted `feeBps` off the wire: an integer 0-10000, else unset. */
export function readFeeBps(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 0 || value > MAX_FEE_BPS) return undefined;
  return value;
}

export interface RevenueEventSetting {
  eventName: string;
  /** Omitted means the backend reads `revenue_usd`. */
  amountField?: string;
}

/** Normalise `revenueEvents` from a GET; drops anything malformed. */
export function normalizeRevenueEvents(value: unknown): RevenueEventSetting[] {
  if (!Array.isArray(value)) return [];
  const out: RevenueEventSetting[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const eventName =
      typeof row.eventName === "string" ? row.eventName.trim() : "";
    if (!eventName) continue;
    const amountField =
      typeof row.amountField === "string" ? row.amountField.trim() : "";
    out.push(amountField ? { eventName, amountField } : { eventName });
  }
  return out;
}

/**
 * Trim every row and drop fully blank ones (an "Add event" row nobody filled
 * in). An empty `amountField` is omitted so the backend default applies.
 */
export function sanitizeRevenueEvents(
  rows: Array<{ eventName?: string; amountField?: string }>
): RevenueEventSetting[] {
  const out: RevenueEventSetting[] = [];
  for (const row of rows) {
    const eventName = (row.eventName ?? "").trim();
    const amountField = (row.amountField ?? "").trim();
    if (!eventName && !amountField) continue;
    out.push(amountField ? { eventName, amountField } : { eventName });
  }
  return out;
}

export interface RevenueEventIssue {
  /** Row index in the input, or -1 for a list-level problem. */
  index: number;
  field: "eventName" | "amountField" | "list";
  message: string;
}

/**
 * Validate the editor's rows the way the backend will, so a save never comes
 * back as a 400. Duplicates compare case-insensitively because the backend
 * matches event names lowercased: "Trade" and "trade" would double-count.
 */
export function validateRevenueEvents(
  rows: Array<{ eventName?: string; amountField?: string }>
): RevenueEventIssue[] {
  const issues: RevenueEventIssue[] = [];
  const seen = new Map<string, number>();
  let filled = 0;
  rows.forEach((row, index) => {
    const eventName = (row.eventName ?? "").trim();
    const amountField = (row.amountField ?? "").trim();
    if (!eventName && !amountField) return;
    filled += 1;
    if (!eventName) {
      issues.push({
        index,
        field: "eventName",
        message: "Enter an event name",
      });
    } else if (!REVENUE_EVENT_NAME_PATTERN.test(eventName)) {
      issues.push({
        index,
        field: "eventName",
        message:
          "Letters, numbers and _ . : - only, up to 64 characters, no spaces",
      });
    } else {
      const key = eventName.toLowerCase();
      if (seen.has(key)) {
        issues.push({
          index,
          field: "eventName",
          message: `"${eventName}" is already listed`,
        });
      } else {
        seen.set(key, index);
      }
    }
    if (amountField && !REVENUE_AMOUNT_FIELD_PATTERN.test(amountField)) {
      issues.push({
        index,
        field: "amountField",
        message:
          "A top-level payload key: letters, numbers and _ only, up to 64 characters",
      });
    }
  });
  if (filled > MAX_REVENUE_EVENTS) {
    issues.push({
      index: -1,
      field: "list",
      message: `At most ${MAX_REVENUE_EVENTS} revenue events`,
    });
  }
  return issues;
}
