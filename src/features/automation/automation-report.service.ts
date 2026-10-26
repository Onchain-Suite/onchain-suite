/**
 * Automation performance report - data layer.
 *
 * Assembles one org-wide view out of three sources, because no single endpoint
 * carries all of it:
 *
 *   GET /automations/metrics            → org-wide active / entries / completionRate
 *   GET /automations                    → per-automation enrolments (paged)
 *   GET /automations/{id}/stats/messages → per-automation delivered/opened/clicked
 *   GET /audience/profiles              → the company-domain scan
 *
 * Every call is sequential and rate-limit-aware: this app already caps
 * `/audience/profiles` at `limit=200`, and firing hundreds of pages at once is
 * what trips the backend's 30-requests-per-10-seconds limiter.
 */
import { isJsonObject } from "@/lib/utils";

import type {
  AutomationTimeSeriesPeriod,
  AutomationTimeSeriesPoint,
} from "./automation.service";
import { automationService } from "./automation.service";
import type { EmailDomainSummary } from "@/features/audience/audience.service";
import { audienceService } from "@/features/audience/audience.service";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** HTTP status off an axios error, wherever it happens to be nested. */
const statusOf = (error: unknown): number | null => {
  const err = error as {
    cause?: unknown;
    response?: { status?: unknown };
    status?: unknown;
  };
  const candidate = (err?.response ?? err?.cause ?? err) as {
    response?: { status?: unknown };
    status?: unknown;
  };
  const status = candidate?.response?.status ?? candidate?.status;
  return typeof status === "number" ? status : null;
};

/**
 * Retry only on 429, waiting 2-5s between attempts. Anything else is a real
 * failure and is rethrown immediately.
 */
const withRateLimitRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 4
): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (statusOf(error) !== 429 || attempt >= maxAttempts - 1) throw error;
      await sleep(2000 + Math.floor(Math.random() * 3000));
    }
  }
};

const abortIfCancelled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
};

const asNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

/** Rows out of a paginated response, whichever envelope the backend used. */
const pickRows = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response;
  if (!isJsonObject(response)) return [];
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data)) return response.data;
  return [];
};

/** Item count off a paginated response's `meta`, when the backend sends one. */
const readTotal = (response: unknown): number | null => {
  if (!isJsonObject(response) || !isJsonObject(response.meta)) return null;
  const { totalItems, total } = response.meta;
  if (typeof totalItems === "number" && Number.isFinite(totalItems)) {
    return totalItems;
  }
  if (typeof total === "number" && Number.isFinite(total)) return total;
  return null;
};

/** Percent, or null when the denominator is 0 - never a fabricated 0%. */
const ratePercent = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? (numerator / denominator) * 100 : null;

/* ------------------------------------------------------------------ */
/* Automations                                                         */
/* ------------------------------------------------------------------ */

const AUTOMATION_PAGE_SIZE = 100;
const AUTOMATION_MAX_PAGES = 20;

export interface AutomationReportRow {
  id: string;
  name: string;
  status: string;
  /** Contacts enrolled into this automation. */
  captured: number;
  /** Double-opt-in confirmation emails sent (pending captures). */
  optInEmailsSent: number;
  /** Enrolments that reached the end of the flow, as a percentage. */
  completionRate: number;
  delivered: number;
  opened: number;
  clicked: number;
  openRate: number | null;
  clickRate: number | null;
  /** False when `/stats/messages` failed for this automation - the row then
   *  reads "—" rather than a misleading zero. */
  statsAvailable: boolean;
}

export interface AutomationReportTotals {
  captured: number;
  delivered: number;
  opened: number;
  clicked: number;
  openRate: number | null;
  clickRate: number | null;
  /**
   * Literal sum of each automation's own rate. The headline rate is the
   * denominator-weighted one (opened ÷ delivered) because adding percentages is
   * not a rate - but the raw sum is what "sum across all automations" asks for,
   * so it is reported alongside rather than instead.
   */
  openRateSum: number;
  clickRateSum: number;
  completionRate: number;
  activeCount: number;
  totalCount: number;
  runningPercent: number | null;
  entriesLast30d: number;
  optInEmailsSent: number;
}

export interface AutomationReport {
  rows: AutomationReportRow[];
  totals: AutomationReportTotals;
  /** True when the org has more automations than we page through. */
  automationsTruncated: boolean;
}

const toAutomationRow = (
  input: unknown
): {
  id: string;
  name: string;
  status: string;
  captured: number;
  optInEmailsSent: number;
  completionRate: number;
} | null => {
  if (!isJsonObject(input)) return null;
  const id = asString(input.id) || asString(input.automationId);
  if (!id) return null;
  return {
    id,
    name: asString(input.name) || "Untitled automation",
    status: asString(input.status) || "draft",
    captured: asNumber(input.entries ?? input.entryCount),
    optInEmailsSent: asNumber(input.optInEmailsSent),
    completionRate: asNumber(input.completionRate),
  };
};

/** Every automation in the org, paged sequentially (up to `MAX_PAGES`). */
async function fetchAllAutomations(signal?: AbortSignal) {
  const items: NonNullable<ReturnType<typeof toAutomationRow>>[] = [];
  let truncated = false;

  for (let page = 1; page <= AUTOMATION_MAX_PAGES; page += 1) {
    abortIfCancelled(signal);
    const response = await withRateLimitRetry(() =>
      automationService.listAutomations({
        page,
        limit: AUTOMATION_PAGE_SIZE,
      })
    );
    const batch = pickRows(response)
      .map(toAutomationRow)
      .filter((row): row is NonNullable<typeof row> => row !== null);
    const total = readTotal(response);
    items.push(...batch);

    if (batch.length < AUTOMATION_PAGE_SIZE) break;
    if (total !== null && items.length >= total) break;
    if (page === AUTOMATION_MAX_PAGES) truncated = true;
  }

  return { items, truncated };
}

/** Delivered/opened/clicked for one automation, summed across its nodes. */
async function fetchMessageTotals(
  automationId: string,
  signal?: AbortSignal
): Promise<{
  delivered: number;
  opened: number;
  clicked: number;
  available: boolean;
}> {
  abortIfCancelled(signal);
  try {
    const response = await withRateLimitRetry(() =>
      automationService.getMessageStats(automationId, undefined, { signal })
    );
    const messages = Array.isArray(response?.messages) ? response.messages : [];
    const totals = messages.reduce(
      (acc, message) => {
        if (!isJsonObject(message)) return acc;
        return {
          delivered: acc.delivered + asNumber(message.delivered),
          opened: acc.opened + asNumber(message.opened),
          clicked: acc.clicked + asNumber(message.clicked),
        };
      },
      { delivered: 0, opened: 0, clicked: 0 }
    );
    return { ...totals, available: true };
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") throw error;
    // One automation without stats must not blank the whole report.
    return { delivered: 0, opened: 0, clicked: 0, available: false };
  }
}

/**
 * The whole report. `onProgress` reports per-automation fetch progress so the
 * page can show how far along a slow org-wide fan-out is.
 */
export async function buildAutomationReport(options?: {
  signal?: AbortSignal;
  onProgress?: (progress: { current: number; total: number }) => void;
}): Promise<AutomationReport> {
  const { signal, onProgress } = options ?? {};

  const metrics = await withRateLimitRetry(() =>
    automationService.getMetrics()
  ).catch(() => null);

  const { items, truncated } = await fetchAllAutomations(signal);

  const rows: AutomationReportRow[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    onProgress?.({ current: index + 1, total: items.length });
    const messageTotals = await fetchMessageTotals(item.id, signal);
    rows.push({
      ...item,
      delivered: messageTotals.delivered,
      opened: messageTotals.opened,
      clicked: messageTotals.clicked,
      openRate: ratePercent(messageTotals.opened, messageTotals.delivered),
      clickRate: ratePercent(messageTotals.clicked, messageTotals.delivered),
      statsAvailable: messageTotals.available,
    });
  }

  const sum = (pick: (row: AutomationReportRow) => number) =>
    rows.reduce((acc, row) => acc + pick(row), 0);
  // Automations that never delivered report `null`, not 0 - they contribute
  // nothing to the sum either way, but this keeps that explicit.
  const sumRates = (pick: (row: AutomationReportRow) => number | null) =>
    rows.reduce((acc, row) => acc + (pick(row) ?? 0), 0);

  const captured = sum((row) => row.captured);
  const delivered = sum((row) => row.delivered);
  const opened = sum((row) => row.opened);
  const clicked = sum((row) => row.clicked);
  const activeCount = rows.filter((row) => row.status === "active").length;

  return {
    rows,
    automationsTruncated: truncated,
    totals: {
      captured,
      delivered,
      opened,
      clicked,
      openRate: ratePercent(opened, delivered),
      clickRate: ratePercent(clicked, delivered),
      openRateSum: sumRates((row) => row.openRate),
      clickRateSum: sumRates((row) => row.clickRate),
      // Prefer the backend's own org-wide figure; it is computed over every
      // enrolment rather than only the automations on this page.
      completionRate:
        metrics && Number.isFinite(metrics.completionRate)
          ? metrics.completionRate
          : 0,
      activeCount,
      totalCount: rows.length,
      runningPercent: ratePercent(activeCount, rows.length),
      entriesLast30d: metrics ? asNumber(metrics.entries) : 0,
      optInEmailsSent: metrics ? asNumber(metrics.optInEmailsSent) : 0,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Server-side aggregates (replace the old client-side scans)          */
/* ------------------------------------------------------------------ */

export type { AutomationTimeSeriesPoint, EmailDomainSummary };

/**
 * Org-wide daily enrolments + email engagement for the trend chart. One request
 * to `/automations/metrics/time-series`, zero-filled server-side - no per-
 * automation fan-out.
 */
export async function fetchAutomationTimeSeries(
  period: AutomationTimeSeriesPeriod,
  options?: { signal?: AbortSignal }
): Promise<AutomationTimeSeriesPoint[]> {
  const res = await automationService.getMetricsTimeSeries(period, {
    signal: options?.signal,
  });
  return Array.isArray(res?.series) ? res.series : [];
}

/**
 * Company-vs-consumer email domain counts. One grouped query server-side,
 * replacing the old scan that paged up to 10,000 contacts into the browser.
 */
export async function fetchEmailDomainSummary(options?: {
  signal?: AbortSignal;
}): Promise<EmailDomainSummary> {
  return audienceService.getEmailDomainSummary({ signal: options?.signal });
}
