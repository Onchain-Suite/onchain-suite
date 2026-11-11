import { isJsonObject } from "@/lib/utils";

import type { MigrationHeld } from "../contracts/connections";
import type { ConnectorRunState, ConnectorRunStatus } from "../contracts/runs";

/*
 * Pure reading of a background run: coercing the wire shape, and turning the
 * connector's own totals into the few numbers the UI shows.
 */

const STATES: ConnectorRunState[] = [
  "idle",
  "queued",
  "running",
  "completed",
  "stopped",
  "failed",
];

const num = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;

const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v ? v : null;

/** A run the server did not describe reads as "none yet", never as a crash. */
export function toRunStatus(
  raw: unknown,
  connector: string
): ConnectorRunStatus {
  const o = isJsonObject(raw) ? raw : {};
  const state = STATES.includes(o.state as ConnectorRunState)
    ? (o.state as ConnectorRunState)
    : "idle";
  return {
    connector: strOrNull(o.connector) ?? connector,
    state,
    totals: isJsonObject(o.totals) ? o.totals : {},
    slices: num(o.slices),
    resumable: o.resumable === true,
    incomplete: o.incomplete === true,
    stopping: o.stopping === true,
    error: strOrNull(o.error),
    startedAt: strOrNull(o.startedAt),
    finishedAt: strOrNull(o.finishedAt),
  };
}

/** Still going on the server: keep polling, offer Stop. */
export const isRunLive = (run: ConnectorRunStatus | null | undefined) =>
  run?.state === "queued" || run?.state === "running";

/** The four states the progress panel knows, from the server's six. */
export type RunPanelStatus = "idle" | "running" | "done" | "stopped" | "error";

export function runPanelStatus(
  run: ConnectorRunStatus | null | undefined
): RunPanelStatus {
  switch (run?.state) {
    case "queued":
    case "running":
      return "running";
    case "completed":
      return "done";
    case "stopped":
      return "stopped";
    case "failed":
      return "error";
    default:
      return "idle";
  }
}

/** What the start button does next, in the words on it. */
export function runStartLabel(
  run: ConnectorRunStatus | null | undefined,
  verbs: { start: string; again: string }
): string {
  if (!run || run.state === "idle") return verbs.start;
  if (run.resumable) return "Continue";
  return verbs.again;
}

const held = (v: unknown): MigrationHeld => {
  const o = isJsonObject(v) ? v : {};
  return {
    unsubscribed: num(o.unsubscribed),
    unconfirmed: num(o.unconfirmed),
    invalid: num(o.invalid),
    unreachable: num(o.unreachable),
  };
};

const notices = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** A migration's totals, whatever the connector left out. */
export function migrationTotals(totals: Record<string, unknown>) {
  return {
    scanned: num(totals.scanned),
    created: num(totals.created),
    alreadyMigrated: num(totals.alreadyMigrated),
    held: held(totals.held),
    skipped: num(totals.skipped),
    ...(typeof totals.listName === "string" && totals.listName
      ? { listName: totals.listName }
      : {}),
    warnings: notices(totals.warnings),
  };
}

/**
 * A sync's totals. Sources count what they read under different names (an
 * identity sync `scanned` users, Dune and Sheets `rows`, an RPC read
 * `wallets`), so "read" takes whichever the connector reported.
 */
export function syncTotals(totals: Record<string, unknown>) {
  return {
    read: num(totals.scanned) || num(totals.rows) || num(totals.wallets),
    created: num(totals.created),
    alreadySynced: num(totals.alreadySynced),
    skipped: num(totals.skipped),
    truncated: totals.truncatedAtCap === true || totals.truncated === true,
    warnings: notices(totals.warnings),
  };
}
