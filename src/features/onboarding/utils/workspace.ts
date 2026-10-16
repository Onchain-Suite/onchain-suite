/**
 * Workspace mode: the single "empty vs live" signal the whole app branches on
 * for the first-mile (v2.7 onboarding migration, step 1).
 *
 * Ported in spirit from the v2.7 reference `data/workspace.ts`, but FE-first and
 * honest: the reference kept a persisted demo toggle and a simulated index
 * timer. Here the mode is DERIVED from real reads the app already makes, so it
 * tells the truth about the account rather than replaying a demo.
 *
 * "empty"  = the stretch between an account existing and the first data arriving:
 *            no contract tracked yet AND zero contacts. There is nothing to act
 *            on, so surfaces should teach ("Start here: index your contract")
 *            instead of showing empty tables.
 * "live"   = anything after: a contract is tracked, or contacts exist (imported,
 *            form signups, a sync in flight). The product has something to show.
 *
 * Pure and server-safe: no React, no network, no browser APIs. The reads live in
 * `hooks/use-workspace-mode.ts`; this module only decides the mode from signals,
 * so the decision is unit-testable without rendering.
 */

export type WorkspaceMode = "empty" | "live";

/**
 * The real-account signals the mode is derived from. Both come from reads the
 * dashboard setup checklist already makes:
 * - `hasTrackedContract`: project settings carry at least one contract address.
 * - `contactCount`: audience overview `total` (imports, signups, synced holders).
 */
export interface WorkspaceSignals {
  /** At least one contract address is tracked for the org. */
  hasTrackedContract: boolean;
  /** Total contacts in the audience (0 when nothing has arrived yet). */
  contactCount: number;
}

/**
 * Decide the workspace mode from account signals.
 *
 * Empty only when BOTH levers are at zero: nothing tracked and no contacts. A
 * single contact or a single tracked contract is enough to be "live", because at
 * that point there is real data (or data on its way) to render rather than teach
 * around.
 */
export function deriveWorkspaceMode(signals: WorkspaceSignals): WorkspaceMode {
  const { hasTrackedContract, contactCount } = signals;
  if (!hasTrackedContract && contactCount <= 0) return "empty";
  return "live";
}

/** Convenience predicate: is this workspace still empty (first-mile not begun)? */
export function isEmptyWorkspace(signals: WorkspaceSignals): boolean {
  return deriveWorkspaceMode(signals) === "empty";
}
