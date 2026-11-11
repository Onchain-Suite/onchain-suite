/**
 * Background connector runs: `/organization/integrations/runs/:connector`
 * (onchain-backend `integrations/API.md`, 2026-11-11).
 *
 * A migration or sync used to be looped from the browser, one slice per
 * request. The loop now lives on the server's worker: start a run, poll it,
 * stop it. The same shape answers all three calls.
 */

/** `idle` means the server has no run on record for this connector. */
export type ConnectorRunState =
  "idle" | "queued" | "running" | "completed" | "stopped" | "failed";

export interface ConnectorRunStatus {
  connector: string;
  state: ConnectorRunState;
  /**
   * The connector's own counts, summed over every slice so far. The keys are
   * that connector's: a migration has `alreadyMigrated` and `held`, a sync has
   * `alreadySynced`, Dune and Sheets count `rows`. Read through `utils/runs`.
   */
  totals: Record<string, unknown>;
  slices: number;
  /** A stopped or failed run kept its place: starting again continues it. */
  resumable: boolean;
  /** Finished, but the source had more and gave no way to continue. */
  incomplete: boolean;
  /** Stop was asked for; the run ends after the batch it is on. */
  stopping: boolean;
  /** One line, set when `state` is `failed`. */
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

/**
 * Export migrations (Braze, Customer.io, Iterable) run as one background
 * export: `POST .../<connector>/migrate` then `GET .../migrate/:jobId`.
 * Starting while one is running returns that one.
 */
export interface ExportJob {
  jobId: string;
  status: "queued";
  listName: string;
}
