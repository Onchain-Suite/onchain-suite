import type {
  ConnectionCredentials,
  ConnectionSummary,
  IdentitySyncResult,
  MigrationResult,
} from "../contracts/connections";
import type { ConnectorDef, MigrationPaging } from "../types/connectors";

/*
 * Pure rules for connecting and running connectors: what state a connection
 * is in, what the form sends, and how a paged migration or sync continues.
 */

/** Connected and working, saved but rejected by the provider, or absent. */
export type ConnectionState = "connected" | "broken" | "none";

export function connectionState(
  c: ConnectionSummary | null | undefined
): ConnectionState {
  if (!c) return "none";
  return c.verified ? "connected" : "broken";
}

/** The name the provider gave the account, e.g. "@mybot" or the app name. */
export function connectionLabel(
  c: ConnectionSummary | null | undefined
): string | null {
  if (!c) return null;
  const { label, botUsername, username, appName, verifiedName } = c.config;
  const pick = [label, appName, verifiedName, botUsername, username].find(
    (v): v is string => typeof v === "string" && v.length > 0
  );
  return pick ?? null;
}

export const findConnection = (
  list: ConnectionSummary[] | undefined,
  connector: string
): ConnectionSummary | null =>
  list?.find((c) => c.connector === connector) ?? null;

/** Required fields the person has left blank, by label. */
export function missingFields(
  def: ConnectorDef,
  values: Record<string, string>
): string[] {
  return def.fields
    .filter((f) => f.required && !(values[f.key] ?? "").trim())
    .map((f) => f.label);
}

/**
 * The `PUT` body: trimmed values for the connector's own fields only, with
 * blank optional fields left out (the backend stores the body as given, so a
 * stray key or an empty string would be saved too).
 */
export function toCredentials(
  def: ConnectorDef,
  values: Record<string, string>
): ConnectionCredentials {
  const out: ConnectionCredentials = {};
  for (const f of def.fields) {
    const v = (values[f.key] ?? "").trim();
    if (v) out[f.key] = v;
  }
  return out;
}

/** The body for the next migration slice, or null when there is none. */
export function nextMigrationBody(
  paging: MigrationPaging,
  prev: MigrationResult | null
): Record<string, unknown> | null {
  if (!prev) return {};
  if (!prev.hasMore) return null;
  if (paging === "rerun") return {};
  if (paging === "page") {
    return typeof prev.nextPage === "number"
      ? { startPage: prev.nextPage }
      : null;
  }
  return prev.nextCursor ? { cursor: prev.nextCursor } : null;
}

/** The body for the next identity-sync slice, or null when done. */
export function nextSyncBody(
  prev: IdentitySyncResult | null
): Record<string, unknown> | null {
  if (!prev) return {};
  return prev.hasMore && prev.nextCursor ? { cursor: prev.nextCursor } : null;
}

/**
 * A slice that read nothing new while still claiming more would loop forever
 * on a re-run migration, so the runner stops on it.
 */
export const madeProgress = (r: { scanned: number; pages: number }) =>
  r.scanned > 0 || r.pages > 0;

export const EMPTY_MIGRATION: MigrationResult = {
  scanned: 0,
  created: 0,
  alreadyMigrated: 0,
  held: { unsubscribed: 0, unconfirmed: 0, invalid: 0, unreachable: 0 },
  skipped: 0,
  pages: 0,
  hasMore: false,
  warnings: [],
};

/** Running totals across slices. Paging fields come from the latest slice. */
export function mergeMigration(
  acc: MigrationResult,
  r: MigrationResult
): MigrationResult {
  return {
    ...r,
    scanned: acc.scanned + r.scanned,
    created: acc.created + r.created,
    alreadyMigrated: acc.alreadyMigrated + r.alreadyMigrated,
    skipped: acc.skipped + r.skipped,
    pages: acc.pages + r.pages,
    held: {
      unsubscribed: acc.held.unsubscribed + r.held.unsubscribed,
      unconfirmed: acc.held.unconfirmed + r.held.unconfirmed,
      invalid: acc.held.invalid + r.held.invalid,
      unreachable: acc.held.unreachable + r.held.unreachable,
    },
    listName: r.listName ?? acc.listName,
    warnings: [...new Set([...acc.warnings, ...r.warnings])],
  };
}

export const EMPTY_SYNC: IdentitySyncResult = {
  scanned: 0,
  created: 0,
  alreadySynced: 0,
  skipped: 0,
  pages: 0,
  hasMore: false,
  nextCursor: null,
  warnings: [],
};

export function mergeSync(
  acc: IdentitySyncResult,
  r: IdentitySyncResult
): IdentitySyncResult {
  return {
    ...r,
    scanned: acc.scanned + r.scanned,
    created: acc.created + r.created,
    alreadySynced: acc.alreadySynced + r.alreadySynced,
    skipped: acc.skipped + r.skipped,
    pages: acc.pages + r.pages,
    truncatedAtCap: acc.truncatedAtCap === true || r.truncatedAtCap === true,
    warnings: [...new Set([...(acc.warnings ?? []), ...(r.warnings ?? [])])],
  };
}

export const heldTotal = (h: MigrationResult["held"]) =>
  h.unsubscribed + h.unconfirmed + h.invalid + h.unreachable;

/** What the OAuth callback's redirect params mean, for a toast. */
export function oauthReturnMessage(params: {
  connected?: string | null;
  error?: string | null;
  connector?: string | null;
  label?: (id: string) => string;
}): { kind: "success" | "error"; message: string } | null {
  const name = (id?: string | null) =>
    id ? (params.label?.(id) ?? id) : "the tool";
  if (params.connected) {
    return { kind: "success", message: `${name(params.connected)} connected` };
  }
  if (!params.error) return null;
  const message =
    params.error === "invalid_state"
      ? "That sign-in link expired. Start connecting again."
      : params.error === "missing_code"
        ? "The approval didn't come back. Start connecting again."
        : params.error === "connect_failed"
          ? `Couldn't save the ${name(params.connector)} connection. Try again.`
          : `Couldn't connect: ${params.error}`;
  return { kind: "error", message };
}
