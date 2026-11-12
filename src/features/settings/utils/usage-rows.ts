/**
 * The usage meters on the billing page.
 *
 * The block used to be built from the older, user-level `GET /billing/usage`,
 * read by field names that endpoint does not send, and then filtered to rows
 * with something in them. For a workspace on a card subscription that left
 * nothing: "No usage metrics for this billing period yet", next to a plan with
 * 7,500 contacts in it.
 *
 * The workspace's real meters come with `GET /billing/plan-usage/:org`, which
 * the page already loads for the plan and price. Those are used when present;
 * the older endpoint is only what is left when no workspace is selected or the
 * meters could not be read.
 */

export interface UsageRow {
  key: string;
  label: string;
  used: number;
  /** Below zero: the plan does not cap it. Null: no limit is known. */
  limit: number | null;
}

export type UsageBlockState = "loading" | "rows" | "free" | "error" | "empty";

/** Meters in the order the page lists them, with the name each one is shown by. */
const METERS: ReadonlyArray<readonly [key: string, label: string]> = [
  ["contacts", "Contacts"],
  ["trackedWallets", "Tracked wallets"],
  ["emailsPerMonth", "Emails this month"],
  ["inAppPushesPerMonth", "In-app pushes this month"],
  ["aiCredits", "AI credits"],
  ["goldrushCredits", "Enrichment & on-chain"],
  ["seats", "Seats"],
  ["automations", "Loops"],
  ["apiKeys", "API keys"],
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A finite number, from a number or a numeric string. Null for anything else. */
const numberOf = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const firstNumber = (...values: unknown[]): number => {
  for (const value of values) {
    const n = numberOf(value);
    if (n !== null) return n;
  }
  return 0;
};

/**
 * A meter is worth a row when the plan gives some of it, or does not cap it, or
 * some has been used. A limit of zero with nothing used is a thing this plan
 * does not include, and a bar reading "0 / 0" says nothing.
 */
const worthShowing = (used: number, limit: number | null) =>
  used > 0 || (limit !== null && limit !== 0);

/** Rows from the workspace's plan-usage meters. Empty for anything else. */
export function usageRowsFromMeters(meters: unknown): UsageRow[] {
  if (!isRecord(meters)) return [];
  const rows: UsageRow[] = [];
  for (const [key, label] of METERS) {
    const meter = meters[key];
    if (!isRecord(meter)) continue;
    const used = numberOf(meter.used);
    const limit = numberOf(meter.limit);
    if (used === null || limit === null) continue;
    const row = { key, label, used: Math.max(0, used), limit };
    if (worthShowing(row.used, row.limit)) rows.push(row);
  }
  return rows;
}

/**
 * Rows from the older `GET /billing/usage` (and the usage summary on
 * `GET /billing`). The limits have gone by two sets of names, so both are read.
 */
export function legacyUsageRows(
  usage: unknown,
  overviewUsage?: unknown
): UsageRow[] {
  const root = isRecord(usage) ? usage : {};
  const summary = isRecord(overviewUsage) ? overviewUsage : {};

  if (Array.isArray(root.items)) {
    const seen = new Set<string>();
    return root.items
      .map((item, index): UsageRow => {
        const obj = isRecord(item) ? item : {};
        const name = [obj.key, obj.label].find(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        );
        const label = name?.trim() ?? "Usage";
        const key = seen.has(label) ? `${label}-${String(index)}` : label;
        seen.add(label);
        return {
          key,
          label,
          used: Math.max(0, firstNumber(obj.used)),
          limit: obj.limit === undefined ? null : firstNumber(obj.limit),
        };
      })
      .filter((row) => worthShowing(row.used, row.limit));
  }

  const rootLimits = isRecord(root.limits) ? root.limits : {};
  const summaryLimits = isRecord(summary.limits) ? summary.limits : {};
  const row = (
    label: string,
    usedKey: string,
    limitKeys: readonly string[]
  ): UsageRow => ({
    key: usedKey,
    label,
    used: Math.max(0, firstNumber(root[usedKey], summary[usedKey])),
    limit: firstNumber(
      ...limitKeys.map((k) => rootLimits[k]),
      ...limitKeys.map((k) => summaryLimits[k])
    ),
  });

  return [
    row("Emails sent", "emailsSent", ["emailLimit", "emailsSent"]),
    row("Contacts", "contacts", ["contactLimit", "contacts"]),
    row("On-chain sends", "onChainSends", ["onChainLimit", "onChainSends"]),
  ].filter((r) => worthShowing(r.used, r.limit));
}

/** The workspace's meters when there are any, the older figures otherwise. */
export function usageRows(sources: {
  meters?: unknown;
  usage?: unknown;
  overviewUsage?: unknown;
}): UsageRow[] {
  const fromMeters = usageRowsFromMeters(sources.meters);
  return fromMeters.length > 0
    ? fromMeters
    : legacyUsageRows(sources.usage, sources.overviewUsage);
}

/**
 * What the usage block shows. Rows win over everything but loading: a failure
 * of the older endpoint is no reason to hide meters that did load.
 */
export function usageBlockState(input: {
  loading: boolean;
  rows: readonly UsageRow[];
  /** The legacy "billing is not available" answer, shown as the Free plan. */
  freeFallback: boolean;
  failed: boolean;
}): UsageBlockState {
  if (input.loading) return "loading";
  if (input.rows.length > 0) return "rows";
  if (input.freeFallback) return "free";
  if (input.failed) return "error";
  return "empty";
}
